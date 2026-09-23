from __future__ import annotations

import json
from pathlib import Path

from sign_app.hospital import HOSPITAL_GLOSSES, top_hospital_entries
from sign_app.paths import GLOSSES_PATH, HOSPITAL_GLOSSES_PATH, WLASL_JSON_PATH
from sign_app.setup_assets import extract_glosses


def load_glosses(path: Path = GLOSSES_PATH, hospital_only: bool = True, top_k: int = 100) -> list[dict]:
    extract_glosses()
    if hospital_only and WLASL_JSON_PATH.exists():
        entries = json.loads(WLASL_JSON_PATH.read_text(encoding="utf-8"))
        filtered = top_hospital_entries(entries, top_k)
        items = [{"gloss": e["gloss"], "samples": len(e.get("instances", []))} for e in filtered]
    else:
        items = json.loads(path.read_text(encoding="utf-8"))
        if hospital_only:
            items = [item for item in items if item["gloss"] in HOSPITAL_GLOSSES]
    HOSPITAL_GLOSSES_PATH.parent.mkdir(parents=True, exist_ok=True)
    HOSPITAL_GLOSSES_PATH.write_text(json.dumps(items, indent=2), encoding="utf-8")
    return items
