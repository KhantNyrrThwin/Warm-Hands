"""Build 3D-avatar clips from the recorded MSL samples.

    .venv\\Scripts\\python.exe tools\\avatar\\build_clips.py            # every recorded sign
    .venv\\Scripts\\python.exe tools\\avatar\\build_clips.py fever cough

For each sign it reads every take in data/msl77/raw/<signer>/<sign>/, picks the
most typical take (DTW medoid), time-aligns the other takes to it and averages
them, then retargets the averaged hands onto the Warm Hands character:

  * position  - a thin-plate warp anchored on face and torso landmarks, because
                the character's head and arms have cartoon proportions;
  * depth     - a location prior (contact on face / chest / lower torso, signing
                space elsewhere) plus the avatar's real body surface, so hands
                touch where the signer touched and never sink into the body;
  * hand      - wrist orientation, finger bends and spread taken straight from
                the 21 MediaPipe hand landmarks; thumb fitted from a table
                measured on the rig (tools/avatar/calibrate.mjs).

It writes src/animation/clips/<sign>.ts and src/animation/clips/recorded.generated.ts.
Hand-authored clips listed in HAND_AUTHORED are never overwritten.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from landmarks import FINGERS, PALM, ELB_L, ELB_R, SHO_L, SHO_R, Take, takes_for  # noqa: E402
from msl77_signs import SIGN_BY_ID, SIGN_IDS  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CLIPS = ROOT / "src" / "animation" / "clips"
CAL = json.loads((Path(__file__).resolve().parent / "calibration.json").read_text(encoding="utf-8"))
SIGNER = "pmt"
FPS = 20.0
MAX_GAP = 0.9   # seconds a hand may be lost (motion blur) and still be bridged
# The words to animate: Sheet1, column B of this workbook.
WORD_LIST = ROOT.parent / "3D model To Train" / "MSL for Warm Hands.xlsx"


def sheet_words(path: Path = WORD_LIST) -> list[str]:
    """Column B of Sheet1, top to bottom (read without openpyxl)."""
    import re
    import zipfile
    import xml.etree.ElementTree as ET
    m = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    with zipfile.ZipFile(path) as z:
        shared = [''.join(t.text or '' for t in si.iter(m + "t"))
                  for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(m + "si")]
        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    cells = []
    for c in sheet.iter(m + "c"):
        ref, v = c.get("r"), c.find(m + "v")
        if v is None or not re.fullmatch(r"B\d+", ref):
            continue
        cells.append((int(ref[1:]), shared[int(v.text)] if c.get("t") == "s" else v.text))
    return [w.strip() for _, w in sorted(cells)]


# Spreadsheet words that are not in the recorder's sign list (no recordings) but have a
# hand-made clip in src/animation/clips/<id>.ts (made from a reference picture).
HAND_MADE_WORDS = {
    "how_are_you": {"my": "နေကောင်းလား", "en": "How are you?"},
    "birth": {"my": "မွေး", "en": "Birth"},
}
SIGN_INFO = {**{s: SIGN_BY_ID[s] for s in SIGN_IDS}, **HAND_MADE_WORDS}


def sheet_sign_ids() -> tuple[list[str], list[str]]:
    """Sign ids for the spreadsheet's words, and the words that have no sign id."""
    by_my = {SIGN_BY_ID[s]["my"]: s for s in SIGN_IDS}
    by_my.update({v["my"]: k for k, v in HAND_MADE_WORDS.items()})
    ids, unknown = [], []
    for w in sheet_words():
        w = w.replace(" (go)", "")
        sid = by_my.get(w) or by_my.get(f"{w} (go)")
        (ids if sid else unknown).append(sid or w)
    return ids, unknown

# Dataset ids whose clip is already hand-authored (book pages / video); keep those.
HAND_AUTHORED = {"i", "mingalarbar", "headache", "how", "drink", "eat", "finished", "medicine", "minute", "stomach_ache"}

A = {k: np.array(v, float) for k, v in CAL["anchors"].items()}
HAND = CAL["hand"]
M0 = np.array([HAND["M0"]["x"], HAND["M0"]["y"], HAND["M0"]["z"]]).T   # columns = rig frame for basis I
THUMB = CAL["thumb"]
THUMB_TIP = np.array([t["tip"] for t in THUMB])
THUMB_IP = np.array([t["ip"] for t in THUMB])
GRID = CAL["grid"]
FRONT = np.array([[np.nan if v is None else v for v in row] for row in CAL["front"]], float)


# ----------------------------------------------------------------------------- body surface
def _fill_front():
    f = FRONT.copy()
    # close small holes, then extend each row outward with the body's side depth
    for _ in range(3):
        g = f.copy()
        for i in range(1, f.shape[0] - 1):
            for j in range(1, f.shape[1] - 1):
                if np.isnan(f[i, j]):
                    nb = f[i - 1:i + 2, j - 1:j + 2]
                    if np.sum(~np.isnan(nb)) >= 5:
                        g[i, j] = np.nanmax(nb)
        f = g
    return f


SURF = _fill_front()


def surface(x: float, y: float) -> float:
    """Front-most z of the body at (x, y); -inf outside the silhouette."""
    i = (y - GRID["y0"]) / GRID["step"]
    j = (x - GRID["x0"]) / GRID["step"]
    i0, j0 = int(np.floor(i)), int(np.floor(j))
    vals = []
    for di in (0, 1):
        for dj in (0, 1):
            ii, jj = i0 + di, j0 + dj
            if 0 <= ii < SURF.shape[0] and 0 <= jj < SURF.shape[1] and not np.isnan(SURF[ii, jj]):
                vals.append(SURF[ii, jj])
    return max(vals) if vals else -np.inf


# ----------------------------------------------------------------------------- 2D warp
def _tps_fit(src: np.ndarray, dst: np.ndarray):
    n = len(src)
    d = np.linalg.norm(src[:, None] - src[None], axis=-1)
    K = np.where(d > 0, d * d * np.log(d + 1e-12), 0.0)
    P = np.hstack([np.ones((n, 1)), src])
    L = np.zeros((n + 3, n + 3))
    L[:n, :n] = K + np.eye(n) * 1e-4
    L[:n, n:] = P
    L[n:, :n] = P.T
    rhs = np.zeros((n + 3, 2))
    rhs[:n] = dst
    sol = np.linalg.solve(L, rhs)
    return src, sol


def _tps_apply(model, pts: np.ndarray) -> np.ndarray:
    src, sol = model
    pts = np.atleast_2d(pts)
    d = np.linalg.norm(pts[:, None] - src[None], axis=-1)
    K = np.where(d > 0, d * d * np.log(d + 1e-12), 0.0)
    n = len(src)
    return K @ sol[:n] + sol[n] + pts @ sol[n + 1:]


def build_warp(face: dict):
    """Human (u, v) in shoulder widths -> avatar (x, y)."""
    nose, mouth = face["nose"], face["mouth"]
    eyes = (face["eyeL"] + face["eyeR"]) / 2
    nm = max(nose[1] - mouth[1], 0.06)
    chin = mouth - np.array([0, 1.5 * nm])
    brow = eyes + 0.8 * (eyes - nose)
    top = eyes + 3.2 * (eyes - nose)
    av_chin = np.array([0.0, 4.38])
    pairs = [
        # face (eyeL/earL = the signer's left = viewer's right)
        (nose, A["nose"][:2]), (mouth, A["mouth"][:2]), (chin, av_chin), (brow, A["brow"][:2]),
        (face["eyeR"], A["eyeL"][:2]), (face["eyeL"], A["eyeR"][:2]),
        (face["earR"], A["earL"][:2]), (face["earL"], A["earR"][:2]),
        (top, np.array([0.0, 6.55])),
        # torso
        (np.array([-0.5, 0.0]), A["shoulderL"][:2]), (np.array([0.5, 0.0]), A["shoulderR"][:2]),
        (np.array([0.0, 0.08]), np.array([0.0, 3.98])),
        (np.array([0.0, -0.5]), np.array([0.0, 3.25])),
        (np.array([-0.45, -0.6]), np.array([-0.56, 3.12])), (np.array([0.45, -0.6]), np.array([0.56, 3.12])),
        (np.array([0.0, -1.2]), np.array([0.0, 2.45])),
        (np.array([-0.42, -1.2]), np.array([-0.52, 2.45])), (np.array([0.42, -1.2]), np.array([0.52, 2.45])),
        # signing space around the body
        (np.array([-1.4, 0.0]), np.array([-1.85, 3.85])), (np.array([1.4, 0.0]), np.array([1.85, 3.85])),
        (np.array([-1.4, -1.1]), np.array([-1.75, 2.55])), (np.array([1.4, -1.1]), np.array([1.75, 2.55])),
        (np.array([-1.2, 1.1]), np.array([-1.65, 5.9])), (np.array([1.2, 1.1]), np.array([1.65, 5.9])),
        (np.array([0.0, -2.1]), np.array([0.0, 1.5])),
        (np.array([-1.1, -2.1]), np.array([-1.3, 1.5])), (np.array([1.1, -2.1]), np.array([1.3, 1.5])),
    ]
    src = np.array([p[0] for p in pairs], float)
    dst = np.array([p[1] for p in pairs], float)
    model = _tps_fit(src, dst)
    return lambda pts: _tps_apply(model, pts)


# ----------------------------------------------------------------------------- contact prior
def _sig(x):
    return 1 / (1 + np.exp(-x))


def contact_weight(uv: np.ndarray, face: dict) -> np.ndarray:
    """0..1, how likely a hand point at (u, v) is touching the body (signer frame)."""
    u, v = uv[..., 0], uv[..., 1]
    eyes = (face["eyeL"] + face["eyeR"]) / 2
    fc = (eyes + face["mouth"]) / 2
    ear = abs(face["earL"][0] - face["earR"][0]) / 2
    ru, rv = ear + 0.16, 0.42
    on_face = _sig((1 - ((u - fc[0]) / ru) ** 2 - ((v - fc[1] + 0.05) / rv) ** 2) * 8)
    on_neck = _sig((0.22 - abs(u - fc[0])) * 25) * _sig((v - 0.02) * 25) * _sig((fc[1] - 0.12 - v) * 25)
    on_chest = _sig((0.36 - abs(u)) * 20) * _sig((-0.12 - v) * 20) * _sig((v + 1.6) * 10)
    on_side = _sig((0.62 - abs(u)) * 20) * _sig((-0.78 - v) * 20) * _sig((v + 1.7) * 10)
    return np.clip(np.maximum.reduce([on_face, on_neck, on_chest, on_side]), 0, 1)


GAP_CONTACT = 0.03     # avatar units between a touching point and the surface
GAP_SPACE = 0.62       # palm in front of the body in signing space
MARGIN = 0.05          # never closer than this to the surface


# ----------------------------------------------------------------------------- hand shape
def hand_frame(H: np.ndarray):
    y = H[9] - H[0]
    y /= np.linalg.norm(y)
    x = H[5] - H[17]
    x -= y * (x @ y)
    x /= np.linalg.norm(x)
    z = np.cross(x, y)
    return x, y, z


def rig_fields(H: np.ndarray):
    """Raw `direction` and `palm` for a right hand on bone side L (see calibrate.mjs)."""
    x, y, z = hand_frame(H)
    T = np.stack([x, y, z], 1)
    B = T @ M0.T
    return B[:, 1], B[:, 2]


def finger_shape(H: np.ndarray):
    x, y, z = hand_frame(H)
    knuckle = np.linalg.norm(H[9] - H[0])
    curl, spread = {}, {}
    for name, (a, b, c, d) in FINGERS.items():
        if name == "thumb":
            continue
        v0 = H[a] - H[0]
        v1, v2, v3 = H[b] - H[a], H[c] - H[b], H[d] - H[c]
        m = v0 / np.linalg.norm(v0)
        f1 = np.arctan2(v1 @ z, v1 @ m)
        ang = lambda p, q: np.arccos(np.clip(p @ q / np.linalg.norm(p) / np.linalg.norm(q), -1, 1))
        f2, f3 = ang(v1, v2), ang(v2, v3)
        curl[name] = [float(np.clip(f1, 0, 1.55)), float(np.clip(f2, 0, 1.65)), float(np.clip(f3, 0, 1.2))]
        abd = np.arctan2(v1 @ x, v1 @ y)
        fing = CAL["hand"]["fingers"][name]
        s = (abd - fing["neutralAbduction"]) / fing["spreadGain"]
        s *= np.clip(1.3 - f1, 0, 1)          # abduction is meaningless on a bent finger
        spread[name] = float(np.clip(s, -0.4, 0.45))
    # thumb: nearest rig configuration for the IP joint and tip, in knuckle lengths
    loc = lambda p: np.array([(p - H[0]) @ x, (p - H[0]) @ y, (p - H[0]) @ z]) / knuckle
    tip, ip = loc(H[4]), loc(H[3])
    err = np.linalg.norm(THUMB_TIP - tip, axis=1) + 0.5 * np.linalg.norm(THUMB_IP - ip, axis=1)
    best = np.argsort(err)[:4]
    w = 1 / (err[best] + 0.05)
    pick = lambda k: float(np.sum([THUMB[i][k] * wi for i, wi in zip(best, w)]) / w.sum())
    a, b, o, s = pick("a"), pick("b"), pick("o"), pick("s")
    curl["thumb"] = [a, b, b * 0.7]
    spread["thumb"] = s
    return curl, spread, o


# ----------------------------------------------------------------------------- per-take
def interp_gaps(X: np.ndarray, ok: np.ndarray, t: np.ndarray, max_gap: float = 0.6):
    """Fill missing frames by linear interpolation (only short gaps); returns X, ok."""
    X = X.copy()
    ok = ok.copy()
    idx = np.flatnonzero(ok)
    if len(idx) < 2:
        return X, ok
    for a, b in zip(idx[:-1], idx[1:]):
        if b - a > 1 and t[b] - t[a] <= max_gap:
            for k in range(a + 1, b):
                f = (t[k] - t[a]) / (t[b] - t[a])
                X[k] = X[a] * (1 - f) + X[b] * f
                ok[k] = True
    return X, ok


def _median3(x):
    """3-frame median filter (removes single-frame landmark jumps)."""
    if len(x) < 3:
        return x
    return np.concatenate([x[:1], np.median(np.stack([x[:-2], x[1:-1], x[2:]]), 0), x[-1:]])


def active_window(tk: Take, max_len: float = 4.5):
    """From the dominant hand reaching signing height to shortly after it settles
    into its final pose (the recordings hold the sign until the 5 s window ends)."""
    pr = tk.present["right"]
    H = tk.hands["right"]
    palm_v = np.where(pr, H[:, PALM, 1].mean(1), -9)
    up = pr & (palm_v > -1.25)
    run = np.convolve(up.astype(int), np.ones(3, int), "same") >= 2
    if not run.any():
        return None
    s = int(np.argmax(run))
    feat = np.concatenate([H[:, PALM, :2].mean(1), (H[:, [4, 8, 12, 16, 20], :2] - H[:, :1, :2]).reshape(len(H), -1) * .5], 1)
    feat, ok = interp_gaps(feat, pr, tk.t, max_gap=MAX_GAP)
    # The raised period ends when the hand is seen low (back toward rest) for
    # 0.3 s or more, or is lost for longer than MAX_GAP. A short loss is motion
    # blur while the hand moves between two parts of a sign (e.g. ကချင်).
    low = pr & (palm_v <= -1.25)
    lost = ~pr
    lost_long = np.zeros(len(pr), bool)
    k = 0
    while k < len(pr):
        if lost[k]:
            j = k
            while j < len(pr) and lost[j]:
                j += 1
            if j >= len(pr) or tk.t[min(j, len(pr) - 1)] - tk.t[max(k - 1, 0)] > MAX_GAP:
                lost_long[k:j] = True
            k = j
        else:
            k += 1
    down = low | lost_long
    u = s
    while u < len(run) - 1:
        if down[u + 1]:
            k = u + 1
            while k < len(run) and down[k]:
                k += 1
            if k >= len(run) or tk.t[min(k, len(run) - 1)] - tk.t[u] > 0.3:
                break
            u = k
        else:
            u += 1
    seg = _median3(feat[s:u + 1])
    t = tk.t[s:u + 1]
    if len(seg) < 4:
        return None
    # Held pose: the median of the last 40 % of the raised period.
    held = np.median(seg[t >= t[0] + 0.6 * (t[-1] - t[0])], 0)
    dist = np.linalg.norm(seg - held, axis=1)
    away = np.flatnonzero(dist > 0.18)
    settle = t[away[-1]] if len(away) else t[0]
    end_t = min(t[-1], max(settle + 0.45, t[0] + 1.0), t[0] + max_len)
    e = s + int(np.searchsorted(t, end_t))
    return s, min(e, len(tk.t) - 1)


def take_track(tk: Take):
    w = active_window(tk)
    if w is None:
        return None
    s, e = w
    t = tk.t[s:e + 1] - tk.t[s]
    out = {"t": t}
    for side in ("right", "left"):
        H = tk.hands[side][s:e + 1].reshape(-1, 63)
        ok = tk.present[side][s:e + 1]
        H, ok = interp_gaps(H, ok, t, max_gap=MAX_GAP)
        # carry the first/last seen pose outward so averaging has values
        if ok.any():
            first, last = np.argmax(ok), len(ok) - 1 - np.argmax(ok[::-1])
            H[:first] = H[first]
            H[last + 1:] = H[last]
        out[side] = H.reshape(-1, 21, 3)
        out[side + "_ok"] = ok.astype(float)
    P = tk.pose[s:e + 1]
    out["elbow_right"] = P[:, ELB_R, :2] - P[:, SHO_R, :2]
    out["elbow_left"] = P[:, ELB_L, :2] - P[:, SHO_L, :2]
    # uniform resample
    n = max(int(round(t[-1] * FPS)) + 1, 2)
    tu = np.linspace(0, t[-1], n)
    res = {"t": tu, "face": tk.face}
    for k, v in out.items():
        if k == "t":
            continue
        flat = v.reshape(len(t), -1)
        res[k] = np.stack([np.interp(tu, t, flat[:, j]) for j in range(flat.shape[1])], 1).reshape((n,) + v.shape[1:])
    return res


def dtw(a: np.ndarray, b: np.ndarray):
    n, m = len(a), len(b)
    d = np.linalg.norm(a[:, None] - b[None], axis=-1)
    D = np.full((n + 1, m + 1), np.inf)
    D[0, 0] = 0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i, j] = d[i - 1, j - 1] + min(D[i - 1, j], D[i, j - 1], D[i - 1, j - 1])
    i, j, path = n, m, []
    while i > 0 and j > 0:
        path.append((i - 1, j - 1))
        k = np.argmin([D[i - 1, j - 1], D[i - 1, j], D[i, j - 1]])
        i, j = (i - 1, j - 1) if k == 0 else (i - 1, j) if k == 1 else (i, j - 1)
    return D[n, m] / (n + m), path[::-1]


def dtw_features(tr):
    R, L = tr["right"], tr["left"]
    f = [R[:, PALM, :2].mean(1), (R[:, [4, 8, 12, 16, 20], :2] - R[:, :1, :2]).reshape(len(R), -1) * .5,
         L[:, PALM, :2].mean(1) * tr["left_ok"][:, None] * .7]
    return np.concatenate(f, 1)


def average_sign(sign: str):
    tracks = [tr for tr in (take_track(tk) for tk in takes_for(sign, SIGNER)) if tr is not None]
    if len(tracks) < 3:
        return None, 0
    feats = [dtw_features(tr) for tr in tracks]
    n = len(tracks)
    cost = np.zeros((n, n))
    paths = {}
    for i in range(n):
        for j in range(i + 1, n):
            c, p = dtw(feats[i], feats[j])
            cost[i, j] = cost[j, i] = c
            paths[(i, j)] = p
    med = int(np.argmin(cost.sum(1)))
    keep = [j for j in range(n) if cost[med, j] <= 2.2 * np.median(cost[med][np.arange(n) != med]) or j == med]
    base = tracks[med]
    T = len(base["t"])
    keys = ["right", "left", "right_ok", "left_ok", "elbow_right", "elbow_left"]
    # Gather, for every frame of the medoid, the aligned frames of all kept takes.
    bucket = [[] for _ in range(T)]
    for j in keep:
        if j == med:
            pairs = [(i, i) for i in range(T)]
        else:
            p = paths[(min(med, j), max(med, j))]
            pairs = p if med < j else [(b, a) for a, b in p]
        for i, k in pairs:
            bucket[i].append((j, k))
    # Median, not mean: a hand that MediaPipe lost or mislabelled in one or two
    # takes must not drag the average across the body. Hands only count where seen.
    avg = {k: np.zeros_like(base[k], dtype=float) for k in keys}
    for i in range(T):
        for key in keys:
            vals = [tracks[j][key][k] for j, k in bucket[i]]
            if key in ("right", "left"):
                seen = [tracks[j][key][k] for j, k in bucket[i] if tracks[j][key + "_ok"][k] > 0.5]
                vals = seen or vals
            avg[key][i] = np.median(np.array(vals), 0) if key not in ("right_ok", "left_ok") else np.mean(vals, 0)
    avg["t"] = base["t"]
    faces = [tr["face"] for tr in tracks]
    avg["face"] = {k: np.mean([f[k] for f in faces], 0) for k in faces[0]}
    return avg, len(keep)


# ----------------------------------------------------------------------------- retarget
S_HAND = HAND["length"] / 0.62          # avatar units per shoulder width, for hand offsets
KEY_POINTS = [0, 2, 4, 5, 6, 8, 9, 12, 13, 16, 17, 20]


def mirror_u(H):
    H = H.copy()
    H[..., 0] *= -1
    return H


def mirror_vec(v):
    return [-v[0], v[1], v[2]]


REACH = (HAND["upperArm"] + HAND["forearm"]) * 0.97
HEAD_Y = 4.75                          # contacts above the mouth count as head contacts
NECK_PIVOT = np.array([0.0, 4.1, 0.0])  # where the neck/head lean turns the head
HEAD_CENTRE = np.array([0.0, 5.2, 0.0])
HEAD_GAP = 0.05


def unit(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-9 else v


def lean_head(p, tilt, nod):
    """Where head point p goes when the head tilts sideways (+ = toward +x) and nods (+ = chin down)."""
    q = p - NECK_PIVOT
    c, s = np.cos(tilt), np.sin(tilt)
    q = np.array([q[0] * c + q[1] * s, -q[0] * s + q[1] * c, q[2]])
    c, s = np.cos(nod), np.sin(nod)
    q = np.array([q[0], q[1] * c - q[2] * s, q[1] * s + q[2] * c])
    return q + NECK_PIVOT


def rotation_between(a, b):
    """Smallest rotation turning direction a onto direction b."""
    a, b = unit(a), unit(b)
    v, c = np.cross(a, b), float(a @ b)
    if c < -0.999:
        return -np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)


def push_out(wrist, off):
    """Move the hand forward until no key point is inside the body. The avatar's
    fingers are relatively longer than the scaled human ones, so test 20 % further out."""
    p = wrist + off * 1.2
    surf = np.array([surface(x, y) for x, y in p[:, :2]])
    need = np.where(np.isfinite(surf), surf + MARGIN - p[:, 2], -np.inf).max()
    if need > 0:
        wrist = wrist + [0, 0, need]
    return wrist


def fit_reach(wrist, off, sho):
    """Keep the wrist within reach. The character's arms are short for its big
    head, so out-of-reach targets keep the depth that clears the face/body and
    give up height and sideways distance instead of sliding behind the head."""
    wrist = np.array(wrist, float)
    for _ in range(8):
        wrist = push_out(wrist, off)
        d = wrist - sho
        if np.linalg.norm(d) <= REACH + 1e-4:
            break
        rem = REACH ** 2 - d[2] ** 2
        if rem <= 0.04:
            wrist = sho + d * REACH / np.linalg.norm(d)
            continue
        wrist[:2] = sho[:2] + d[:2] * np.sqrt(rem) / np.linalg.norm(d[:2])
    return wrist


def retarget_hand(H: np.ndarray, warp, face, side: str, elbow_rel: np.ndarray):
    """One hand (21 points, signer frame) -> ArmPose fields for the authored arm."""
    # Work as a right hand on bone side L; the signer's left hand is mirrored in and out.
    Hr = H if side == "right" else mirror_u(H)
    D, Pm = rig_fields(Hr)
    curl, spread, opp = finger_shape(Hr)
    if side == "left":
        D, Pm = np.array(mirror_vec(D)), np.array(mirror_vec(Pm))

    pts = H[KEY_POINTS]
    xy = warp(pts[:, :2])
    cw = contact_weight(pts[:, :2], face)
    off = (pts - H[0]) * S_HAND           # rigid hand offsets from the wrist (u,v,w axes = x,y,z)
    surf = np.array([surface(x, y) for x, y in xy])
    has = np.isfinite(surf)
    surf_eff = np.where(has, surf, 0.25)
    palm_gap = GAP_CONTACT + (GAP_SPACE - GAP_CONTACT) * (1 - cw.max())
    z_target = surf_eff + palm_gap * (1 - cw) + GAP_CONTACT * cw   # continuous, no snapping
    targets = np.column_stack([xy, z_target])
    weight = 1 + 6 * cw ** 2
    weight[KEY_POINTS.index(9)] += 2      # middle knuckle anchors the hand in space
    wrist = np.sum((targets - off) * weight[:, None], 0) / weight.sum()
    sho = A["shoulderL"] if side == "right" else A["shoulderR"]
    head = [0.0, 0.0]
    ci = int(np.argmax(cw)) if cw.max() > 0.3 else KEY_POINTS.index(9)
    contact = targets[ci]
    if contact[1] > HEAD_Y and np.linalg.norm(push_out(wrist, off) - sho) > REACH:
        # A head sign the short arm cannot reach as recorded: the head leans toward
        # the hand, and the hand turns so its fingers/palm make the contact.
        toward = -1 if side == "right" else 1
        hand_len = np.linalg.norm(off[ci])
        short = np.linalg.norm(contact - sho) - (REACH + hand_len)
        head = [float(np.clip(0.14 + 0.45 * short, 0.1, 0.34)), 0.12]
        contact = lean_head(contact, head[0] * toward, head[1])
        contact = contact + HEAD_GAP * unit(contact - HEAD_CENTRE)
        d = contact - sho
        wrist = sho + unit(d) * min(REACH, max(np.linalg.norm(d) - hand_len, 0.4))
        Q = rotation_between(off[ci], contact - wrist)
        D, Pm, off = Q @ D, Q @ Pm, off @ Q.T
        wrist = contact - off[ci]
        if np.linalg.norm(wrist - sho) > REACH:
            wrist = sho + unit(wrist - sho) * REACH
    else:
        wrist = fit_reach(wrist, off, sho)
    # Elbow pole: follow the signer's elbow, but always out and down from the shoulder.
    out_x = -1 if side == "right" else 1
    pole = [sho[0] + out_x * max(abs(elbow_rel[0]) * 1.15, 0.55), sho[1] + min(elbow_rel[1] * 1.15, -0.5), -0.35]
    return {
        "w": wrist, "d": D / np.linalg.norm(D), "p": Pm / np.linalg.norm(Pm), "e": np.array(pole),
        "c": curl, "s": spread, "o": opp, "contact": float(cw.max()), "h": head,
    }


def smooth(x: np.ndarray, k: int = 5):
    if len(x) < k:
        return x
    ker = np.ones(k) / k
    pad = np.concatenate([np.repeat(x[:1], k // 2, 0), x, np.repeat(x[-1:], k // 2, 0)])
    return np.stack([np.convolve(pad[:, j], ker, "valid") for j in range(x.shape[1])], 1)


def arm_vec(a):
    v = [*a["w"], *a["d"], *a["p"], *a["e"], a["o"]]
    for f in ("thumb", "index", "middle", "ring", "pinky"):
        v += a["c"][f]
    v += [a["s"][f] for f in ("thumb", "index", "middle", "ring", "pinky")]
    v += list(a.get("h", [0, 0]))
    return np.array(v, float)


def vec_arm(v):
    c = {f: list(v[13 + 3 * i: 16 + 3 * i]) for i, f in enumerate(("thumb", "index", "middle", "ring", "pinky"))}
    s = {f: v[28 + i] for i, f in enumerate(("thumb", "index", "middle", "ring", "pinky"))}
    return {"w": v[0:3], "d": v[3:6], "p": v[6:9], "e": v[9:12], "o": v[12], "c": c, "s": s, "h": v[33:35]}


def trim_trailing_drop(avg):
    """Cut a final stretch where the dominant hand is already dropping toward rest
    (alignment can carry a few takes' lowering into the end of the average)."""
    pv = avg["right"][:, PALM, :2].mean(1)
    t = avg["t"]
    if len(t) < 8:
        return
    speed = np.r_[0, np.linalg.norm(np.diff(pv, axis=0), axis=1) / np.diff(t)]
    still = np.flatnonzero((speed < 0.6) & (np.r_[speed[1:], 0] < 0.6))
    if not len(still):
        return
    k = still[-1]
    if k < len(t) - 2 and pv[-1, 1] < pv[k, 1] - 0.15 and t[k] > 0.6:
        for key in ("right", "left", "right_ok", "left_ok", "elbow_right", "elbow_left", "t"):
            avg[key] = avg[key][:k + 1]


def build_sign(sign: str):
    avg, used = average_sign(sign)
    if avg is None:
        return None
    trim_trailing_drop(avg)
    face = avg["face"]
    warp = build_warp(face)
    T = len(avg["t"])
    active = {"right": avg["right_ok"] > 0.5, "left": avg["left_ok"] > 0.5}
    # the non-dominant hand only counts when it is clearly up in signing space
    lv = avg["left"][:, PALM, 1].mean(1)
    if (active["left"] & (lv > -1.3)).mean() < 0.35:
        active["left"][:] = False
    else:
        active["left"] &= lv > -1.3
    arms = {}
    for side in ("right", "left"):
        seq = []
        for i in range(T):
            el = avg["elbow_right" if side == "right" else "elbow_left"][i]
            seq.append(arm_vec(retarget_hand(avg[side][i], warp, face, side, el)))
        X = np.array(seq)
        # 5-frame median removes isolated bad frames, then a moving average smooths
        if len(X) >= 5:
            X = np.concatenate([X[:2], np.median(np.stack([X[k:len(X) - 4 + k] for k in range(5)]), 0), X[-2:]])
        X = smooth(X, 5)
        arms[side] = X
    return {"t": avg["t"], "arms": arms, "active": active, "takes": used}


# ----------------------------------------------------------------------------- keyframes + TS
def choose_keys(t, arms, active, every=0.15):
    idx = [0]
    for i in range(1, len(t)):
        if t[i] - t[idx[-1]] >= every - 1e-6:
            idx.append(i)
    if idx[-1] != len(t) - 1:
        idx.append(len(t) - 1)
    # drop keys that linear interpolation already reproduces
    def close(a, b, c, f):
        for side in ("right", "left"):
            if active[side][a] != active[side][b] or active[side][b] != active[side][c]:
                return False
            if not active[side][b]:
                continue
            X = arms[side]
            mid = X[a] * (1 - f) + X[c] * f
            if np.linalg.norm(mid[0:3] - X[b][0:3]) > .03 or np.abs(mid[3:9] - X[b][3:9]).max() > .06 or np.abs(mid[13:] - X[b][13:]).max() > .12:
                return False
        return True
    changed = True
    while changed:
        changed = False
        for k in range(1, len(idx) - 1):
            a, b, c = idx[k - 1], idx[k], idx[k + 1]
            if t[c] - t[a] < 0.5 and close(a, b, c, (t[b] - t[a]) / (t[c] - t[a])):
                idx.pop(k)
                changed = True
                break
    return idx


def ts_name(sign: str) -> str:
    parts = sign.split("_")
    return "".join(p[:1].upper() + p[1:] for p in parts)


def fmt(x):
    s = f"{x:.3f}".rstrip("0").rstrip(".")
    s = "0" if s in ("-0", "") else s
    return s.replace("0.", ".", 1) if s.startswith("0.") else s.replace("-0.", "-.", 1)


def arm_literal(a):
    v = lambda arr: "[" + ", ".join(fmt(x) for x in arr) + "]"
    curl = ", ".join(f"{f}: {v(a['c'][f])}" for f in ("thumb", "index", "middle", "ring", "pinky"))
    spread = ", ".join(f"{f}: {fmt(a['s'][f])}" for f in ("thumb", "index", "middle", "ring", "pinky"))
    return (f"{{ w: {v(a['w'])}, d: {v(a['d'])}, p: {v(a['p'])}, e: {v(a['e'])}, "
            f"c: {{ {curl} }}, s: {{ {spread} }}, o: {fmt(a['o'])}"
            + (f", h: {v(a['h'])}" if max(abs(a['h'][0]), abs(a['h'][1])) > 0.005 else "") + " }")


REST_VEC = {
    # authored arm -> its rest pose as a full vector (wrist, direction, palm, pole, open hand)
    "right": np.array([-1.10, 2.54, 0, -.045, -.27, 0, 0, 0, -1, -1.15, 3.05, .04] + [0] * 23, float),
    "left": np.array([1.10, 2.54, 0, .045, -.27, 0, 0, 0, -1, 1.15, 3.05, .04] + [0] * 23, float),
}
HOLD = 0.35


def travel_time(a, b, lo, hi):
    return float(np.clip(0.35 + 0.3 * np.linalg.norm(a[:3] - b[:3]), lo, hi))


def waypoint(rest, pose, toward=0.55):
    """Part way between rest and the sign, out in front of the body, hand half formed."""
    w = rest * (1 - toward) + pose * toward
    w[2] = max(w[2], pose[2], 0.85)
    w[12:] = pose[12:] * 0.7
    return w


def arm_track(t, X, act, side):
    """Control points [(time, vector | None)] for one arm; None = exact rest."""
    on = np.flatnonzero(act)
    if not len(on):
        return []
    a, b = on[0], on[-1]
    span = X.copy()
    for k in range(a, b + 1):              # bridge short drop-outs inside the span
        if not act[k]:
            prv = on[on < k].max()
            nxt = on[on > k].min()
            f = (t[k] - t[prv]) / (t[nxt] - t[prv])
            span[k] = X[prv] * (1 - f) + X[nxt] * f
    rest = REST_VEC[side]
    t_in = travel_time(rest, span[a], 0.5, 0.95)
    t_out = travel_time(span[b], rest, 0.5, 0.85)
    pts = [(t[a] - t_in, None), (t[a] - t_in * 0.45, waypoint(rest, span[a]))]
    pts += [(t[k], span[k]) for k in range(a, b + 1)]
    pts += [(t[b] + HOLD, span[b]), (t[b] + HOLD + t_out * 0.5, waypoint(rest, span[b], 0.5)),
            (t[b] + HOLD + t_out, None)]
    return pts


def track_at(pts, tau, side):
    """An arm track at time tau: a vector, or None for exact rest."""
    if not pts or tau <= pts[0][0] or tau >= pts[-1][0]:
        return None
    for (t0, v0), (t1, v1) in zip(pts[:-1], pts[1:]):
        if t0 <= tau <= t1:
            v0 = REST_VEC[side] if v0 is None else v0
            v1 = REST_VEC[side] if v1 is None else v1
            f = (tau - t0) / max(t1 - t0, 1e-6)
            return v0 * (1 - f) + v1 * f
    return None


def write_clip(sign: str, built) -> float:
    t, arms, active = built["t"], built["arms"], built["active"]
    tracks = {side: arm_track(t, arms[side], active[side], side) for side in ("right", "left")}
    used = [pts for pts in tracks.values() if pts]
    lead = 0.15 - min(pts[0][0] for pts in used)   # first movement starts after the 0.15 s rest
    duration = round(lead + max(pts[-1][0] for pts in used), 2)
    # key times: the recorded keys plus every arm's own control points
    idx = choose_keys(t, arms, active)
    times = {round(lead + t[i], 3) for i in idx}
    for pts in used:
        # lift waypoint, end-of-sign hold and lowering waypoint (not every recorded frame)
        times |= {round(lead + tp, 3) for tp, _ in pts[1:2] + pts[-3:-1]}
    times = sorted(x for x in times if 0.15 < x < duration - 0.05)
    s = SIGN_BY_ID[sign]
    name = ts_name(sign)
    lines = []
    for tau in times:
        rv, lv = (track_at(tracks[side], tau - lead, side) for side in ("right", "left"))
        L = arm_literal(vec_arm(rv)) if rv is not None else "0"
        R = arm_literal(vec_arm(lv)) if lv is not None else "0"
        lines.append(f"  [{fmt(tau)}, {L}, {R}],")
    body = "\n".join(lines)
    src = f'''/**
 * Animator: generated by tools/avatar/build_clips.py — do not edit by hand;
 *           re-run the script, or copy this file to a new name to hand-polish it.
 * Sign id:  {sign}
 * Myanmar:  {s["my"]}
 * English:  {s["en"]}
 * Source:   {built["takes"]} recorded takes of signer "{SIGNER}" (data/msl77/raw/{SIGNER}/{sign}),
 *           time-aligned (DTW) and averaged, then retargeted onto the character.
 */
import type {{ Object3D }} from 'three'
import {{ mirrorKeys }} from './mirrored'
import {{ createRecordedClip, type RecordedKey }} from './recorded'

export const {sign.upper()}_DURATION = {duration}

// [time, signer's right hand, signer's left hand]; 0 = arm at rest.
const keys: RecordedKey[] = [
{body}
]

export function create{name}Animation(model: Object3D) {{
  // Mirrored: played on the character's right hand (a two-handed sign swaps hands).
  return createRecordedClip(model, mirrorKeys(keys), {sign.upper()}_DURATION)
}}
'''
    target = CLIPS / f"{sign}.ts"
    if target.exists() and "generated by tools/avatar/build_clips.py" not in target.read_text(encoding="utf-8"):
        return None   # hand-written or hand-polished (marker removed): leave it alone
    target.write_text(src, encoding="utf-8")
    return duration


def write_index(built_ids: list[str]):
    imports = "\n".join(f"import {{ {s.upper()}_DURATION, create{ts_name(s)}Animation }} from './{s}'" for s in built_ids)
    ids = ", ".join(f"'{s}'" for s in built_ids)
    lib = "\n".join(f"    {s}: create{ts_name(s)}Animation(model)," for s in built_ids)
    dur = "\n".join(f"  {s}: {s.upper()}_DURATION," for s in built_ids)
    text = "\n".join(f"  {s}: {json.dumps([SIGN_INFO[s]['my'].split(' (')[0], SIGN_INFO[s]['en'].lower(), s.replace('_', ' ')], ensure_ascii=False)}," for s in built_ids)
    label = "\n".join(f"  {s}: {json.dumps(SIGN_INFO[s]['my'].split(' (')[0], ensure_ascii=False)}," for s in built_ids)
    en = "\n".join(f"  {s}: {json.dumps(SIGN_INFO[s]['en'], ensure_ascii=False)}," for s in built_ids)
    src = f'''// Generated by tools/avatar/build_clips.py — do not edit by hand.
// Clips retargeted from the recorded MSL samples (one file per sign).
import type {{ Object3D }} from 'three'
import type {{ SignAnimation }} from '../armPlayback'
{imports}

export const RECORDED_SIGN_IDS = [{ids}] as const
export type RecordedSignId = (typeof RECORDED_SIGN_IDS)[number]

export const RECORDED_DURATIONS: Record<RecordedSignId, number> = {{
{dur}
}}

/** Words typed in the app that play each clip (Myanmar first). */
export const RECORDED_TEXT: Record<RecordedSignId, string[]> = {{
{text}
}}

export const RECORDED_LABELS: Record<RecordedSignId, string> = {{
{label}
}}

export const RECORDED_ENGLISH: Record<RecordedSignId, string> = {{
{en}
}}

export function createRecordedSignLibrary(model: Object3D): Record<RecordedSignId, SignAnimation> {{
  return {{
{lib}
  }}
}}
'''
    (CLIPS / "recorded.generated.ts").write_text(src, encoding="utf-8")


def main(argv):
    if argv:
        wanted = argv
    else:
        ids, unknown = sheet_sign_ids()
        wanted = [s for s in ids if s not in HAND_AUTHORED and s not in HAND_MADE_WORDS]
        print(f"{WORD_LIST.name}: {len(ids) + len(unknown)} words, {len(wanted)} to animate")
        for w in unknown:
            print(f"  not in the recorder's sign list (no recordings): {w}")
    report = {}
    for sign in wanted:
        if sign in HAND_AUTHORED and not argv:
            continue
        built = build_sign(sign)
        if built is None:
            report[sign] = "no recordings"
            print(f"{sign:20s} skipped (no recordings)")
            continue
        dur = write_clip(sign, built)
        if dur is None:
            report[sign] = "kept hand-written clip"
            print(f"{sign:20s} kept: src/animation/clips/{sign}.ts is hand-written")
            continue
        both = built["active"]["left"].any()
        report[sign] = {"takes": built["takes"], "duration": dur, "two_hands": bool(both)}
        print(f"{sign:20s} {built['takes']:2d} takes  {dur:4.2f}s  {'two hands' if both else 'one hand'}")
    built_ids = index_ids()
    write_index(built_ids)
    (Path(__file__).resolve().parent / "last_build.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"index: {len(built_ids)} recorded clips")


def index_ids() -> list[str]:
    """Clips to list in the index: clips of the recorder's signs, then hand-made words without recordings."""
    built_ids = sorted(p.stem for p in CLIPS.glob("*.ts")
                       if p.stem in SIGN_INFO and p.stem not in HAND_AUTHORED
                       and f"export function create{ts_name(p.stem)}Animation" in p.read_text(encoding="utf-8")
                       and f"export const {p.stem.upper()}_DURATION" in p.read_text(encoding="utf-8"))
    return [s for s in list(SIGN_IDS) + list(HAND_MADE_WORDS) if s in built_ids]


if __name__ == "__main__":
    main(sys.argv[1:])
