"""Train the Sign-Language-Translator LSTM on Warm Hands clips.

Topology (same as that project's ``model.py``):

    Input (10, 126)   # 10 frames, both hands
    LSTM 32, relu, return sequences
    LSTM 64, relu, return sequences
    LSTM 32, relu
    Dense 32, relu
    Dense classes, softmax

Train the live model after recording matching 10-frame windows:

    python data_collection.py --live
    python model.py --live
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
_VENV_PYTHON = _ROOT / ".venv" / "Scripts" / "python.exe"
if _VENV_PYTHON.exists() and Path(sys.executable).resolve() != _VENV_PYTHON.resolve():
    raise SystemExit(subprocess.call([str(_VENV_PYTHON), *sys.argv], cwd=str(_ROOT)))

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from sign_app.msl_dataset import display_name, load_glosses
from sign_app.paths import LSTM_CHECKPOINT_PATH, LSTM_DATA_DIR, LSTM_LIVE_DIR
from sign_app.slt_infer import FRAMES, to_slt_sequence
from sign_app.slt_net import SignLSTM, export_numpy

EPOCHS = 100
BATCH = 16
LR = 1e-3
SEED = 34
PATIENCE = 15


def load_lstm_dataset(data_dir: Path = LSTM_DATA_DIR, min_sequences: int = 8, gloss_rows=None, action_dirs=None):
    if not data_dir.is_dir():
        raise RuntimeError(
            f"No LSTM dataset at {data_dir}. Record with: python data_collection.py --live"
        )
    gloss_rows = gloss_rows or {item["id"]: item for item in load_glosses()}
    actions = list(gloss_rows)
    xs, ys, labels = [], [], []
    for action in actions:
        action_dir = action_dirs[action] if action_dirs is not None else data_dir / action
        if not action_dir.is_dir():
            raise RuntimeError(f"Missing recordings for {action}")
        sequences = []
        for sequence_dir in sorted(path for path in action_dir.iterdir() if path.is_dir()):
            frames = []
            missing = False
            for frame in range(FRAMES):
                path = sequence_dir / f"{frame}.npy"
                if not path.exists():
                    missing = True
                    break
                frames.append(np.load(path))
            if missing or len(frames) != FRAMES:
                continue
            sequence = np.stack(frames).astype(np.float32)
            if sequence.shape != (FRAMES, 126) or not np.isfinite(sequence).all():
                continue
            sequences.append(sequence)
        if len(sequences) < min_sequences:
            raise RuntimeError(f"{action}: need {min_sequences} usable sequences; found {len(sequences)}")
        class_id = len(labels)
        item = gloss_rows.get(action)
        labels.append(display_name(item) if item else action)
        for sequence in sequences:
            xs.append(sequence)
            ys.append(class_id)
    if not xs:
        raise RuntimeError(f"No usable 10-frame sequences in {data_dir}.")
    return np.stack(xs), np.array(ys, np.int64), labels


def _stratified_split(y: np.ndarray, test_size: float = 0.10, seed: int = SEED):
    rng = np.random.default_rng(seed)
    train_idx, test_idx = [], []
    for cls in np.unique(y):
        idx = rng.permutation(np.where(y == cls)[0])
        n_test = max(1, int(round(len(idx) * test_size))) if len(idx) >= 5 else (1 if len(idx) > 2 else 0)
        n_test = min(n_test, len(idx) - 1) if len(idx) > 1 else 0
        test_idx.extend(idx[:n_test].tolist())
        train_idx.extend(idx[n_test:].tolist())
    return np.array(train_idx), np.array(test_idx)


def _accuracy(probs: np.ndarray, y: np.ndarray) -> float:
    return float((probs.argmax(axis=1) == y).mean())


def train(data_dir: Path = LSTM_DATA_DIR, min_sequences: int = 8, checkpoint: Path = LSTM_CHECKPOINT_PATH, gloss_rows=None, action_dirs=None) -> Path:
    torch.manual_seed(SEED)
    x, y, glosses = load_lstm_dataset(data_dir, min_sequences, gloss_rows, action_dirs)
    train_idx, test_idx = _stratified_split(y)
    x_train, y_train = x[train_idx], y[train_idx]
    x_test, y_test = x[test_idx], y[test_idx]
    mean = x_train.mean(axis=(0, 1))
    std = np.clip(x_train.std(axis=(0, 1)), 1e-6, None)
    x_train_n = ((x_train - mean) / std).astype(np.float32)
    x_test_n = ((x_test - mean) / std).astype(np.float32)
    print(
        f"LSTM input (T, F)=({FRAMES}, {x.shape[-1]}) classes={len(glosses)} "
        f"train={len(y_train)} test={len(y_test)}",
        flush=True,
    )

    counts = np.bincount(y_train, minlength=len(glosses)).astype(np.float32)
    weights = torch.tensor(counts.mean() / np.clip(counts, 1, None), dtype=torch.float32)
    device = torch.device("cpu")
    model = SignLSTM(num_classes=len(glosses)).to(device)
    opt = torch.optim.Adam(model.parameters(), lr=LR)
    loss_fn = nn.CrossEntropyLoss(weight=weights)

    train_loader = DataLoader(
        TensorDataset(torch.from_numpy(x_train_n), torch.from_numpy(y_train)),
        batch_size=min(BATCH, len(y_train)),
        shuffle=True,
    )
    best = -1.0
    best_train = 0.0
    stale = 0
    best_state = None
    for epoch in range(1, EPOCHS + 1):
        model.train()
        losses = []
        for xb, yb in train_loader:
            opt.zero_grad(set_to_none=True)
            loss = loss_fn(model(xb), yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            losses.append(float(loss.item()))
        model.eval()
        with torch.no_grad():
            train_probs = torch.softmax(model(torch.from_numpy(x_train_n)), dim=1).numpy()
            test_probs = torch.softmax(model(torch.from_numpy(x_test_n)), dim=1).numpy()
        train_acc = _accuracy(train_probs, y_train)
        test_acc = _accuracy(test_probs, y_test)
        print(
            f"epoch {epoch:03d} loss={np.mean(losses):.4f} train_acc={train_acc:.3f} test_acc={test_acc:.3f}",
            flush=True,
        )
        if test_acc >= best:
            best = test_acc
            best_train = train_acc
            stale = 0
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
        else:
            stale += 1
            if stale >= PATIENCE:
                print(f"Early stop at epoch {epoch}; best test_acc={best:.3f}", flush=True)
                break
    if best_state is not None:
        model.load_state_dict(best_state)
    checkpoint.parent.mkdir(parents=True, exist_ok=True)
    export_numpy(
        checkpoint,
        model,
        mean,
        std,
        glosses,
        {"val_top1": best, "train_top1": best_train},
    )
    torch_path = checkpoint.with_suffix(".pt")
    torch.save({"state_dict": model.state_dict(), "glosses": glosses}, torch_path)
    print(f"Saved {checkpoint} test_acc={best:.3f}", flush=True)
    return checkpoint


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train the Sign-Language-Translator LSTM")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Train on data/lstm_live, the 10-frame recordings that match the camera.",
    )
    parser.add_argument("--language", choices=["myanmar", "international"], required=True)
    args = parser.parse_args()
    from sign_app.languages import get_profile
    profile = get_profile(args.language)
    if args.live:
        train(profile.live_dir, checkpoint=profile.checkpoint,
              gloss_rows={item["id"]: item for item in profile.glosses()},
              action_dirs={item["id"]: profile.sign_dir(item["id"]) for item in profile.glosses()})
    else:
        parser.error("Use --live for the new language datasets.")
