"""Live sign-to-text, matching Sign-Language-Translator's camera loop.

Every 10 frames of both hands are classified. A sign is appended when its
confidence is at least 0.9 and it is not the same as the previous sign.
The sentence stays at 7 signs. Grammar correction runs when a new sign
is added.
"""

from __future__ import annotations

import numpy as np
import time

from sign_app.myanmar_grammar import correct_myanmar
from sign_app.phrase import split_gloss

WINDOW = 10
FRAME_MS = 120
MIN_CONFIDENCE = 0.9
MAX_SIGNS = 7
SIGN_SECONDS = 5.0


class LiveTranslator:
    def __init__(self, classifier, clock=time.monotonic) -> None:
        self.classifier = classifier
        self.clock = clock
        self.window_started = self.clock()
        self.candidates = []
        self.sign_number = 1
        self.completed = False
        self.keypoints: list[np.ndarray] = []
        self.labels: list[str] = []
        self.last_prediction = ""
        self.grammar = ""
        self.confidence = 0.0
        self.latest = ""

    def reset(self) -> dict:
        self.window_started = self.clock()
        self.candidates = []
        self.sign_number = 1
        self.completed = False
        self.keypoints = []
        self.labels = []
        self.last_prediction = ""
        self.grammar = ""
        self.confidence = 0.0
        self.latest = ""
        return self.snapshot(hands=False)

    def commit_window(self):
        if not self.candidates:
            return False
        scores = {}
        for label, confidence in self.candidates:
            scores[label] = scores.get(label, 0.0) + confidence
        winner = max(scores, key=scores.get)
        self.labels.append(winner)
        self.labels = self.labels[-MAX_SIGNS:]
        self.latest = split_gloss(winner)[0].replace("_", " ")
        self.grammar = correct_myanmar(self.labels)
        return True

    def complete(self) -> dict:
        if not self.completed:
            self.commit_window()
        self.completed = True
        self.keypoints = []
        self.candidates = []
        return self.snapshot(hands=False)

    def check_idle(self) -> dict:
        if not self.completed and self.clock() - self.window_started >= SIGN_SECONDS:
            if not self.commit_window():
                self.completed = True
            self.candidates = []
            self.keypoints = []
            self.window_started = self.clock()
            self.sign_number += 1
        return self.snapshot(hands=False)

    def step_features(self, features: np.ndarray, hands_present: bool) -> dict:
        self.check_idle()
        if self.completed:
            return self.snapshot(hands=False)
        if not hands_present:
            self.keypoints = []
            self.last_prediction = ""
            return self.snapshot(hands=False)
        self.keypoints.append(np.asarray(features, dtype=np.float32))
        if len(self.keypoints) >= WINDOW:
            sequence = np.stack(self.keypoints[:WINDOW])
            self.keypoints = []
            ranked = self.classifier.predict(sequence, top_k=1)
            if ranked:
                label, confidence = ranked[0]
                self.confidence = float(confidence)
                if confidence >= MIN_CONFIDENCE:
                    self.candidates.append((label, float(confidence)))
        return self.snapshot(hands=True)

    def snapshot(self, hands: bool) -> dict:
        return {
            "sentence": self.grammar,
            "grammar": self.grammar,
            "myanmar": self.grammar,
            "latest": self.latest,
            "confidence": self.confidence,
            "hands": hands,
            "buffered": len(self.keypoints),
            "completed": self.completed,
            "sign_remaining": 0.0 if self.completed else max(0.0, SIGN_SECONDS - (self.clock() - self.window_started)),
            "sign_number": self.sign_number,
        }
