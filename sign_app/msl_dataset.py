from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from sign_app.features import FEATURE_SIZE
from sign_app.paths import (
    MSL_GLOSSES_PATH,
    MSL_LANDMARK_DIR,
    MSL_SAMPLES_PATH,
    MSL_TARGET_CLIPS,
    MSL_VIDEO_DIR,
)


def load_glosses() -> list[dict]:
    if not MSL_GLOSSES_PATH.exists():
        raise FileNotFoundError(
            f"Missing {MSL_GLOSSES_PATH}. Create it with 20 signs before recording."
        )
    items = json.loads(MSL_GLOSSES_PATH.read_text(encoding="utf-8"))
    if len(items) < 2:
        raise ValueError("Need at least 2 signs in glosses.json")
    for item in items:
        if not item.get("id"):
            raise ValueError("Each gloss needs an ascii 'id' (folder name), e.g. hello")
        item["id"] = str(item["id"]).strip().replace(" ", "_")
        item.setdefault("en", item["id"])
        item.setdefault("my", item["en"])
    return items


def gloss_ids() -> list[str]:
    return [item["id"] for item in load_glosses()]


def display_name(item: dict) -> str:
    my = item.get("my") or ""
    en = item.get("en") or item["id"]
    if my and my != en:
        return f"{my}  ({en})"
    return str(en)


def load_samples() -> list[dict]:
    if not MSL_SAMPLES_PATH.exists():
        return []
    return json.loads(MSL_SAMPLES_PATH.read_text(encoding="utf-8"))


def save_samples(samples: list[dict]) -> None:
    MSL_SAMPLES_PATH.parent.mkdir(parents=True, exist_ok=True)
    MSL_SAMPLES_PATH.write_text(json.dumps(samples, indent=2, ensure_ascii=False), encoding="utf-8")


def counts() -> dict[str, int]:
    tallies: dict[str, int] = Counter()
    for sample in load_samples():
        path = Path(sample["landmark_path"])
        if path.exists():
            tallies[sample["gloss"]] += 1
    return dict(tallies)


def progress_rows() -> list[tuple[dict, int, int]]:
    tallies = counts()
    return [(item, tallies.get(item["id"], 0), MSL_TARGET_CLIPS) for item in load_glosses()]


def _next_index(gloss: str) -> int:
    folder = MSL_LANDMARK_DIR / gloss
    existing = list(folder.glob(f"{gloss}_*.npy")) if folder.exists() else []
    if not existing:
        return 1
    nums = []
    for path in existing:
        try:
            nums.append(int(path.stem.split("_")[-1]))
        except ValueError:
            continue
    return (max(nums) if nums else 0) + 1


def add_clip(gloss: str, landmarks: np.ndarray, frames: list | None = None, fps: float = 20.0) -> dict:
    seq = np.asarray(landmarks, dtype=np.float32)
    if seq.ndim != 2 or seq.shape[1] != FEATURE_SIZE or len(seq) < 8:
        raise ValueError("Clip is too short or has the wrong landmark shape.")
    ids = gloss_ids()
    if gloss not in ids:
        raise ValueError(f"Unknown gloss {gloss}")
    idx = _next_index(gloss)
    stem = f"{gloss}_{idx:04d}"
    land_dir = MSL_LANDMARK_DIR / gloss
    land_dir.mkdir(parents=True, exist_ok=True)
    land_path = land_dir / f"{stem}.npy"
    np.save(land_path, seq)

    video_path = None
    if frames:
        import cv2

        vid_dir = MSL_VIDEO_DIR / gloss
        vid_dir.mkdir(parents=True, exist_ok=True)
        video_path = vid_dir / f"{stem}.mp4"
        h, w = frames[0].shape[:2]
        writer = cv2.VideoWriter(
            str(video_path),
            cv2.VideoWriter_fourcc(*"mp4v"),
            max(fps, 8.0),
            (w, h),
        )
        for frame in frames:
            writer.write(frame)
        writer.release()

    sample = {
        "gloss": gloss,
        "class_id": ids.index(gloss),
        "landmark_path": str(land_path),
        "video_path": str(video_path) if video_path else "",
        "created": datetime.now(timezone.utc).isoformat(),
    }
    samples = load_samples()
    samples.append(sample)
    save_samples(samples)
    return sample


def delete_last(gloss: str) -> bool:
    samples = load_samples()
    for i in range(len(samples) - 1, -1, -1):
        if samples[i]["gloss"] != gloss:
            continue
        sample = samples.pop(i)
        for key in ("landmark_path", "video_path"):
            path = Path(sample.get(key) or "")
            if path.exists():
                path.unlink()
        save_samples(samples)
        return True
    return False


def load_training_set() -> tuple[list[np.ndarray], np.ndarray, list[str]]:
    glosses = gloss_ids()
    index = {name: i for i, name in enumerate(glosses)}
    xs, ys = [], []
    for sample in load_samples():
        path = Path(sample["landmark_path"])
        if not path.exists():
            continue
        seq = np.load(path)
        if seq.ndim != 2 or len(seq) < 4 or seq.shape[1] != FEATURE_SIZE:
            continue
        gloss = sample["gloss"]
        if gloss not in index:
            continue
        xs.append(seq.astype(np.float32))
        ys.append(index[gloss])
    if not xs:
        raise RuntimeError(
            f"No MSL recordings in {MSL_LANDMARK_DIR}. Run: python record_msl.py"
        )
    return xs, np.array(ys, np.int64), [display_name(item) for item in load_glosses()]
