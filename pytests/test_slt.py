"""LSTM sequence shape and grammar, without the webcam."""

from __future__ import annotations

import unittest

import numpy as np
import torch

from sign_app.grammar import correct_labels, push_token
from sign_app.slt_infer import NumpySLTLSTM, to_slt_sequence
from sign_app.slt_net import SignLSTM


class SequenceTests(unittest.TestCase):
    def test_hands_resample_to_ten_frames(self):
        clip = np.arange(15 * 165, dtype=np.float32).reshape(15, 165)
        seq = to_slt_sequence(clip)
        self.assertEqual(seq.shape, (10, 126))
        self.assertAlmostEqual(float(seq[0, 0]), float(clip[0, 0]))
        self.assertAlmostEqual(float(seq[-1, 10]), float(clip[-1, 10]))

    def test_numpy_matches_torch(self):
        torch.manual_seed(0)
        model = SignLSTM(num_classes=4)
        model.eval()
        x = torch.randn(2, 10, 126)
        with torch.no_grad():
            expected = model(x).numpy()
        blob = {
            "lstm1_weight_ih": model.lstm1.weight_ih.detach().numpy(),
            "lstm1_weight_hh": model.lstm1.weight_hh.detach().numpy(),
            "lstm1_bias": model.lstm1.bias.detach().numpy(),
            "lstm2_weight_ih": model.lstm2.weight_ih.detach().numpy(),
            "lstm2_weight_hh": model.lstm2.weight_hh.detach().numpy(),
            "lstm2_bias": model.lstm2.bias.detach().numpy(),
            "lstm3_weight_ih": model.lstm3.weight_ih.detach().numpy(),
            "lstm3_weight_hh": model.lstm3.weight_hh.detach().numpy(),
            "lstm3_bias": model.lstm3.bias.detach().numpy(),
            "dense_w": model.dense.weight.detach().numpy(),
            "dense_b": model.dense.bias.detach().numpy(),
            "out_w": model.out.weight.detach().numpy(),
            "out_b": model.out.bias.detach().numpy(),
        }
        got = NumpySLTLSTM(blob).logits(x.numpy())
        np.testing.assert_allclose(got, expected, rtol=1e-4, atol=1e-4)


class GrammarTests(unittest.TestCase):
    def test_fingerspelled_letters_join(self):
        sentence = push_token([], "h", {"h", "i"})
        sentence = push_token(sentence, "i", {"h", "i"})
        self.assertEqual(sentence, ["Hi"])

    def test_sign_words_become_a_sentence(self):
        text = correct_labels(["ကျေးဇူးပြု  (please)", "ကူညီပါ  (help)"])
        self.assertEqual(text, "Please help.")


if __name__ == "__main__":
    unittest.main()
