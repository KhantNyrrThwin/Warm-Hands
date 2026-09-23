from __future__ import annotations

from collections import defaultdict
from threading import Lock

import numpy as np

from sign_app.features import resample_sequence, sequence_distance
from sign_app.paths import TEMPLATES_PATH


class TemplateStore:
    def __init__(self) -> None:
        self.items: list[tuple[str, np.ndarray]] = []
        self._lock = Lock()
        self.load()

    def load(self) -> None:
        self.items.clear()
        if not TEMPLATES_PATH.exists():
            return
        data = np.load(TEMPLATES_PATH, allow_pickle=True)
        labels = data["labels"].tolist()
        seqs = data["seqs"]
        for label, seq in zip(labels, seqs):
            self.items.append((str(label), np.asarray(seq, dtype=np.float32)))

    def save(self) -> None:
        TEMPLATES_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not self.items:
            if TEMPLATES_PATH.exists():
                TEMPLATES_PATH.unlink()
            return
        labels = np.array([label for label, _ in self.items], dtype=object)
        seqs = np.array([seq for _, seq in self.items], dtype=object)
        np.savez_compressed(TEMPLATES_PATH, labels=labels, seqs=seqs)

    def add(self, gloss: str, sequence: np.ndarray) -> None:
        seq = resample_sequence(np.asarray(sequence, dtype=np.float32))
        with self._lock:
            self.items.append((gloss, seq))
            self.save()

    def delete_gloss(self, gloss: str) -> None:
        with self._lock:
            self.items = [(g, s) for g, s in self.items if g != gloss]
            self.save()

    def counts(self) -> dict[str, int]:
        with self._lock:
            tallies: dict[str, int] = defaultdict(int)
            for gloss, _ in self.items:
                tallies[gloss] += 1
            return dict(sorted(tallies.items()))

    def match(self, sequence: np.ndarray, top_k: int = 3) -> list[tuple[str, float]]:
        if sequence is None or len(sequence) < 8:
            return []
        with self._lock:
            items = list(self.items)
        if not items:
            return []
        scores: dict[str, list[float]] = defaultdict(list)
        for gloss, tmpl in items:
            dist = sequence_distance(sequence, tmpl)
            confidence = max(0.0, 1.0 - dist)
            scores[gloss].append(confidence)
        ranked = sorted(
            ((gloss, float(np.max(vals))) for gloss, vals in scores.items()),
            key=lambda item: item[1],
            reverse=True,
        )
        return ranked[:top_k]
