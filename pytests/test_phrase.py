"""Sentence writing for please + help, without the webcam."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

import numpy as np

from sign_app.paths import MSL_GLOSSES_PATH, MSL_LANDMARK_DIR
from sign_app.phrase import decode_signs, realize, recognize_phrase


def _gloss(gloss_id: str) -> tuple[str, str]:
    items = json.loads(MSL_GLOSSES_PATH.read_text(encoding="utf-8"))
    item = next(row for row in items if row["id"] == gloss_id)
    return f"{item['my']}  ({item['en']})", item["my"]


PLEASE, PLEASE_MY = _gloss("please")
HELP, HELP_MY = _gloss("help")
EAT, EAT_MY = _gloss("eat")
DOCTOR, DOCTOR_MY = _gloss("doctor")
SENTENCE = f"{PLEASE_MY}\u104d {HELP_MY}"


class FakeClassifier:
    """First-feature mean selects the sign. 0 please, 1 help, else unsure."""

    def predict(self, seq, top_k=2):
        code = float(np.mean(seq[:, 0]))
        if code < 0.25:
            ranked = [(PLEASE, 0.96), (_gloss("hello")[0], 0.02)]
        elif code > 0.75:
            ranked = [(HELP, 0.95), (_gloss("medicine")[0], 0.03)]
        else:
            ranked = [(HELP, 0.42), (PLEASE, 0.31)]
        return ranked[:top_k]


class RealizeTests(unittest.TestCase):
    def test_please_then_help_inserts_particle(self) -> None:
        self.assertEqual(realize([PLEASE, HELP]), SENTENCE)

    def test_please_then_eat_inserts_particle(self) -> None:
        self.assertEqual(realize([PLEASE, EAT]), f"{PLEASE_MY}\u104d {EAT_MY}")

    def test_please_then_noun_stays_two_words(self) -> None:
        self.assertEqual(realize([PLEASE, DOCTOR]), f"{PLEASE_MY} {DOCTOR_MY}")

    def test_single_signs_have_no_particle(self) -> None:
        self.assertEqual(realize([PLEASE]), PLEASE_MY)
        self.assertEqual(realize([HELP]), HELP_MY)


class DecodeTests(unittest.TestCase):
    def test_two_signs_in_one_clip_become_the_sentence(self) -> None:
        seq = np.zeros((16, 165), np.float32)
        seq[8:, 0] = 1.0
        text, parts = recognize_phrase(FakeClassifier(), seq)
        self.assertEqual(text, SENTENCE)
        self.assertEqual([gloss for gloss, _conf in parts], [PLEASE, HELP])

    def test_one_sign_stays_one_word(self) -> None:
        seq = np.zeros((15, 165), np.float32)
        text, parts = recognize_phrase(FakeClassifier(), seq)
        self.assertEqual(text, PLEASE_MY)
        self.assertEqual(len(parts), 1)

    def test_unsure_clip_does_not_invent_a_second_sign(self) -> None:
        seq = np.full((15, 165), 0.5, np.float32)
        parts = decode_signs(FakeClassifier(), seq)
        self.assertEqual(len(parts), 1)


class RecordedClipTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from sign_app.classifier import SignClassifier
        from sign_app.paths import MSL_CHECKPOINT_PATH

        cls.checkpoint = MSL_CHECKPOINT_PATH
        if cls.checkpoint.exists():
            cls.clf = SignClassifier(cls.checkpoint)

    def setUp(self) -> None:
        if not self.checkpoint.exists():
            self.skipTest("MSL checkpoint not trained")

    def _load(self, gloss: str, index: int) -> np.ndarray:
        files = sorted((Path(MSL_LANDMARK_DIR) / gloss).glob("*.npy"))
        return np.load(files[index])

    def test_recorded_halves_of_please_and_help(self) -> None:
        # These recordings separate cleanly when each sign fills half the clip.
        for index in (2, 3, 5, 6, 7):
            please = self._load("please", index)
            help_ = self._load("help", index)
            seq = np.concatenate([please[: len(please) // 2], help_[: len(help_) // 2]])
            text, parts = recognize_phrase(self.clf, seq)
            self.assertEqual(text, SENTENCE, msg=f"clip {index} -> {text} {parts}")

    def test_single_recorded_sign_is_not_split(self) -> None:
        text, parts = recognize_phrase(self.clf, self._load("please", 3))
        self.assertEqual(text, PLEASE_MY)
        self.assertEqual(len(parts), 1)
        text, parts = recognize_phrase(self.clf, self._load("help", 0))
        self.assertEqual(text, HELP_MY)
        self.assertEqual(len(parts), 1)


if __name__ == "__main__":
    unittest.main()
