from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from sign_app.dataset import load_samples
from sign_app.features import FEATURE_SIZE
from sign_app.landmarks import LandmarkTracker
from sign_app.paths import LANDMARK_DIR, VIDEO_DIR
from sign_app.setup_assets import ensure_assets


def _frame_range(cap, sample: dict) -> tuple[int, int]:
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    start = max(int(sample.get("frame_start") or 1) - 1, 0)
    end = int(sample.get("frame_end") or -1)
    if end < 0 or end > total:
        end = total
    else:
        end = max(end, start + 1)
    if total <= 0:
        return 0, 0
    start = min(start, max(total - 1, 0))
    end = min(end, total)
    if end <= start:
        return 0, total
    return start, end


def extract_video(tracker: LandmarkTracker, sample: dict, max_frames: int = 48) -> bool:
    dest = Path(sample["landmark_path"])
    if dest.exists() and dest.stat().st_size > 100:
        try:
            existing = np.load(dest)
            if existing.ndim == 2 and existing.shape[1] == FEATURE_SIZE:
                return True
        except Exception:
            pass
    video = Path(sample["video_path"])
    if not video.exists() or video.stat().st_size < 8_000:
        return False
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        return False
    start, end = _frame_range(cap, sample)
    n = max(end - start, 1)
    if n <= max_frames:
        keep = set(range(start, end))
    else:
        keep = set(np.linspace(start, end - 1, num=max_frames).astype(int).tolist())
    cap.set(cv2.CAP_PROP_POS_FRAMES, start)
    rows = []
    idx = start
    while idx < end:
        ok, bgr = cap.read()
        if not ok:
            break
        if idx in keep:
            h, w = bgr.shape[:2]
            if w > 480:
                bgr = cv2.resize(bgr, (480, int(h * 480 / w)))
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            track = tracker.process(rgb)
            rows.append(track.features)
        idx += 1
    cap.release()
    if len(rows) < 4:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    np.save(dest, np.stack(rows).astype(np.float32))
    return True


def extract_all() -> None:
    ensure_assets()
    samples = [
        sample
        for sample in load_samples()
        if Path(sample["video_path"]).exists()
    ]
    print(f"Extracting landmarks from {len(samples)} hospital videos", flush=True)
    tracker = LandmarkTracker()
    ok = skip = fail = 0
    try:
        for i, sample in enumerate(samples, 1):
            dest = Path(sample["landmark_path"])
            already = False
            if dest.exists() and dest.stat().st_size > 100:
                try:
                    existing = np.load(dest)
                    already = existing.ndim == 2 and existing.shape[1] == FEATURE_SIZE
                except Exception:
                    already = False
            if already:
                skip += 1
            elif extract_video(tracker, sample):
                ok += 1
            else:
                fail += 1
            if i % 25 == 0 or i == len(samples):
                print(
                    f"extract {i}/{len(samples)} new={ok} cached={skip} fail={fail}",
                    flush=True,
                )
    finally:
        tracker.close()
    print("Extraction finished", {"new": ok, "cached": skip, "fail": fail}, flush=True)


if __name__ == "__main__":
    extract_all()
