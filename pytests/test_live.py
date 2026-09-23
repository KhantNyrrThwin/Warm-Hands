"""Live sentence building without the webcam."""

from __future__ import annotations

import unittest

import numpy as np

from sign_app.live import WINDOW, LiveTranslator


class _FakeClassifier:
    def predict(self, seq, top_k=1):
        code = float(np.mean(seq))
        if code > 0.5:
            ranked = [("မင်္ဂလာပါ  (hello)", 0.96)]
        else:
            ranked = [("ကူညီပါ  (help)", 0.95)]
        return ranked[:top_k]


class LiveTranslatorTests(unittest.TestCase):
    def test_appends_a_new_sign_every_ten_frames_and_skips_repeats(self):
        live = LiveTranslator(_FakeClassifier())
        hello = np.full((165,), 0.9, np.float32)
        help_sign = np.full((165,), 0.1, np.float32)

        for _ in range(WINDOW - 1):
            update = live.step_features(hello, hands_present=True)
            self.assertEqual(update["sentence"], "")

        update = live.step_features(hello, hands_present=True)
        self.assertEqual(update["sentence"], "Hello")
        self.assertTrue(update["grammar"].startswith("Hello"))

        for _ in range(WINDOW):
            update = live.step_features(hello, hands_present=True)
        self.assertEqual(update["sentence"], "Hello")

        for _ in range(WINDOW):
            update = live.step_features(help_sign, hands_present=True)
        self.assertEqual(update["sentence"], "Hello help")
        self.assertIn("help", update["grammar"].lower())

    def test_empty_hands_do_not_add_a_sign(self):
        live = LiveTranslator(_FakeClassifier())
        frame = np.full((165,), 0.9, np.float32)
        for _ in range(WINDOW):
            update = live.step_features(frame, hands_present=False)
        self.assertEqual(update["sentence"], "")
        self.assertFalse(update["hands"])

    def test_reset_clears_the_sentence(self):
        live = LiveTranslator(_FakeClassifier())
        frame = np.full((165,), 0.9, np.float32)
        for _ in range(WINDOW):
            live.step_features(frame, hands_present=True)
        cleared = live.reset()
        self.assertEqual(cleared["sentence"], "")
        self.assertEqual(cleared["grammar"], "")


if __name__ == "__main__":
    unittest.main()
