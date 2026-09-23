from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from mediapipe import Image, ImageFormat
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python.vision import (
    HandLandmarker,
    HandLandmarkerOptions,
    HandLandmarksConnections,
    PoseLandmarker,
    PoseLandmarkerOptions,
    PoseLandmarksConnections,
    RunningMode,
)

from sign_app.features import frame_features
from sign_app.paths import HAND_MODEL_PATH, POSE_MODEL_PATH

HAND_CONNECTIONS = [(c.start, c.end) for c in HandLandmarksConnections.HAND_CONNECTIONS]
POSE_CONNECTIONS = [(c.start, c.end) for c in PoseLandmarksConnections.POSE_LANDMARKS]


@dataclass
class FrameTrack:
    features: np.ndarray
    pose: list
    left_hand: list
    right_hand: list
    hands_present: bool


class LandmarkTracker:
    def __init__(self) -> None:
        self._timestamp_ms = 0
        self.hands = HandLandmarker.create_from_options(
            HandLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(HAND_MODEL_PATH)),
                running_mode=RunningMode.VIDEO,
                num_hands=2,
                min_hand_detection_confidence=0.5,
                min_hand_presence_confidence=0.5,
                min_tracking_confidence=0.5,
            )
        )
        self.pose = PoseLandmarker.create_from_options(
            PoseLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(POSE_MODEL_PATH)),
                running_mode=RunningMode.VIDEO,
                min_pose_detection_confidence=0.5,
                min_pose_presence_confidence=0.5,
                min_tracking_confidence=0.5,
                num_poses=1,
            )
        )

    def close(self) -> None:
        self.hands.close()
        self.pose.close()

    def process(self, rgb: np.ndarray) -> FrameTrack:
        if not rgb.flags["C_CONTIGUOUS"]:
            rgb = np.ascontiguousarray(rgb)
        image = Image(image_format=ImageFormat.SRGB, data=rgb)
        self._timestamp_ms += 33
        hand_result = self.hands.detect_for_video(image, self._timestamp_ms)
        pose_result = self.pose.detect_for_video(image, self._timestamp_ms)

        left, right = [], []
        for landmarks, handedness in zip(hand_result.hand_landmarks, hand_result.handedness):
            label = handedness[0].category_name if handedness else ""
            if label.lower() == "left":
                left = landmarks
            else:
                right = landmarks

        pose = pose_result.pose_landmarks[0] if pose_result.pose_landmarks else []
        feats = frame_features(pose, left, right)
        return FrameTrack(
            features=feats,
            pose=pose,
            left_hand=left,
            right_hand=right,
            hands_present=bool(left or right),
        )
