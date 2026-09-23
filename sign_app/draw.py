from __future__ import annotations

import cv2
import numpy as np

from sign_app.features import POSE_UPPER
from sign_app.landmarks import HAND_CONNECTIONS, POSE_CONNECTIONS


def _pt(lm, w: int, h: int) -> tuple[int, int]:
    return int(lm.x * w), int(lm.y * h)


def _draw_connections(frame, landmarks, connections, color, w, h) -> None:
    if not landmarks:
        return
    for start, end in connections:
        if start >= len(landmarks) or end >= len(landmarks):
            continue
        cv2.line(frame, _pt(landmarks[start], w, h), _pt(landmarks[end], w, h), color, 2)
    for lm in landmarks:
        cv2.circle(frame, _pt(lm, w, h), 3, color, -1)


def draw_overlay(bgr: np.ndarray, track, prediction: str, extra: str) -> np.ndarray:
    frame = bgr.copy()
    h, w = frame.shape[:2]
    _draw_connections(frame, track.pose, POSE_CONNECTIONS, (80, 200, 120), w, h)
    if track.pose:
        for idx in POSE_UPPER:
            if idx < len(track.pose):
                cv2.circle(frame, _pt(track.pose[idx], w, h), 5, (40, 255, 180), -1)
    _draw_connections(frame, track.left_hand, HAND_CONNECTIONS, (40, 180, 255), w, h)
    _draw_connections(frame, track.right_hand, HAND_CONNECTIONS, (255, 160, 40), w, h)

    cv2.rectangle(frame, (0, 0), (w, 86), (18, 18, 18), -1)
    cv2.putText(
        frame,
        prediction or "No match yet",
        (16, 38),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.05,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )
    cv2.putText(
        frame,
        extra,
        (16, 70),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.62,
        (180, 180, 180),
        1,
        cv2.LINE_AA,
    )
    return frame
