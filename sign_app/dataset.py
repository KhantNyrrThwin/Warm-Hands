from __future__ import annotations

import json
from pathlib import Path

from sign_app.paths import LANDMARK_DIR, SAMPLES_PATH, VIDEO_DIR, WLASL_JSON_PATH
from sign_app.setup_assets import extract_glosses


def load_wlasl(hospital_only: bool = True, top_k: int | None = 100) -> list[dict]:
    extract_glosses()
    entries = json.loads(WLASL_JSON_PATH.read_text(encoding="utf-8"))
    if hospital_only:
        from sign_app.hospital import HOSPITAL_GLOSSES, top_hospital_entries

        if top_k:
            entries = top_hospital_entries(entries, top_k)
        else:
            entries = [item for item in entries if item["gloss"] in HOSPITAL_GLOSSES]
    return entries


def gloss_list(entries: list[dict] | None = None) -> list[str]:
    entries = entries if entries is not None else load_wlasl()
    return [item["gloss"] for item in entries]


def build_samples(entries: list[dict] | None = None) -> list[dict]:
    entries = entries if entries is not None else load_wlasl()
    samples = []
    for class_id, item in enumerate(entries):
        gloss = item["gloss"]
        for inst in item["instances"]:
            video_id = inst["video_id"]
            samples.append(
                {
                    "video_id": video_id,
                    "gloss": gloss,
                    "class_id": class_id,
                    "split": inst.get("split", "train"),
                    "url": inst.get("url", ""),
                    "fps": inst.get("fps", 25),
                    "frame_start": inst.get("frame_start", 1),
                    "frame_end": inst.get("frame_end", -1),
                    "bbox": inst.get("bbox"),
                    "video_path": str(VIDEO_DIR / f"{video_id}.mp4"),
                    "landmark_path": str(LANDMARK_DIR / f"{video_id}.npy"),
                }
            )
    SAMPLES_PATH.write_text(json.dumps(samples), encoding="utf-8")
    return samples


def load_samples() -> list[dict]:
    return build_samples()
