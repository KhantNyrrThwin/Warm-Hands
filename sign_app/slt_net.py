"""PyTorch copy of the Sign-Language-Translator Keras LSTM.

Keras ``LSTM(activation='relu')`` uses sigmoid on the three gates and ReLU
on the candidate and on the cell state. PyTorch's built-in LSTM is tanh,
so this module implements the Keras step directly.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
from torch import nn

from sign_app.slt_infer import FRAMES, HAND_FEATURES


class ReluLSTM(nn.Module):
    def __init__(self, input_size: int, hidden_size: int) -> None:
        super().__init__()
        self.hidden_size = hidden_size
        self.weight_ih = nn.Parameter(torch.empty(4 * hidden_size, input_size))
        self.weight_hh = nn.Parameter(torch.empty(4 * hidden_size, hidden_size))
        self.bias = nn.Parameter(torch.empty(4 * hidden_size))
        self.reset_parameters()

    def reset_parameters(self) -> None:
        nn.init.xavier_uniform_(self.weight_ih)
        nn.init.orthogonal_(self.weight_hh)
        with torch.no_grad():
            self.bias.zero_()
            hidden = self.hidden_size
            self.bias[hidden : 2 * hidden].fill_(1.0)

    def forward(self, x: torch.Tensor, return_sequences: bool) -> torch.Tensor:
        batch, steps, _ = x.shape
        hidden = self.hidden_size
        h = x.new_zeros(batch, hidden)
        c = x.new_zeros(batch, hidden)
        outputs = []
        for t in range(steps):
            gates = x[:, t] @ self.weight_ih.T + h @ self.weight_hh.T + self.bias
            i, f, g, o = gates.split(hidden, dim=1)
            i = torch.sigmoid(i)
            f = torch.sigmoid(f)
            o = torch.sigmoid(o)
            g = torch.relu(g)
            c = f * c + i * g
            h = o * torch.relu(c)
            outputs.append(h)
        if return_sequences:
            return torch.stack(outputs, dim=1)
        return h


class SignLSTM(nn.Module):
    """SLT topology: LSTM 32 -> 64 -> 32, Dense 32, Dense classes."""

    def __init__(self, num_classes: int, input_size: int = HAND_FEATURES) -> None:
        super().__init__()
        self.lstm1 = ReluLSTM(input_size, 32)
        self.lstm2 = ReluLSTM(32, 64)
        self.lstm3 = ReluLSTM(64, 32)
        self.dense = nn.Linear(32, 32)
        self.out = nn.Linear(32, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        y = self.lstm1(x, return_sequences=True)
        y = self.lstm2(y, return_sequences=True)
        y = self.lstm3(y, return_sequences=False)
        y = torch.relu(self.dense(y))
        return self.out(y)


def export_numpy(path: Path, model: SignLSTM, mean, std, glosses: list[str], metrics: dict) -> None:
    def arr(value) -> np.ndarray:
        return value.detach().cpu().numpy().astype(np.float32)

    payload = {
        "arch": np.array(f"slt_lstm32_64_32_dense32_k{len(glosses)}"),
        "frames": np.int32(FRAMES),
        "features": np.int32(HAND_FEATURES),
        "mean": np.asarray(mean, dtype=np.float32).reshape(-1),
        "std": np.asarray(std, dtype=np.float32).reshape(-1),
        "glosses": np.array(glosses),
        "lstm1_weight_ih": arr(model.lstm1.weight_ih),
        "lstm1_weight_hh": arr(model.lstm1.weight_hh),
        "lstm1_bias": arr(model.lstm1.bias),
        "lstm2_weight_ih": arr(model.lstm2.weight_ih),
        "lstm2_weight_hh": arr(model.lstm2.weight_hh),
        "lstm2_bias": arr(model.lstm2.bias),
        "lstm3_weight_ih": arr(model.lstm3.weight_ih),
        "lstm3_weight_hh": arr(model.lstm3.weight_hh),
        "lstm3_bias": arr(model.lstm3.bias),
        "dense_w": arr(model.dense.weight),
        "dense_b": arr(model.dense.bias),
        "out_w": arr(model.out.weight),
        "out_b": arr(model.out.bias),
    }
    for key, value in metrics.items():
        payload[key] = np.float32(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez(path, **payload)
