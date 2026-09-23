"""Hospital sign BiLSTM for isolated 5-second clips.

Topology:

    Input (T, 330)  # 165 landmark coords + 165 velocities
    Bidirectional LSTM(128), 2 layers, dropout 0.35
    Concat last forward + last backward hidden states (256)
    Dense(128, ReLU) + Dropout
    Dense(K, softmax)

Unidirectional LSTM was the previous model. Isolated sign-to-text (record
the whole clip, then classify) should use BiLSTM: the full 5s window is
known at prediction time, so future frames help as much as past frames.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
from torch import nn

from sign_app.features import MODEL_FEATURE_SIZE, SEQ_LEN

NUM_CLASSES = 100
T = SEQ_LEN
F = MODEL_FEATURE_SIZE
HIDDEN = 128
NUM_LAYERS = 2
DROPOUT = 0.35
HEAD = 128

keras = None
layers = None


class HospitalBiLSTM(nn.Module):
    def __init__(
        self,
        input_size: int = F,
        hidden: int = HIDDEN,
        num_layers: int = NUM_LAYERS,
        num_classes: int = NUM_CLASSES,
        dropout: float = DROPOUT,
        head: int = HEAD,
    ) -> None:
        super().__init__()
        self.lstm = nn.LSTM(
            input_size,
            hidden,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.head = nn.Sequential(
            nn.Linear(hidden * 2, head),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(head, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        _, (h_n, _) = self.lstm(x)
        h = torch.cat([h_n[-2], h_n[-1]], dim=1)
        return self.head(h)


def build_model(num_classes: int = NUM_CLASSES) -> HospitalBiLSTM:
    return HospitalBiLSTM(num_classes=num_classes)


def save_checkpoint(
    path: Path,
    model: HospitalBiLSTM,
    mean: np.ndarray,
    std: np.ndarray,
    glosses: list[str],
    metrics: dict | None = None,
    torch_path: Path | None = None,
    npz_path: Path | None = None,
) -> None:
    from sign_app.bilstm_infer import export_numpy_checkpoint
    from sign_app.paths import CHECKPOINT_PATH, TORCH_CHECKPOINT_PATH

    payload = {
        "state_dict": model.state_dict(),
        "mean": np.asarray(mean, dtype=np.float32),
        "std": np.asarray(std, dtype=np.float32),
        "glosses": list(glosses),
        "arch": "bilstm128x2_dense128_k%d" % len(glosses),
        "feature_size": int(F),
        "seq_len": int(T),
    }
    if metrics:
        payload.update(metrics)
    torch_path = torch_path or (path if path.suffix == ".pt" else TORCH_CHECKPOINT_PATH)
    npz_path = npz_path or (path if path.suffix == ".npz" else CHECKPOINT_PATH)
    torch_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(payload, torch_path)
    export_numpy_checkpoint(torch_path, npz_path)


def load_checkpoint(path: Path | str, map_location: str = "cpu") -> dict:
    return torch.load(path, map_location=map_location, weights_only=False)
