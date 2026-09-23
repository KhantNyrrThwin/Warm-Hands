from __future__ import annotations

import json
import urllib.request
import zipfile
from pathlib import Path

from sign_app.paths import (
    DATA_DIR,
    DEFAULT_WLASL_ZIP,
    GLOSSES_PATH,
    HAND_MODEL_PATH,
    HAND_MODEL_URL,
    MODELS_DIR,
    NESTED_WLASL_JSON,
    POSE_MODEL_PATH,
    POSE_MODEL_URL,
    WLASL_JSON_PATH,
)


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1000:
        return
    tmp = dest.with_suffix(dest.suffix + ".part")
    print(f"Downloading {dest.name} ...")
    urllib.request.urlretrieve(url, tmp)
    tmp.replace(dest)


def _write_glosses(entries: list) -> None:
    glosses = [
        {"gloss": item["gloss"], "samples": len(item.get("instances", []))}
        for item in entries
    ]
    GLOSSES_PATH.write_text(json.dumps(glosses), encoding="utf-8")


def extract_glosses(zip_path: Path | None = None) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not WLASL_JSON_PATH.exists() and NESTED_WLASL_JSON.exists():
        WLASL_JSON_PATH.write_bytes(NESTED_WLASL_JSON.read_bytes())
    if not WLASL_JSON_PATH.exists():
        zip_path = zip_path or DEFAULT_WLASL_ZIP
        if not zip_path.exists():
            raise FileNotFoundError(
                f"WLASL zip not found at {zip_path}. Pass the path to WLASL_v0.3.json.zip."
            )
        with zipfile.ZipFile(zip_path) as archive:
            WLASL_JSON_PATH.write_bytes(archive.read("WLASL_v0.3.json"))
    if not GLOSSES_PATH.exists():
        entries = json.loads(WLASL_JSON_PATH.read_text(encoding="utf-8"))
        _write_glosses(entries)
    return GLOSSES_PATH


def ensure_assets(wlasl_zip: Path | None = None) -> None:
    extract_glosses(wlasl_zip)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    _download(HAND_MODEL_URL, HAND_MODEL_PATH)
    _download(POSE_MODEL_URL, POSE_MODEL_PATH)
