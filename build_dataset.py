"""Warm Hands — MSL 77 dataset tool: check progress, combine signers, build the training set.

    python build_dataset.py report                 # progress of every signer on this laptop
    python build_dataset.py export                 # zip YOUR recordings to send to the trainer
    python build_dataset.py import a.zip b.zip     # (trainer) add other signers' zips / folders
    python build_dataset.py build                  # (trainer) combine everyone -> dataset files

`build` writes to data/msl77/dataset/:
    msl77_dataset.npz   X (N, 60, 165) float32, y (N,), hand_mask (N, 60, 2), signer, sample_id
    dataset_info.json   every detail: classes, counts per sign x signer, signers, laptops,
                        fps, hand visibility, rejected samples and why, missing takes
    samples.csv         one row per recorded file (kept or rejected)
    DATASET_REPORT.md   the same information as readable tables

Raw layout (written by collect_data.py; one folder per signer, so merging never collides):
    data/msl77/raw/<signer_id>/signer.json
    data/msl77/raw/<signer_id>/<sign_id>/<signer_id>__<sign_id>__<time>.npz
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import shutil
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path, PurePosixPath

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from msl77_signs import (  # noqa: E402
    DATASET_DIR, DATASET_VERSION, EXPORT_DIR, FEATURE_SIZE, MSL77_DIR, RAW_DIR,
    RECORD_SECONDS, SIGN_BY_ID, SIGN_IDS, TARGET_FRAMES,
)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

MIN_HAND_RATIO = 0.60
MIN_FRAMES = 20
MAX_GAP = 4  # hand dropouts of <= 4 frames are interpolated before resampling


# --------------------------------------------------------------------------- reading raw data
def signer_dirs(raw: Path) -> list[Path]:
    if not raw.is_dir():
        return []
    return sorted(p for p in raw.iterdir() if p.is_dir() and not p.name.startswith("_"))


def sample_files(signer_dir: Path) -> list[Path]:
    return sorted(p for p in signer_dir.glob("*/*.npz") if not p.name.endswith(".tmp.npz"))


def load_sample(path: Path) -> dict:
    with np.load(path, allow_pickle=False) as z:
        data = {k: z[k] for k in z.files}
    data["meta"] = json.loads(str(data["meta"]))
    return data


def fill_gaps(feat: np.ndarray, present: np.ndarray, cols: slice, max_gap: int) -> np.ndarray:
    """Linearly interpolate one hand across short dropouts (both sides must be visible)."""
    idx = np.flatnonzero(present)
    for a, b in zip(idx[:-1], idx[1:]):
        gap = b - a - 1
        if 0 < gap <= max_gap:
            for k in range(1, gap + 1):
                w = k / (gap + 1)
                feat[a + k, cols] = (1 - w) * feat[a, cols] + w * feat[b, cols]
                present[a + k] = True
    return feat


def resample(feat: np.ndarray, mask: np.ndarray, t: np.ndarray, n: int) -> tuple[np.ndarray, np.ndarray]:
    """Pick the nearest real frame for n evenly spaced times, so every laptop's fps gives the
    same 60-frame / 5-second sample. Nearest (not interpolation) never blends a hand with zeros."""
    grid = np.linspace(0.0, RECORD_SECONDS, n, endpoint=False) + RECORD_SECONDS / (2 * n)
    pos = np.clip(np.searchsorted(t, grid), 1, len(t) - 1)
    nearest = np.where(np.abs(t[pos - 1] - grid) <= np.abs(t[pos] - grid), pos - 1, pos)
    return feat[nearest], mask[nearest]


def check(data: dict) -> str | None:
    meta, feat = data["meta"], data["features"]
    if meta.get("sign_id") not in SIGN_BY_ID:
        return f"unknown sign id {meta.get('sign_id')!r}"
    if feat.ndim != 2 or feat.shape[1] != FEATURE_SIZE:
        return f"bad feature shape {feat.shape}"
    if len(feat) < MIN_FRAMES:
        return f"too few frames ({len(feat)})"
    if not np.isfinite(feat).all():
        return "NaN/inf in landmarks"
    seen = (data["left_present"] | data["right_present"]).mean()
    if seen < MIN_HAND_RATIO:
        return f"hands visible only {seen:.0%}"
    return None


def scan(raws: list[Path]):
    """Yield (path, data or None, reason) for every raw file, de-duplicated by file name."""
    seen = set()
    for raw in raws:
        for sdir in signer_dirs(raw):
            for path in sample_files(sdir):
                if path.name in seen:
                    continue
                seen.add(path.name)
                try:
                    data = load_sample(path)
                except Exception as exc:  # corrupt / half-copied file
                    yield path, None, f"unreadable: {exc}"
                    continue
                yield path, data, check(data)


# --------------------------------------------------------------------------- commands
def cmd_report(args):
    raws = [Path(r) for r in args.raw]
    target = args.target
    counts: dict[str, Counter] = defaultdict(Counter)
    for raw in raws:
        for sdir in signer_dirs(raw):
            for path in sample_files(sdir):
                counts[sdir.name][path.parent.name] += 1
    if not counts:
        print(f"No recordings found in {', '.join(map(str, raws))}")
        return
    for signer, c in sorted(counts.items()):
        total = sum(min(c[s], target) for s in SIGN_IDS)
        done = sum(c[s] >= target for s in SIGN_IDS)
        print(f"\n== {signer}: {sum(c.values())} samples, {done}/77 signs complete "
              f"({total}/{77 * target} = {total / (77 * target):.0%})")
        missing = [f"{s}({c[s]})" for s in SIGN_IDS if c[s] < target]
        if missing:
            more = f" ... and {len(missing) - 15} more" if len(missing) > 15 else ""
            print("   still needed:", ", ".join(missing[:15]) + more)


def default_signers() -> list[str]:
    try:
        sid = json.loads((MSL77_DIR / "collector_settings.json").read_text(encoding="utf-8"))["signer_id"]
        if (RAW_DIR / sid).is_dir():
            return [sid]
    except Exception:
        pass
    return [p.name for p in signer_dirs(RAW_DIR)]


def cmd_export(args):
    signers = args.signer or default_signers()
    if not signers:
        sys.exit("Nothing to export: data/msl77/raw/ is empty.")
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    for signer in signers:
        folder = RAW_DIR / signer
        if not folder.is_dir():
            print(f"skip {signer}: {folder} not found")
            continue
        files = [folder / "signer.json"] if (folder / "signer.json").exists() else []
        files += sample_files(folder)
        out = EXPORT_DIR / f"msl77_{signer}_{dt.datetime.now():%Y%m%d-%H%M}.zip"
        with zipfile.ZipFile(out, "w", zipfile.ZIP_STORED) as zf:  # npz is already compressed
            for f in files:
                zf.write(f, f.relative_to(RAW_DIR).as_posix())
        print(f"{signer}: {len(files) - 1} samples -> {out}  ({out.stat().st_size / 1e6:.1f} MB)")
    print("\nSend the zip file(s) to the person who trains the model "
          "(Google Drive / Telegram / USB).")


def _safe_member(name: str) -> PurePosixPath | None:
    p = PurePosixPath(name)
    if p.is_absolute() or ".." in p.parts or len(p.parts) < 2:
        return None
    if p.parts[0].startswith("_") or p.suffix not in (".npz", ".json"):
        return None
    return p


def cmd_import(args):
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for src in map(Path, args.sources):
        added = skipped = 0
        if src.is_file() and src.suffix == ".zip":
            with zipfile.ZipFile(src) as zf:
                for info in zf.infolist():
                    rel = _safe_member(info.filename)
                    if info.is_dir() or rel is None:
                        continue
                    dest = RAW_DIR.joinpath(*rel.parts)
                    if dest.exists() and dest.suffix == ".npz":
                        skipped += 1
                        continue
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info) as fin, open(dest, "wb") as fout:
                        shutil.copyfileobj(fin, fout)
                    added += 1
        elif src.is_dir():
            # Accept either a raw/ folder (containing signer folders) or one signer folder.
            base = src if not (src / "signer.json").exists() and not any(src.glob("*/*.npz")) else src.parent
            for f in list(src.rglob("*.npz")) + list(src.rglob("signer.json")):
                rel = _safe_member(f.relative_to(base).as_posix())
                if rel is None:
                    continue
                dest = RAW_DIR.joinpath(*rel.parts)
                if dest.exists() and dest.suffix == ".npz":
                    skipped += 1
                    continue
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, dest)
                added += 1
        else:
            print(f"skip {src}: not a .zip file or folder")
            continue
        print(f"{src.name}: added {added} files, {skipped} already present")
    print("\nNow run:  python build_dataset.py build")


def cmd_build(args):
    raws = [Path(r) for r in args.raw]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    X, Y, M, signers, ids = [], [], [], [], []
    rows, rejected = [], []
    signer_info: dict[str, dict] = defaultdict(lambda: {
        "samples": 0, "laptops": set(), "names": set(), "dominant_hand": set(),
        "fps": [], "hand_ratio": [], "first": None, "last": None, "rejected": 0})

    for path, data, reason in scan(raws):
        meta = data["meta"] if data else {}
        signer = meta.get("signer_id") or path.parent.parent.name
        info = signer_info[signer]
        row = {"file": path.relative_to(path.parents[2]).as_posix(), "signer": signer,
               "sign_id": meta.get("sign_id", path.parent.name), "sign_my": meta.get("sign_my", ""),
               "laptop": meta.get("laptop", ""), "frames": meta.get("frames", ""),
               "fps": meta.get("fps", ""), "hand_visible": meta.get("hand_visible_ratio", ""),
               "recorded_at": meta.get("recorded_at", ""), "kept": reason is None,
               "reason": reason or ""}
        rows.append(row)
        if reason:
            info["rejected"] += 1
            rejected.append({k: row[k] for k in ("file", "signer", "sign_id", "reason")})
            continue

        feat = data["features"].astype(np.float32).copy()
        lp, rp = data["left_present"].copy(), data["right_present"].copy()
        feat = fill_gaps(feat, lp, slice(0, 63), MAX_GAP)
        feat = fill_gaps(feat, rp, slice(63, 126), MAX_GAP)
        t = data["timestamps"].astype(np.float64)
        f60, m60 = resample(feat, np.stack([lp, rp], axis=1), t, TARGET_FRAMES)

        X.append(f60)
        M.append(m60)
        Y.append(SIGN_BY_ID[meta["sign_id"]]["index"])
        signers.append(signer)
        ids.append(path.stem)
        info["samples"] += 1
        info["laptops"].add(meta.get("laptop", "?"))
        info["names"].add(meta.get("signer_name", ""))
        info["dominant_hand"].add(meta.get("dominant_hand", "?"))
        info["fps"].append(float(meta.get("fps", 0)))
        info["hand_ratio"].append(float(meta.get("hand_visible_ratio", 0)))
        day = meta.get("recorded_at", "")[:10]
        info["first"] = min(filter(None, [info["first"], day])) if day else info["first"]
        info["last"] = max(filter(None, [info["last"], day])) if day else info["last"]

    if not X:
        sys.exit("No usable samples found. Record with collect_data.py or import zips first.")

    X = np.stack(X).astype(np.float32)
    M = np.stack(M).astype(bool)
    Y = np.array(Y, dtype=np.int64)
    signer_names = sorted(set(signers))
    np.savez_compressed(
        out_dir / "msl77_dataset.npz",
        X=X, y=Y, hand_mask=M,
        signer=np.array(signers), sample_id=np.array(ids),
        labels=np.array(SIGN_IDS), labels_my=np.array([SIGN_BY_ID[s]["my"] for s in SIGN_IDS]),
        labels_en=np.array([SIGN_BY_ID[s]["en"] for s in SIGN_IDS]),
    )

    per_sign = {s: Counter() for s in SIGN_IDS}
    for y, sg in zip(Y, signers):
        per_sign[SIGN_IDS[y]][sg] += 1
    target = args.target
    missing = [{"sign_id": s, "sign_my": SIGN_BY_ID[s]["my"], "signer": sg,
                "have": per_sign[s][sg], "need": target - per_sign[s][sg]}
               for s in SIGN_IDS for sg in signer_names if per_sign[s][sg] < target]
    signers_out = {
        sg: {"names": sorted(v["names"] - {""}), "laptops": sorted(v["laptops"]),
             "dominant_hand": sorted(v["dominant_hand"]), "samples": v["samples"],
             "rejected": v["rejected"],
             "signs_complete": sum(per_sign[s][sg] >= target for s in SIGN_IDS),
             "avg_fps": round(float(np.mean(v["fps"])), 1) if v["fps"] else 0,
             "avg_hand_visible": round(float(np.mean(v["hand_ratio"])), 3) if v["hand_ratio"] else 0,
             "recorded_from": v["first"], "recorded_to": v["last"]}
        for sg, v in sorted(signer_info.items())}
    info = {
        "dataset_version": DATASET_VERSION,
        "built_at": dt.datetime.now().isoformat(timespec="seconds"),
        "files": {"dataset": "msl77_dataset.npz", "samples": "samples.csv", "report": "DATASET_REPORT.md"},
        "num_samples": int(len(Y)), "num_rejected": len(rejected),
        "num_classes": len(SIGN_IDS), "classes_with_data": int(len(set(Y.tolist()))),
        "shape": {"X": list(X.shape), "hand_mask": list(M.shape)},
        "frames_per_sample": TARGET_FRAMES, "record_seconds": RECORD_SECONDS,
        "sample_rate_hz": TARGET_FRAMES / RECORD_SECONDS,
        "feature_layout": {"left_hand": [0, 63], "right_hand": [63, 126], "pose_upper13": [126, 165],
                           "normalisation": "origin = shoulder midpoint, scale = shoulder width; "
                                            "missing hand = zeros"},
        "quality_rules": {"min_hand_visible": MIN_HAND_RATIO, "min_frames": MIN_FRAMES,
                          "interpolated_gap_frames": MAX_GAP, "resampling": "nearest frame by timestamp"},
        "target_per_sign_per_signer": target,
        "signers": signers_out,
        "classes": [{**{k: SIGN_BY_ID[s][k] for k in ("index", "id", "my", "en", "category")},
                     "total": sum(per_sign[s].values()), "per_signer": dict(per_sign[s])}
                    for s in SIGN_IDS],
        "missing": missing,
        "rejected": rejected,
    }
    (out_dir / "dataset_info.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")

    with open(out_dir / "samples.csv", "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    md = [f"# MSL 77 dataset report\n", f"Built {info['built_at']} · version `{DATASET_VERSION}`\n",
          f"- Usable samples: **{len(Y)}** (rejected {len(rejected)})",
          f"- Classes with data: **{info['classes_with_data']}/77**",
          f"- Each sample: {TARGET_FRAMES} frames × {FEATURE_SIZE} features ({RECORD_SECONDS:g} s)",
          f"- Target: {target} per sign per signer\n", "## Signers\n",
          "| Signer | Name | Laptop(s) | Hand | Samples | Signs complete | Avg fps | Hands visible | Dates |",
          "|---|---|---|---|---|---|---|---|---|"]
    for sg, v in signers_out.items():
        md.append(f"| {sg} | {', '.join(v['names'])} | {', '.join(v['laptops'])} | "
                  f"{', '.join(v['dominant_hand'])} | {v['samples']} | {v['signs_complete']}/77 | "
                  f"{v['avg_fps']} | {v['avg_hand_visible']:.0%} | {v['recorded_from']} → {v['recorded_to']} |")
    md += ["\n## Samples per sign\n", "| # | Sign | English | " + " | ".join(signer_names) + " | Total |",
           "|---|---|---|" + "---|" * (len(signer_names) + 1)]
    for c in info["classes"]:
        cells = [str(c["per_signer"].get(sg, 0)) + ("" if c["per_signer"].get(sg, 0) >= target else " ⚠")
                 for sg in signer_names]
        md.append(f"| {c['index'] + 1} | {c['my']} | {c['en']} | " + " | ".join(cells) + f" | {c['total']} |")
    if rejected:
        md += ["\n## Rejected files\n", "| File | Reason |", "|---|---|"]
        md += [f"| {r['file']} | {r['reason']} |" for r in rejected]
    (out_dir / "DATASET_REPORT.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    print(f"Dataset: {len(Y)} samples, {info['classes_with_data']}/77 classes, "
          f"{len(signer_names)} signer(s): {', '.join(signer_names)}")
    print(f"Rejected: {len(rejected)}   Missing (sign, signer) pairs below target: {len(missing)}")
    print(f"Wrote {out_dir / 'msl77_dataset.npz'}, dataset_info.json, samples.csv, DATASET_REPORT.md")
    print("Next:  python train_model.py")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("report", help="show recording progress")
    p.add_argument("--raw", nargs="+", default=[str(RAW_DIR)])
    p.add_argument("--target", type=int, default=30)
    p.set_defaults(func=cmd_report)
    p = sub.add_parser("export", help="zip a signer's recordings")
    p.add_argument("--signer", nargs="*", help="signer id(s); default = this laptop's signer")
    p.set_defaults(func=cmd_export)
    p = sub.add_parser("import", help="add other signers' zip files or folders")
    p.add_argument("sources", nargs="+")
    p.set_defaults(func=cmd_import)
    p = sub.add_parser("build", help="combine all signers into the training dataset")
    p.add_argument("--raw", nargs="+", default=[str(RAW_DIR)],
                   help="one or more raw folders (default data/msl77/raw)")
    p.add_argument("--out", default=str(DATASET_DIR))
    p.add_argument("--target", type=int, default=30)
    p.set_defaults(func=cmd_build)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
