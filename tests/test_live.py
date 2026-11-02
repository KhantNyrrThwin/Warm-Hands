"""Five-second sign windows without a camera."""
import unittest
import numpy as np
from sign_app.live import WINDOW, LiveTranslator
from sign_app.myanmar_grammar import correct_myanmar

class Classifier:
    def predict(self, seq, top_k=1):
        return [("I" if float(np.mean(seq)) > 0.5 else "Sick", 0.96)]

class LiveTranslatorTests(unittest.TestCase):
    def setUp(self):
        self.now = 0.0
        self.live = LiveTranslator(Classifier(), clock=lambda: self.now)

    def sign(self, value):
        for _ in range(WINDOW):
            result = self.live.step_features(np.full(165, value, np.float32), True)
        return result

    def test_sign_is_committed_only_at_five_seconds(self):
        self.sign(0.9)
        self.now = 4.99
        self.assertEqual(self.live.check_idle()["sentence"], "")
        self.now = 5.0
        result = self.live.check_idle()
        self.assertEqual(result["sentence"], correct_myanmar(["I"]))
        self.assertEqual(result["sign_number"], 2)
        self.assertEqual(result["sign_remaining"], 5.0)
        self.assertFalse(result["completed"])

    def test_two_windows_build_sentence_then_empty_window_finishes(self):
        self.sign(0.9)
        self.now = 5.0
        self.live.check_idle()
        self.sign(0.1)
        self.now = 10.0
        result = self.live.check_idle()
        self.assertEqual(result["myanmar"], correct_myanmar(["I", "Sick"]))
        self.now = 15.0
        self.assertTrue(self.live.check_idle()["completed"])
        self.assertEqual(self.sign(0.9)["myanmar"], result["myanmar"])

    def test_majority_selects_one_sign_per_round(self):
        self.sign(0.9)
        self.sign(0.1)
        self.sign(0.1)
        self.now = 5.0
        self.live.check_idle()
        self.assertEqual(self.live.labels, ["Sick"])

    def test_manual_complete_commits_current_round_once(self):
        self.sign(0.9)
        self.live.complete()
        self.live.complete()
        self.assertEqual(self.live.labels, ["I"])
        self.assertTrue(self.live.check_idle()["completed"])

    def test_empty_round_and_reset(self):
        self.now = 5.0
        self.assertTrue(self.live.check_idle()["completed"])
        reset = self.live.reset()
        self.assertFalse(reset["completed"])
        self.assertEqual(reset["sign_remaining"], 5.0)
        self.assertEqual(reset["sign_number"], 1)

if __name__ == "__main__":
    unittest.main()
