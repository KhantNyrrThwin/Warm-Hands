"""Live sign-to-text, matching Sign-Language-Translator's camera loop.

Every 10 frames of both hands are classified. A sign is appended when its
confidence is at least 0.9 and it is not the same as the previous sign.
The sentence stays at 7 signs. Grammar correction runs when a new sign
is added.
"""

from __future__ import annotations

import numpy as np

from sign_app.grammar import correct_labels
from sign_app.phrase import realize, split_gloss

WINDOW = 10
FRAME_MS = 120
MIN_CONFIDENCE = 0.9
MAX_SIGNS = 7


def _raw_sentence(labels: list[str]) -> str:
    words = []
    for label in labels:
        key, _body = split_gloss(label)
        words.append(key.replace("_", " "))
    if not words:
        return ""
    words[0] = words[0].capitalize()
    return " ".join(words)


class LiveTranslator:
    def __init__(self, classifier) -> None:
        self.classifier = classifier
        self.keypoints: list[np.ndarray] = []
        self.labels: list[str] = []
        self.last_prediction = ""
        self.grammar = ""
        self.confidence = 0.0
        self.latest = ""

    def reset(self) -> dict:
        self.keypoints = []
        self.labels = []
        self.last_prediction = ""
        self.grammar = ""
        self.confidence = 0.0
        self.latest = ""
        return self.snapshot(hands=False)

    def step_features(self, features: np.ndarray, hands_present: bool) -> dict:
        if not hands_present:
            return self.snapshot(hands=False)
        self.keypoints.append(np.asarray(features, dtype=np.float32))
        added = False
        if len(self.keypoints) >= WINDOW:
            sequence = np.stack(self.keypoints[:WINDOW])
            self.keypoints = []
            ranked = self.classifier.predict(sequence, top_k=1)
            if ranked:
                label, confidence = ranked[0]
                self.confidence = float(confidence)
                if confidence >= MIN_CONFIDENCE and label != self.last_prediction:
                    self.labels.append(label)
                    self.last_prediction = label
                    self.latest = split_gloss(label)[0].replace("_", " ")
                    added = True
        if len(self.labels) > MAX_SIGNS:
            self.labels = self.labels[-MAX_SIGNS:]
        if added:
            self.grammar = correct_labels(self.labels)
        return self.snapshot(hands=True)

    def snapshot(self, hands: bool) -> dict:
        return {
            "sentence": _raw_sentence(self.labels),
            "grammar": self.grammar,
            "myanmar": realize(self.labels),
            "latest": self.latest,
            "confidence": self.confidence,
            "hands": hands,
            "buffered": len(self.keypoints),
        }
