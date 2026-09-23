"""Compute accuracy and F1 for the trained sign model.

Uses the same train/val split as training (seed 42). Prefers the Myanmar
checkpoint when it exists.

Run:
    python evaluate.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
_VENV_PYTHON = _ROOT / ".venv" / "Scripts" / "python.exe"
if _VENV_PYTHON.exists() and Path(sys.executable).resolve() != _VENV_PYTHON.resolve():
    raise SystemExit(subprocess.call([str(_VENV_PYTHON), *sys.argv], cwd=str(_ROOT)))

import numpy as np

from sign_app.classifier import SignClassifier, active_checkpoint
from sign_app.msl_dataset import load_training_set
from sign_app.paths import MSL_CHECKPOINT_PATH, MODELS_DIR
from train import SEED, load_raw_sequences, split_by_class, _split_indices


def _safe_div(num: float, den: float) -> float:
    return float(num / den) if den else 0.0


def classification_report(y_true: np.ndarray, y_pred: np.ndarray, glosses: list[str]) -> dict:
    n = len(y_true)
    k = len(glosses)
    acc = float((y_true == y_pred).mean()) if n else 0.0
    rows = []
    f1s, supports = [], []
    for i, name in enumerate(glosses):
        tp = int(((y_pred == i) & (y_true == i)).sum())
        fp = int(((y_pred == i) & (y_true != i)).sum())
        fn = int(((y_pred != i) & (y_true == i)).sum())
        support = int((y_true == i).sum())
        precision = _safe_div(tp, tp + fp)
        recall = _safe_div(tp, tp + fn)
        f1 = _safe_div(2 * precision * recall, precision + recall)
        rows.append(
            {
                "gloss": name,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "support": support,
                "tp": tp,
                "fp": fp,
                "fn": fn,
            }
        )
        f1s.append(f1)
        supports.append(support)
    macro_f1 = float(np.mean(f1s)) if f1s else 0.0
    total = sum(supports)
    weighted_f1 = float(np.dot(f1s, supports) / total) if total else 0.0
    return {
        "n": n,
        "num_classes": k,
        "accuracy": acc,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "per_class": rows,
    }


def _predict_ids(clf: SignClassifier, sequences) -> np.ndarray:
    index = {name: i for i, name in enumerate(clf.glosses)}
    pred = []
    for seq in sequences:
        ranked = clf.predict(seq, top_k=1)
        pred.append(index[ranked[0][0]] if ranked else -1)
    return np.array(pred, dtype=np.int64)


def _print_report(title: str, report: dict) -> None:
    print(f"\n=== {title} ===")
    print(f"clips={report['n']}  classes={report['num_classes']}")
    print(
        f"Accuracy     {report['accuracy']:.3f}  ({report['accuracy'] * 100:.1f}%)"
    )
    print(f"Macro F1     {report['macro_f1']:.3f}")
    print(f"Weighted F1  {report['weighted_f1']:.3f}")
    print(f"{'sign':<32} {'P':>6} {'R':>6} {'F1':>6} {'n':>4}")
    for row in report["per_class"]:
        name = row["gloss"]
        if len(name) > 30:
            name = name[:27] + "..."
        print(
            f"{name:<32} {row['precision']:6.3f} {row['recall']:6.3f} "
            f"{row['f1']:6.3f} {row['support']:4d}"
        )


def evaluate_split() -> dict:
    ckpt = active_checkpoint()
    clf = SignClassifier(ckpt)
    if clf.is_msl:
        xs, ys, glosses = load_training_set()
        if list(clf.glosses) != list(glosses):
            raise RuntimeError(
                "Checkpoint class names do not match data/msl20. Retrain with train_msl.py."
            )
        train_idx, val_idx = split_by_class(ys, np.random.default_rng(SEED))
    else:
        xs, ys, splits, glosses = load_raw_sequences()
        train_idx, val_idx = _split_indices(ys, splits, np.random.default_rng(SEED))

    x_train = [xs[i] for i in train_idx]
    y_train = ys[train_idx]
    x_val = [xs[i] for i in val_idx]
    y_val = ys[val_idx]

    payload = {
        "checkpoint": str(ckpt),
        "is_msl": clf.is_msl,
        "stored": clf.metrics,
        "train": classification_report(y_train, _predict_ids(clf, x_train), clf.glosses),
        "val": classification_report(y_val, _predict_ids(clf, x_val), clf.glosses),
    }
    print(f"Checkpoint: {ckpt}")
    print(
        "Stored during training: "
        f"train_top1={clf.metrics['train_top1']:.3f}  "
        f"val_top1={clf.metrics['val_top1']:.3f}  "
        f"val_top5={clf.metrics['val_top5']:.3f}"
    )
    _print_report("Training set", payload["train"])
    _print_report("Validation set (held-out clips)", payload["val"])
    print(
        "\nUse validation Accuracy and Macro F1 in the report. "
        "Training scores are usually higher because the model has seen those clips."
    )
    out = MODELS_DIR / (
        "msl20_metrics.json" if clf.is_msl else "wlasl_metrics.json"
    )
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {out}")
    return payload


if __name__ == "__main__":
    evaluate_split()
