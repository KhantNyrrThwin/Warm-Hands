"""Reading recorded MSL samples into a body-normalised frame.

Coordinates (all in shoulder-width units, origin = midpoint of the shoulders):
    u  to the viewer's right   (image x)
    v  up                      (-image y)
    w  toward the camera       (forward from the signer's shoulder plane)
The signer's right hand appears on the viewer's left (camera view, not mirrored).
"""
from __future__ import annotations

import glob
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "msl77" / "raw"

# MediaPipe pose indices
NOSE, EYE_L, EYE_R, EAR_L, EAR_R, MOUTH_L, MOUTH_R = 0, 2, 5, 7, 8, 9, 10
SHO_L, SHO_R, ELB_L, ELB_R, WRI_L, WRI_R = 11, 12, 13, 14, 15, 16
PALM = [0, 5, 9, 13, 17]
FINGERS = {"thumb": [1, 2, 3, 4], "index": [5, 6, 7, 8], "middle": [9, 10, 11, 12],
           "ring": [13, 14, 15, 16], "pinky": [17, 18, 19, 20]}


@dataclass
class Take:
    path: Path
    t: np.ndarray            # (T,) seconds
    hands: dict              # side -> (T,21,3) u,v,w(relative depth inside the hand)
    present: dict            # side -> (T,) bool
    pose: np.ndarray         # (T,33,3) u,v,visibility
    face: dict               # anchor name -> (2,) u,v  (median over the take)
    sw_px: float
    signer: str


def _px(a, res):
    return a[..., 0] * res[0], a[..., 1] * res[1]


def load_take(path: Path) -> Take:
    d = np.load(path, allow_pickle=True)
    meta = json.loads(str(d["meta"]))
    res = meta.get("camera_resolution", [640, 480])
    P = d["pose"].astype(np.float64)
    px, py = _px(P, res)
    vis = P[..., 3]
    good = (vis[:, SHO_L] > .5) & (vis[:, SHO_R] > .5)
    if good.sum() < 3:
        good = np.ones(len(P), bool)
    cx = np.median((px[good, SHO_L] + px[good, SHO_R]) / 2)
    cy = np.median((py[good, SHO_L] + py[good, SHO_R]) / 2)
    sw = np.median(np.hypot(px[good, SHO_L] - px[good, SHO_R], py[good, SHO_L] - py[good, SHO_R]))
    U = lambda x: (x - cx) / sw
    V = lambda y: -(y - cy) / sw
    pose = np.stack([U(px), V(py), vis], -1)
    hands, present = {}, {}
    for side in ("right", "left"):
        H = d[side].astype(np.float64)
        hx, hy = _px(H, res)
        hz = -(H[..., 2] - H[..., :1, 2]) * res[0] / sw   # toward camera = +, relative to the wrist
        hands[side] = np.stack([U(hx), V(hy), hz], -1)
        present[side] = d[f"{side}_present"].astype(bool) & np.isfinite(hands[side]).all((1, 2))
    fv = vis[:, [NOSE, EYE_L, EYE_R, EAR_L, EAR_R, MOUTH_L, MOUTH_R]].min(1) > .5
    fv = fv if fv.sum() >= 3 else np.ones(len(P), bool)
    med = lambda i: np.median(pose[fv, i, :2], 0)
    face = {"nose": med(NOSE), "eyeL": med(EYE_L), "eyeR": med(EYE_R), "earL": med(EAR_L), "earR": med(EAR_R),
            "mouth": (med(MOUTH_L) + med(MOUTH_R)) / 2}
    return Take(path, d["timestamps"].astype(np.float64), hands, present, pose, face, float(sw), meta.get("signer_id", "?"))


def takes_for(sign: str, signer: str | None = None) -> list[Take]:
    pattern = RAW / (signer or "*") / sign / "*.npz"
    return [load_take(Path(p)) for p in sorted(glob.glob(str(pattern))) if "_deleted" not in p]


def arm_lengths(signer: str, sample_every: int = 3) -> tuple[float, float]:
    """Upper arm and forearm in shoulder widths: a high percentile of their 2D length
    over the signer's whole recording (the arm is often parallel to the camera)."""
    lu, lf = [], []
    for p in sorted(glob.glob(str(RAW / signer / "*" / "*.npz")))[::sample_every]:
        tk = load_take(Path(p))
        P = tk.pose
        for s, e, w in ((SHO_R, ELB_R, WRI_R), (SHO_L, ELB_L, WRI_L)):
            ok = (P[:, s, 2] > .9) & (P[:, e, 2] > .9) & (P[:, w, 2] > .9) & (P[:, w, 1] > -2.2) & (P[:, e, 1] > -2.2)
            lu += list(np.hypot(*(P[ok, e, :2] - P[ok, s, :2]).T))
            lf += list(np.hypot(*(P[ok, w, :2] - P[ok, e, :2]).T))
    return float(np.percentile(lu, 97)), float(np.percentile(lf, 97))


def wrist_depth(tk: Take, side: str, Lu: float, Lf: float) -> np.ndarray:
    """Forward depth of the wrist from arm foreshortening (both segments assumed forward)."""
    s, e = (SHO_R, ELB_R) if side == "right" else (SHO_L, ELB_L)
    P = tk.pose
    wrist2d = np.where(tk.present[side][:, None], tk.hands[side][:, 0, :2], P[:, WRI_R if side == "right" else WRI_L, :2])
    lu = np.hypot(*(P[:, e, :2] - P[:, s, :2]).T)
    lf = np.hypot(*(wrist2d - P[:, e, :2]).T)
    return np.sqrt(np.clip(Lu ** 2 - lu ** 2, 0, None)) + np.sqrt(np.clip(Lf ** 2 - lf ** 2, 0, None))
