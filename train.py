"""Train the hospital BiLSTM: isolated 5s clip (T, 330) -> 100 softmax classes."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler

from sign_app.dataset import gloss_list, load_samples
from sign_app.features import (
    FEATURE_SIZE,
    MODEL_FEATURE_SIZE,
    SEQ_LEN,
    mirror_sequence,
    to_model_sequence,
)
from sign_app.lstm_net import HospitalBiLSTM, save_checkpoint
from sign_app.paths import CHECKPOINT_PATH, LANDMARK_DIR, MODELS_DIR

EPOCHS = 80
BATCH = 32
LR = 8e-4
SEED = 42
PATIENCE = 16


def _accuracy(probs: np.ndarray, y: np.ndarray, ks=(1, 5)) -> dict[int, float]:
    order = np.argsort(probs, axis=1)[:, ::-1]
    return {k: float((order[:, :k] == y[:, None]).any(axis=1).mean()) for k in ks}


def load_raw_sequences():
    glosses = gloss_list()
    samples = load_samples()
    xs, ys, splits = [], [], []
    for sample in samples:
        path = Path(sample["landmark_path"])
        if not path.exists():
            continue
        seq = np.load(path)
        if seq.ndim != 2 or len(seq) < 4 or seq.shape[1] != FEATURE_SIZE:
            continue
        xs.append(seq.astype(np.float32))
        ys.append(int(sample["class_id"]))
        splits.append(sample["split"])
    if not xs:
        raise RuntimeError(
            f"No landmarks in {LANDMARK_DIR}. Run download_wlasl.py then extract_landmarks.py."
        )
    return xs, np.array(ys, np.int64), splits, glosses


def _split_indices(y_all, splits, rng):
    splits = np.array(splits)
    train_idx = np.where(splits != "test")[0]
    val_idx = np.where(splits == "test")[0]
    if len(val_idx) < 20:
        return split_by_class(y_all, rng)
    return np.asarray(train_idx), np.asarray(val_idx)


def split_by_class(y_all, rng, val_frac: float = 0.2):
    y_all = np.asarray(y_all)
    train_idx, val_idx = [], []
    for cls in np.unique(y_all):
        idx = rng.permutation(np.where(y_all == cls)[0])
        if len(idx) < 3:
            train_idx.extend(idx.tolist())
            continue
        n_val = max(1, min(len(idx) - 2, int(round(len(idx) * val_frac))))
        val_idx.extend(idx[:n_val].tolist())
        train_idx.extend(idx[n_val:].tolist())
    if not val_idx:
        perm = rng.permutation(len(y_all))
        cut = max(1, int(0.15 * len(perm)))
        return perm[cut:], perm[:cut]
    return np.asarray(train_idx), np.asarray(val_idx)


def augment_raw(seq: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    seq = seq.copy()
    if rng.random() < 0.5:
        seq = mirror_sequence(seq)
    n = len(seq)
    if n >= 8:
        drop = max(1, n // 10)
        start = int(rng.integers(0, drop + 1))
        end = n - int(rng.integers(0, drop + 1))
        if end - start >= 4:
            seq = seq[start:end]
    seq = seq * np.float32(rng.uniform(0.85, 1.15))
    seq = seq + rng.normal(0.0, 0.012, seq.shape).astype(np.float32)
    if rng.random() < 0.25:
        # small time jitter by skipping/repeating a few frames
        idx = np.clip(
            np.round(np.linspace(0, len(seq) - 1, num=len(seq)) + rng.normal(0, 0.4, len(seq))).astype(int),
            0,
            len(seq) - 1,
        )
        seq = seq[idx]
    return seq


class SignClipDataset(Dataset):
    def __init__(self, sequences, labels, mean, std, train: bool, seed: int = 0):
        self.sequences = sequences
        self.labels = np.asarray(labels, dtype=np.int64)
        self.mean = mean
        self.std = std
        self.train = train
        self.rng = np.random.default_rng(seed)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        seq = self.sequences[idx]
        if self.train:
            seq = augment_raw(seq, self.rng)
        x = to_model_sequence(seq)
        x = (x - self.mean) / self.std
        return torch.from_numpy(x), torch.tensor(self.labels[idx], dtype=torch.long)


def _stats(sequences) -> tuple[np.ndarray, np.ndarray]:
    stacked = np.stack([to_model_sequence(seq) for seq in sequences]).astype(np.float32)
    mean = stacked.mean(axis=(0, 1), keepdims=True)
    std = np.clip(stacked.std(axis=(0, 1), keepdims=True), 1e-6, None)
    return mean, std


@torch.no_grad()
def evaluate(model: HospitalBiLSTM, loader: DataLoader, device: torch.device):
    model.eval()
    logits_all, y_all = [], []
    for xb, yb in loader:
        xb = xb.to(device)
        logits_all.append(model(xb).cpu().numpy())
        y_all.append(yb.numpy())
    logits = np.concatenate(logits_all)
    y = np.concatenate(y_all)
    logits = logits - logits.max(axis=1, keepdims=True)
    exp = np.exp(logits)
    probs = exp / np.clip(exp.sum(axis=1, keepdims=True), 1e-9, None)
    return _accuracy(probs, y), float((-(np.log(np.clip(probs[np.arange(len(y)), y], 1e-9, 1.0)))).mean())


def fit_bilstm(
    xs,
    ys,
    glosses: list[str],
    npz_path: Path,
    torch_path: Path | None = None,
    splits=None,
) -> Path:
    rng = np.random.default_rng(SEED)
    torch.manual_seed(SEED)
    if splits is None:
        train_idx, val_idx = split_by_class(ys, rng)
    else:
        train_idx, val_idx = _split_indices(ys, splits, rng)
    x_train = [xs[i] for i in train_idx]
    y_train = ys[train_idx]
    x_val = [xs[i] for i in val_idx]
    y_val = ys[val_idx]
    mean, std = _stats(x_train)
    print(
        f"BiLSTM Input (T, F)=({SEQ_LEN}, {MODEL_FEATURE_SIZE}) classes={len(glosses)} "
        f"train={len(y_train)} val={len(y_val)}",
        flush=True,
    )

    counts = Counter(y_train.tolist())
    missing = [g for i, g in enumerate(glosses) if counts.get(i, 0) == 0]
    if missing:
        raise RuntimeError(f"These signs have no training clips: {', '.join(missing)}")
    sample_w = [1.0 / counts[int(y)] for y in y_train]
    sampler = WeightedRandomSampler(sample_w, num_samples=len(y_train), replacement=True)
    batch = min(BATCH, max(4, len(y_train)))
    train_ds = SignClipDataset(x_train, y_train, mean[0], std[0], train=True, seed=SEED)
    val_ds = SignClipDataset(x_val, y_val, mean[0], std[0], train=False, seed=SEED + 1)
    train_loader = DataLoader(train_ds, batch_size=batch, sampler=sampler)
    val_loader = DataLoader(val_ds, batch_size=batch, shuffle=False)
    eval_train_loader = DataLoader(
        SignClipDataset(x_train, y_train, mean[0], std[0], train=False, seed=SEED + 2),
        batch_size=batch,
        shuffle=False,
    )

    device = torch.device("cpu")
    model = HospitalBiLSTM(num_classes=len(glosses)).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=2e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=EPOCHS)
    class_w = torch.tensor(
        [1.0 / counts.get(i, 1) for i in range(len(glosses))], dtype=torch.float32, device=device
    )
    class_w /= class_w.mean()
    loss_fn = nn.CrossEntropyLoss(weight=class_w, label_smoothing=0.04)

    best = -1.0
    stale = 0
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    for epoch in range(1, EPOCHS + 1):
        model.train()
        losses = []
        for xb, yb in train_loader:
            xb = xb.to(device)
            yb = yb.to(device)
            opt.zero_grad(set_to_none=True)
            logits = model(xb)
            loss = loss_fn(logits, yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            opt.step()
            losses.append(float(loss.item()))
        sched.step()
        val_acc, _ = evaluate(model, val_loader, device)
        train_acc, _ = evaluate(model, eval_train_loader, device)
        print(
            f"epoch {epoch:02d} loss={np.mean(losses):.4f} "
            f"train_top1={train_acc[1]:.3f} val_top1={val_acc[1]:.3f} val_top5={val_acc[5]:.3f}",
            flush=True,
        )
        score = val_acc[1]
        if score >= best:
            best = score
            stale = 0
            save_checkpoint(
                npz_path,
                model,
                mean,
                std,
                glosses,
                {
                    "val_top1": val_acc[1],
                    "val_top5": val_acc[5],
                    "train_top1": train_acc[1],
                    "epoch": epoch,
                },
                torch_path=torch_path,
                npz_path=npz_path,
            )
        else:
            stale += 1
            if stale >= PATIENCE:
                print(f"Early stop at epoch {epoch}; best val_top1={best:.3f}", flush=True)
                break
    print(f"Saved {npz_path} best val_top1={best:.3f}", flush=True)
    return npz_path


def train() -> Path:
    xs, ys, splits, glosses = load_raw_sequences()
    from sign_app.paths import TORCH_CHECKPOINT_PATH

    return fit_bilstm(
        xs,
        ys,
        glosses,
        CHECKPOINT_PATH,
        torch_path=TORCH_CHECKPOINT_PATH,
        splits=splits,
    )


if __name__ == "__main__":
    train()
