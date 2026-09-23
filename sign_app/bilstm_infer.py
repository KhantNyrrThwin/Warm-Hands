"""NumPy BiLSTM inference. Used by the Qt app so PyQt5 never loads Torch DLLs."""

from __future__ import annotations

from pathlib import Path

import numpy as np

from sign_app.features import MODEL_FEATURE_SIZE


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20.0, 20.0)))


def _lstm_unroll(x: np.ndarray, weight_ih, weight_hh, bias_ih, bias_hh):
    batch, steps, _ = x.shape
    hidden = weight_hh.shape[1]
    h = np.zeros((batch, hidden), dtype=np.float32)
    c = np.zeros((batch, hidden), dtype=np.float32)
    bias = bias_ih + bias_hh
    outs = []
    for t in range(steps):
        gates = x[:, t] @ weight_ih.T + h @ weight_hh.T + bias
        i, f, g, o = np.split(gates, 4, axis=1)
        i, f, o = _sigmoid(i), _sigmoid(f), _sigmoid(o)
        g = np.tanh(g)
        c = f * c + i * g
        h = o * np.tanh(c)
        outs.append(h)
    return np.stack(outs, axis=1), h


def _pack(data, prefix: str):
    return (
        data[f"{prefix}__weight_ih"],
        data[f"{prefix}__weight_hh"],
        data[f"{prefix}__bias_ih"],
        data[f"{prefix}__bias_hh"],
    )


class NumpyBiLSTM:
    def __init__(self, data) -> None:
        self.l0_fwd = _pack(data, "lstm_l0")
        self.l0_bwd = _pack(data, "lstm_l0_reverse")
        self.l1_fwd = _pack(data, "lstm_l1")
        self.l1_bwd = _pack(data, "lstm_l1_reverse")
        self.hidden_w = data["hidden_w"]
        self.hidden_b = data["hidden_b"]
        self.output_w = data["output_w"]
        self.output_b = data["output_b"]

    def logits(self, x: np.ndarray) -> np.ndarray:
        y_f, _ = _lstm_unroll(x, *self.l0_fwd)
        y_b, _ = _lstm_unroll(x[:, ::-1], *self.l0_bwd)
        y0 = np.concatenate([y_f, y_b[:, ::-1]], axis=2)
        _, h1_f = _lstm_unroll(y0, *self.l1_fwd)
        _, h1_b = _lstm_unroll(y0[:, ::-1], *self.l1_bwd)
        h = np.concatenate([h1_f, h1_b], axis=1)
        hidden = np.maximum(0.0, h @ self.hidden_w.T + self.hidden_b)
        return hidden @ self.output_w.T + self.output_b

    def predict_proba(self, x: np.ndarray) -> np.ndarray:
        z = self.logits(x)
        z = z - z.max(axis=1, keepdims=True)
        exp = np.exp(z)
        return exp / np.clip(exp.sum(axis=1, keepdims=True), 1e-9, None)


def state_dict_to_numpy(state: dict) -> dict[str, np.ndarray]:
    def arr(key: str) -> np.ndarray:
        value = state[key]
        return value.detach().cpu().numpy() if hasattr(value, "detach") else np.asarray(value)

    return {
        "lstm_l0__weight_ih": arr("lstm.weight_ih_l0"),
        "lstm_l0__weight_hh": arr("lstm.weight_hh_l0"),
        "lstm_l0__bias_ih": arr("lstm.bias_ih_l0"),
        "lstm_l0__bias_hh": arr("lstm.bias_hh_l0"),
        "lstm_l0_reverse__weight_ih": arr("lstm.weight_ih_l0_reverse"),
        "lstm_l0_reverse__weight_hh": arr("lstm.weight_hh_l0_reverse"),
        "lstm_l0_reverse__bias_ih": arr("lstm.bias_ih_l0_reverse"),
        "lstm_l0_reverse__bias_hh": arr("lstm.bias_hh_l0_reverse"),
        "lstm_l1__weight_ih": arr("lstm.weight_ih_l1"),
        "lstm_l1__weight_hh": arr("lstm.weight_hh_l1"),
        "lstm_l1__bias_ih": arr("lstm.bias_ih_l1"),
        "lstm_l1__bias_hh": arr("lstm.bias_hh_l1"),
        "lstm_l1_reverse__weight_ih": arr("lstm.weight_ih_l1_reverse"),
        "lstm_l1_reverse__weight_hh": arr("lstm.weight_hh_l1_reverse"),
        "lstm_l1_reverse__bias_ih": arr("lstm.bias_ih_l1_reverse"),
        "lstm_l1_reverse__bias_hh": arr("lstm.bias_hh_l1_reverse"),
        "hidden_w": arr("head.0.weight"),
        "hidden_b": arr("head.0.bias"),
        "output_w": arr("head.3.weight"),
        "output_b": arr("head.3.bias"),
    }


def export_numpy_checkpoint(pt_path: Path, npz_path: Path) -> Path:
    import torch

    payload = torch.load(pt_path, map_location="cpu", weights_only=False)
    arrays = state_dict_to_numpy(payload["state_dict"])
    arrays.update(
        mean=np.asarray(payload["mean"], dtype=np.float32),
        std=np.asarray(payload["std"], dtype=np.float32),
        glosses=np.array(list(payload["glosses"]), dtype=object),
        feature_size=np.array(MODEL_FEATURE_SIZE),
        val_top1=np.array(payload.get("val_top1", -1.0)),
        val_top5=np.array(payload.get("val_top5", -1.0)),
        train_top1=np.array(payload.get("train_top1", -1.0)),
    )
    npz_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez(npz_path, **arrays)
    return npz_path
