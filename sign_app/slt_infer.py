"""NumPy inference for the Sign-Language-Translator LSTM.

The network matches that project's Keras model:

    LSTM(32, return_sequences=True, activation='relu')
    LSTM(64, return_sequences=True, activation='relu')
    LSTM(32, return_sequences=False, activation='relu')
    Dense(32, relu)
    Dense(classes, softmax)

Each frame is 126 values: 21 left-hand landmarks and 21 right-hand
landmarks, x/y/z. A clip is resampled to 10 frames before prediction.
"""

from __future__ import annotations

import numpy as np

FRAMES = 10
HAND_FEATURES = 126


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20.0, 20.0)))


def _lstm_relu(x: np.ndarray, weight_ih, weight_hh, bias, return_sequences: bool):
    """Keras LSTM step with activation='relu' (sigmoid gates, ReLU candidate and state)."""
    batch, steps, _ = x.shape
    hidden = weight_hh.shape[1]
    h = np.zeros((batch, hidden), dtype=np.float32)
    c = np.zeros((batch, hidden), dtype=np.float32)
    outs = []
    for t in range(steps):
        gates = x[:, t] @ weight_ih.T + h @ weight_hh.T + bias
        i, f, g, o = np.split(gates, 4, axis=1)
        i, f, o = _sigmoid(i), _sigmoid(f), _sigmoid(o)
        g = np.maximum(g, 0.0)
        c = f * c + i * g
        h = o * np.maximum(c, 0.0)
        outs.append(h)
    if return_sequences:
        return np.stack(outs, axis=1)
    return h


def to_slt_sequence(seq: np.ndarray, frames: int = FRAMES) -> np.ndarray:
    """(T, 165) or (T, 126) landmark clip -> (10, 126) hand sequence."""
    seq = np.asarray(seq, dtype=np.float32)
    if seq.ndim != 2 or seq.shape[1] < HAND_FEATURES:
        raise ValueError(
            f"expected at least {HAND_FEATURES} features per frame, got {getattr(seq, 'shape', None)}"
        )
    hands = seq[:, :HAND_FEATURES]
    if len(hands) == 1:
        return np.repeat(hands, frames, axis=0)
    src = np.linspace(0.0, 1.0, num=len(hands))
    dst = np.linspace(0.0, 1.0, num=frames)
    out = np.empty((frames, HAND_FEATURES), dtype=np.float32)
    for dim in range(HAND_FEATURES):
        out[:, dim] = np.interp(dst, src, hands[:, dim])
    return out


class NumpySLTLSTM:
    def __init__(self, data) -> None:
        self.layers = []
        for name in ("lstm1", "lstm2", "lstm3"):
            self.layers.append(
                (
                    np.asarray(data[f"{name}_weight_ih"], dtype=np.float32),
                    np.asarray(data[f"{name}_weight_hh"], dtype=np.float32),
                    np.asarray(data[f"{name}_bias"], dtype=np.float32),
                )
            )
        self.dense_w = np.asarray(data["dense_w"], dtype=np.float32)
        self.dense_b = np.asarray(data["dense_b"], dtype=np.float32)
        self.out_w = np.asarray(data["out_w"], dtype=np.float32)
        self.out_b = np.asarray(data["out_b"], dtype=np.float32)

    def logits(self, x: np.ndarray) -> np.ndarray:
        y = _lstm_relu(x, *self.layers[0], return_sequences=True)
        y = _lstm_relu(y, *self.layers[1], return_sequences=True)
        y = _lstm_relu(y, *self.layers[2], return_sequences=False)
        hidden = np.maximum(0.0, y @ self.dense_w.T + self.dense_b)
        return hidden @ self.out_w.T + self.out_b

    def predict_proba(self, x: np.ndarray) -> np.ndarray:
        z = self.logits(x)
        z = z - z.max(axis=1, keepdims=True)
        exp = np.exp(z)
        return exp / np.clip(exp.sum(axis=1, keepdims=True), 1e-9, None)
