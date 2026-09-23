"""Turn one 5-second clip into Myanmar text.

The LSTM is trained on one sign at a time. A clip can still hold two
signs. When the whole clip is not a confident single sign, this module
looks for a split where each half is a different confident sign, then
writes the glosses as a sentence.

``please`` followed by a request verb is written with the conjunctive
particle: ကျေးဇူးပြု + ကူညီပါ becomes ကျေးဇူးပြု၍ ကူညီပါ. The particle is
not a sign.
"""

from __future__ import annotations

import re

import numpy as np

# Whole-clip confidence at or above this means "one sign". Two-sign
# clips score lower because the model was trained on a single sign.
_SINGLE_LOCK = 0.90
# Both halves must clear this before a split is accepted. High enough
# that a prefix of one sign is not reported as a second word.
_MIN_SIDE = 0.88
_MIN_MARGIN = 0.18
_SPLIT_LO = 0.35
_SPLIT_HI = 0.65

# Verbs that take ကျေးဇူးပြု၍ when they follow the please sign.
REQUEST_GLOSS_IDS = frozenset({"help", "eat", "drink"})

_GLOSS_LABEL = re.compile(r"^(?P<body>.*?)\s+\((?P<key>[^)]+)\)\s*$")


def split_gloss(label: str) -> tuple[str, str]:
    """Return ``(gloss id, myanmar or display text)`` for a model label."""
    text = str(label).strip()
    match = _GLOSS_LABEL.match(text)
    if match:
        return match.group("key").strip().lower(), match.group("body").strip()
    return text.lower(), text


def realize(labels: list[str]) -> str:
    """Write gloss labels as one Myanmar sentence."""
    parsed = [split_gloss(label) for label in labels]
    parts: list[str] = []
    for index, (key, body) in enumerate(parsed):
        nxt = parsed[index + 1][0] if index + 1 < len(parsed) else ""
        if key == "please" and nxt in REQUEST_GLOSS_IDS and not body.endswith("၍"):
            body = f"{body}၍"
        parts.append(body)
    return " ".join(part for part in parts if part)


def _top2(classifier, seq: np.ndarray) -> tuple[str, float, float]:
    ranked = classifier.predict(seq, top_k=2)
    if not ranked:
        return "", 0.0, 0.0
    gloss, conf = ranked[0]
    second = ranked[1][1] if len(ranked) > 1 else 0.0
    return str(gloss), float(conf), float(second)


def decode_signs(classifier, seq: np.ndarray) -> list[tuple[str, float]]:
    """One gloss, or two when the clip clearly contains two signs."""
    seq = np.asarray(seq, dtype=np.float32)
    gloss, conf, _second = _top2(classifier, seq)
    single = [(gloss, conf)] if gloss else []
    n = len(seq)
    if n < 8 or conf >= _SINGLE_LOCK:
        return single

    best: tuple[float, int, str, float, str, float] | None = None
    start = max(4, int(round(n * _SPLIT_LO)))
    end = min(n - 4, int(round(n * _SPLIT_HI)))
    for split in range(start, end + 1):
        left, left_c, left_2 = _top2(classifier, seq[:split])
        right, right_c, right_2 = _top2(classifier, seq[split:])
        if not left or not right or split_gloss(left)[0] == split_gloss(right)[0]:
            continue
        if left_c < _MIN_SIDE or right_c < _MIN_SIDE:
            continue
        if (left_c - left_2) < _MIN_MARGIN or (right_c - right_2) < _MIN_MARGIN:
            continue
        score = min(left_c, right_c)
        if best is None or score > best[0]:
            best = (score, split, left, left_c, right, right_c)
    if best is None:
        return single
    _score, _split, left, left_c, right, right_c = best
    return [(left, left_c), (right, right_c)]


def recognize_phrase(classifier, seq: np.ndarray) -> tuple[str, list[tuple[str, float]]]:
    """Myanmar sentence plus the glosses that produced it."""
    parts = decode_signs(classifier, seq)
    return realize([gloss for gloss, _conf in parts]), parts
