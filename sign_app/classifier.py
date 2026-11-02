from __future__ import annotations

from pathlib import Path

import numpy as np

from sign_app.paths import CHECKPOINT_PATH, LSTM_CHECKPOINT_PATH, MSL_CHECKPOINT_PATH


def active_checkpoint() -> Path:
    if LSTM_CHECKPOINT_PATH.exists():
        return LSTM_CHECKPOINT_PATH
    if MSL_CHECKPOINT_PATH.exists():
        return MSL_CHECKPOINT_PATH
    return CHECKPOINT_PATH


class SignClassifier:
    def __init__(self, path: Path | None = None) -> None:
        path = path or active_checkpoint()
        data = np.load(path, allow_pickle=True)
        arch = str(data["arch"]) if "arch" in data.files else ""
        self.path = Path(path)
        self.kind = "slt" if arch.startswith("slt_lstm") else "bilstm"
        self.glosses = data["glosses"].tolist()
        self.is_msl = "msl" in self.path.name or "myanmar" in self.path.name
        self.metrics = {
            "val_top1": float(data["val_top1"]) if "val_top1" in data.files else -1.0,
            "val_top5": float(data["val_top5"]) if "val_top5" in data.files else -1.0,
            "train_top1": float(data["train_top1"]) if "train_top1" in data.files else -1.0,
        }
        if self.kind == "slt":
            from sign_app.slt_infer import NumpySLTLSTM

            self.net = NumpySLTLSTM(data)
            self.mean = np.asarray(data["mean"], dtype=np.float32).reshape(1, 1, -1)
            self.std = np.clip(np.asarray(data["std"], dtype=np.float32).reshape(1, 1, -1), 1e-6, None)
            return

        from sign_app.bilstm_infer import NumpyBiLSTM
        from sign_app.features import MODEL_FEATURE_SIZE

        mean = np.asarray(data["mean"], dtype=np.float32)
        std = np.asarray(data["std"], dtype=np.float32)
        if mean.ndim == 1:
            mean = mean[None, :]
            std = std[None, :]
        if mean.ndim == 2:
            mean = mean[None, :, :]
            std = std[None, :, :]
        self.mean = mean
        self.std = np.clip(std, 1e-6, None)
        if int(self.mean.shape[-1]) != MODEL_FEATURE_SIZE:
            raise ValueError(
                f"checkpoint is {self.mean.shape[-1]}-d, expected {MODEL_FEATURE_SIZE}. Retrain with train.py."
            )
        self.net = NumpyBiLSTM(data)

    def predict(
        self,
        seq: np.ndarray,
        top_k: int = 5,
        allowed: set[str] | None = None,
    ) -> list[tuple[str, float]]:
        if self.kind == "slt":
            from sign_app.slt_infer import to_slt_sequence

            x = to_slt_sequence(seq)[None, ...]
        else:
            from sign_app.features import to_model_sequence

            x = to_model_sequence(seq)[None, ...]
        x = (x - self.mean) / self.std
        probs = self.net.predict_proba(x.astype(np.float32))[0]
        if allowed:
            mask = np.array([g in allowed for g in self.glosses])
            probs = np.where(mask, probs, 0.0)
            total = probs.sum()
            if total > 0:
                probs = probs / total
        idx = np.argsort(probs)[::-1][:top_k]
        return [(self.glosses[i], float(probs[i])) for i in idx]


def available() -> bool:
    return active_checkpoint().exists()
