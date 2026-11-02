"""Independent presentation datasets and models."""
from dataclasses import dataclass
import json
from sign_app.paths import DATA_DIR, MODELS_DIR

@dataclass(frozen=True)
class LanguageProfile:
    key: str

    @property
    def live_dir(self):
        return DATA_DIR / f"{self.key}5" / "live"

    @property
    def checkpoint(self):
        return MODELS_DIR / f"{self.key}5_lstm.npz"

    def sign_dir(self, sign):
        # Help is the same sign in both datasets. Keep one source so recordings,
        # progress counts, and training cannot drift between languages.
        if sign == "help":
            return DATA_DIR / "international5" / "live" / "help"
        return self.live_dir / sign

    def glosses(self):
        path = DATA_DIR / f"{self.key}5" / "glosses.json"
        return json.loads(path.read_text(encoding="utf-8"))

def get_profile(language):
    if language not in ("myanmar", "international"):
        raise ValueError("Choose myanmar or international.")
    return LanguageProfile(language)
