"""Warm Hands — train the 77-sign MSL recogniser from data/msl77/dataset/msl77_dataset.npz.

    python build_dataset.py build          # first: combine all signers
    python train_model.py                  # random stratified split (70/15/15)
    python train_model.py --val-signer hla # hold one PERSON out: honest "new signer" accuracy
    python train_model.py --all-data       # after you are happy: retrain on 100 % of the data

Model: per-frame MLP -> temporal Conv1d -> 2-layer BiGRU -> attention pooling -> 77 classes.
Input per frame: 165 landmarks + 165 velocities + 2 hand-present flags = 332 values, 60 frames.
Augmentation: left/right mirror, scale/shift, jitter, time shift and speed change.

Outputs (models/):
    msl77_model.pt            weights + labels + normalisation + config (everything to predict)
    msl77_metrics.json        accuracy, per-class / per-signer accuracy, top confusions, history
    msl77_confusion.csv       77 x 77 confusion matrix on the test (or held-out signer) set
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import sys
import time
from collections import Counter
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).resolve().parent))
from msl77_signs import DATASET_DIR, MODEL_PATH, SIGN_BY_ID, SIGN_IDS  # noqa: E402
from sign_app.features import POSE_SWAP_PAIRS  # noqa: E402

N_CLASSES = len(SIGN_IDS)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


# --------------------------------------------------------------------------- features
def mirror_batch(x: torch.Tensor, m: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
    """Swap left/right hands + pose sides and negate x (a left-handed version of the sign)."""
    B, T, _ = x.shape
    left = x[..., :63].reshape(B, T, 21, 3).clone()
    right = x[..., 63:126].reshape(B, T, 21, 3).clone()
    pose = x[..., 126:165].reshape(B, T, 13, 3).clone()
    left[..., 0] *= -1
    right[..., 0] *= -1
    pose[..., 0] *= -1
    for a, b in POSE_SWAP_PAIRS:
        pose[:, :, [a, b]] = pose[:, :, [b, a]]
    out = torch.cat([right.reshape(B, T, 63), left.reshape(B, T, 63), pose.reshape(B, T, 39)], -1)
    return out, m.flip(-1)


def augment(x: torch.Tensor, m: torch.Tensor, p_mirror: float) -> tuple[torch.Tensor, torch.Tensor]:
    B, T, _ = x.shape
    dev = x.device
    flip = torch.rand(B, device=dev) < p_mirror
    if flip.any():
        xf, mf = mirror_batch(x[flip], m[flip])
        x, m = x.clone(), m.clone()
        x[flip], m[flip] = xf, mf
    present = (x != 0).float()                         # never move "missing" zeros
    pts = x.reshape(B, T, 55, 3)
    scale = 1 + 0.12 * (torch.rand(B, 1, 1, 1, device=dev) - 0.5) * 2
    shift = 0.08 * (torch.rand(B, 1, 1, 3, device=dev) - 0.5) * 2
    shift[..., 2] = 0
    pts = pts * scale + shift
    x = pts.reshape(B, T, 165)
    x = (x + 0.01 * torch.randn_like(x)) * present
    # speed change 0.8x-1.2x and time shift of up to +-6 frames (nearest-frame, edges held)
    speed = 0.8 + 0.4 * torch.rand(B, 1, device=dev)
    offset = torch.randint(-6, 7, (B, 1), device=dev).float()
    centre = (T - 1) / 2
    idx = ((torch.arange(T, device=dev).float()[None] - centre) * speed + centre + offset)
    idx = idx.round().clamp(0, T - 1).long()
    x = torch.gather(x, 1, idx[..., None].expand(-1, -1, x.shape[-1]))
    m = torch.gather(m, 1, idx[..., None].expand(-1, -1, m.shape[-1]))
    return x, m


def to_input(x: torch.Tensor, m: torch.Tensor) -> torch.Tensor:
    vel = torch.diff(x, dim=1, prepend=x[:, :1])
    # velocity is meaningless when a hand appears/disappears between frames
    vel[..., :63] *= (m[..., :1] * torch.roll(m[..., :1], 1, 1))
    vel[..., 63:126] *= (m[..., 1:] * torch.roll(m[..., 1:], 1, 1))
    return torch.cat([x, vel, m], dim=-1)


# --------------------------------------------------------------------------- model
class SignNet(nn.Module):
    def __init__(self, in_dim: int = 332, n_classes: int = N_CLASSES, hidden: int = 128, dropout: float = 0.3):
        super().__init__()
        self.frame = nn.Sequential(nn.Linear(in_dim, 2 * hidden), nn.LayerNorm(2 * hidden), nn.GELU(),
                                   nn.Dropout(dropout), nn.Linear(2 * hidden, hidden), nn.GELU())
        self.conv = nn.Sequential(nn.Conv1d(hidden, hidden, 5, padding=2), nn.BatchNorm1d(hidden), nn.GELU())
        self.gru = nn.GRU(hidden, hidden, num_layers=2, batch_first=True, bidirectional=True, dropout=dropout)
        self.attn = nn.Linear(2 * hidden, 1)
        self.head = nn.Sequential(nn.LayerNorm(2 * hidden), nn.Dropout(dropout), nn.Linear(2 * hidden, n_classes))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h = self.frame(x)
        h = h + self.conv(h.transpose(1, 2)).transpose(1, 2)
        h, _ = self.gru(h)
        w = torch.softmax(self.attn(h), dim=1)
        return self.head((w * h).sum(1))


# --------------------------------------------------------------------------- inference helpers
def load_model(path: Path = MODEL_PATH, device: str = "cpu"):
    ck = torch.load(path, map_location=device, weights_only=False)
    model = SignNet(**ck["config"]).to(device).eval()
    model.load_state_dict(ck["state_dict"])
    return model, ck


@torch.no_grad()
def predict(model, ck, features: np.ndarray, hand_mask: np.ndarray, top_k: int = 3):
    """features (60, 165) + hand_mask (60, 2) resampled exactly like build_dataset.py."""
    x = torch.as_tensor(features, dtype=torch.float32)[None]
    m = torch.as_tensor(hand_mask, dtype=torch.float32)[None]
    inp = (to_input(x, m) - torch.as_tensor(ck["mean"])) / torch.as_tensor(ck["std"])
    prob = torch.softmax(model(inp), -1)[0]
    p, i = prob.topk(top_k)
    return [(ck["labels"][j], ck["labels_my"][j], float(q)) for q, j in zip(p.tolist(), i.tolist())]


# --------------------------------------------------------------------------- training
def split(y: np.ndarray, signer: np.ndarray, args, rng: np.random.Generator):
    idx = np.arange(len(y))
    test_frac = 0.15
    if args.val_signer:
        if args.val_signer not in set(signer.tolist()):
            sys.exit(f"--val-signer {args.val_signer!r} not in dataset signers {sorted(set(signer.tolist()))}")
        # test = the unseen person; val (for early stopping) = 15 % of the other signers
        te = idx[signer == args.val_signer]
        idx = idx[signer != args.val_signer]
        test_frac = 0.0
    tr, va, te_ = [], [], []
    for c in np.unique(y[idx]):
        ci = rng.permutation(idx[y[idx] == c])
        n_val = int(round(len(ci) * 0.15)) if len(ci) >= 4 else 0
        n_test = int(round(len(ci) * test_frac)) if len(ci) >= 4 else 0
        va += ci[:n_val].tolist()
        te_ += ci[n_val:n_val + n_test].tolist()
        tr += ci[n_val + n_test:].tolist()
    if args.val_signer:
        te_ = te.tolist()
    return np.array(tr, dtype=int), np.array(va, dtype=int), np.array(te_, dtype=int)


def evaluate(model, X, M, y, mean, std, idx, device, bs=256):
    model.eval()
    preds = []
    with torch.no_grad():
        for s in range(0, len(idx), bs):
            b = idx[s:s + bs]
            x = to_input(X[b].to(device), M[b].to(device))
            preds.append(model((x - mean) / std).argmax(-1).cpu())
    pred = torch.cat(preds).numpy() if preds else np.array([], dtype=int)
    acc = float((pred == y[idx]).mean()) if len(idx) else float("nan")
    return acc, pred


def fit(X, M, y, tr, va, args, device, epochs=None, log=True):
    torch.manual_seed(args.seed)
    with torch.no_grad():  # normalisation statistics from the training set only
        feats = to_input(X[tr], M[tr]).reshape(-1, 332)
        mean = feats.mean(0).to(device)
        std = feats.std(0).clamp_min(1e-3).to(device)
        mean[-2:], std[-2:] = 0, 1   # keep the hand flags as 0/1
    model = SignNet(hidden=args.hidden, dropout=args.dropout).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-3)
    epochs = epochs or args.epochs
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=args.lr, total_steps=epochs * max(1, -(-len(tr) // args.batch)))
    counts = np.bincount(y[tr], minlength=N_CLASSES)
    weight = torch.as_tensor(np.where(counts > 0, counts.sum() / np.maximum(counts, 1) / N_CLASSES, 0),
                             dtype=torch.float32, device=device)
    y_t = torch.as_tensor(y)
    best = (-1.0, 0, None)
    history, bad = [], 0
    for ep in range(1, epochs + 1):
        model.train()
        t0, total, correct, seen = time.time(), 0.0, 0, 0
        order = tr[np.random.permutation(len(tr))]
        for s in range(0, len(order), args.batch):
            b = order[s:s + args.batch]
            xb, mb = X[b].to(device), M[b].to(device)
            xb, mb = augment(xb, mb, args.mirror)
            yb = y_t[b].to(device)
            out = model((to_input(xb, mb) - mean) / std)
            loss = F.cross_entropy(out, yb, weight=weight, label_smoothing=0.1)
            opt.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            sched.step()
            total += loss.item() * len(b)
            correct += (out.argmax(-1) == yb).sum().item()
            seen += len(b)
        va_acc = evaluate(model, X, M, y, mean, std, va, device)[0] if len(va) else float("nan")
        history.append({"epoch": ep, "loss": round(total / seen, 4), "train_acc": round(correct / seen, 4),
                        "val_acc": round(va_acc, 4) if va_acc == va_acc else None})
        if log:
            val = f"{va_acc:.1%}" if len(va) else "-"
            print(f"epoch {ep:3d}  loss {total / seen:.3f}  train {correct / seen:.1%}  "
                  f"val {val}  ({time.time() - t0:.1f}s)")
        if len(va) and va_acc > best[0]:
            best, bad = (va_acc, ep, {k: v.detach().clone() for k, v in model.state_dict().items()}), 0
        elif len(va):
            bad += 1
            if bad >= args.patience:
                if log:
                    print(f"early stop: no val improvement for {args.patience} epochs")
                break
    if best[2] is not None:
        model.load_state_dict(best[2])
    return model, mean, std, history, best[1] or len(history)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default=str(DATASET_DIR / "msl77_dataset.npz"))
    ap.add_argument("--out", default=str(MODEL_PATH))
    ap.add_argument("--val-signer", help="hold this signer out for validation/test")
    ap.add_argument("--all-data", action="store_true", help="after evaluating, retrain on everything")
    ap.add_argument("--epochs", type=int, default=150)
    ap.add_argument("--patience", type=int, default=30)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--lr", type=float, default=2e-3)
    ap.add_argument("--hidden", type=int, default=128)
    ap.add_argument("--dropout", type=float, default=0.3)
    ap.add_argument("--mirror", type=float, default=0.5, help="probability of left/right mirror augmentation")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        sys.exit(f"{data_path} not found. Run:  python build_dataset.py build")
    z = np.load(data_path, allow_pickle=False)
    if list(z["labels"]) != SIGN_IDS:
        sys.exit("Dataset labels differ from msl77_signs.py — rebuild the dataset.")
    y, signer = z["y"], z["signer"]
    X = torch.as_tensor(z["X"], dtype=torch.float32)
    M = torch.as_tensor(z["hand_mask"], dtype=torch.float32)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    rng = np.random.default_rng(args.seed)
    np.random.seed(args.seed)
    print(f"{len(y)} samples · {len(set(y.tolist()))}/77 classes · signers {dict(Counter(signer.tolist()))} · {device}")

    tr, va, te = split(y, signer, args, rng)
    print(f"train {len(tr)} · val {len(va)} · test {len(te)}"
          + (f"  (held-out signer: {args.val_signer})" if args.val_signer else ""))
    model, mean, std, history, best_epoch = fit(X, M, y, tr, va, args, device)

    test_acc, pred = evaluate(model, X, M, y, mean, std, te, device)
    conf = np.zeros((N_CLASSES, N_CLASSES), dtype=int)
    for t, p in zip(y[te], pred):
        conf[t, p] += 1
    per_class = {SIGN_IDS[c]: {"my": SIGN_BY_ID[SIGN_IDS[c]]["my"], "n": int(conf[c].sum()),
                               "acc": round(conf[c, c] / conf[c].sum(), 3)}
                 for c in range(N_CLASSES) if conf[c].sum()}
    per_signer = {sg: round(float((pred[signer[te] == sg] == y[te][signer[te] == sg]).mean()), 3)
                  for sg in sorted(set(signer[te].tolist()))}
    off = conf.copy()
    np.fill_diagonal(off, 0)
    confusions = [{"true": SIGN_IDS[a], "pred": SIGN_IDS[b], "count": int(off[a, b])}
                  for a, b in zip(*np.unravel_index(np.argsort(off, axis=None)[::-1][:15], off.shape))
                  if off[a, b] > 0]
    print(f"\nTEST accuracy: {test_acc:.1%}  (best epoch {best_epoch})")
    print("per signer:", per_signer)
    worst = sorted(per_class.items(), key=lambda kv: kv[1]["acc"])[:10]
    print("weakest signs:", ", ".join(f"{k} {v['acc']:.0%}" for k, v in worst))
    for c in confusions[:8]:
        print(f"  confused {c['true']} -> {c['pred']} x{c['count']}")

    trained_on = "train split"
    if args.all_data:
        print(f"\nRetraining on all {len(y)} samples for {best_epoch} epochs ...")
        everything = np.arange(len(y))
        model, mean, std, _, _ = fit(X, M, y, everything, np.array([], dtype=int), args, device,
                                     epochs=max(best_epoch, 20))
        trained_on = "all data"

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    info_path = data_path.parent / "dataset_info.json"
    dataset_info = json.loads(info_path.read_text(encoding="utf-8")) if info_path.exists() else {}
    metrics = {
        "trained_at": dt.datetime.now().isoformat(timespec="seconds"), "trained_on": trained_on,
        "dataset_built_at": dataset_info.get("built_at"), "samples": int(len(y)),
        "split": {"train": int(len(tr)), "val": int(len(va)), "test": int(len(te)),
                  "held_out_signer": args.val_signer},
        "test_accuracy": round(test_acc, 4), "best_epoch": best_epoch,
        "per_signer_accuracy": per_signer, "per_class": per_class, "top_confusions": confusions,
        "args": vars(args), "history": history,
    }
    torch.save({
        "state_dict": {k: v.cpu() for k, v in model.state_dict().items()},
        "config": {"in_dim": 332, "n_classes": N_CLASSES, "hidden": args.hidden, "dropout": args.dropout},
        "labels": SIGN_IDS, "labels_my": [SIGN_BY_ID[s]["my"] for s in SIGN_IDS],
        "labels_en": [SIGN_BY_ID[s]["en"] for s in SIGN_IDS],
        "mean": mean.cpu().numpy(), "std": std.cpu().numpy(),
        "frames": int(X.shape[1]), "features": "165 coords + 165 velocity + 2 hand flags",
        "metrics": {k: metrics[k] for k in ("test_accuracy", "trained_at", "trained_on", "samples")},
    }, out)
    (out.parent / "msl77_metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    with open(out.parent / "msl77_confusion.csv", "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerow(["true \\ pred"] + SIGN_IDS)
        for c in range(N_CLASSES):
            w.writerow([SIGN_IDS[c]] + conf[c].tolist())
    print(f"\nSaved {out}, {out.parent / 'msl77_metrics.json'}, {out.parent / 'msl77_confusion.csv'}")


if __name__ == "__main__":
    main()
