from __future__ import annotations

import numpy as np

# MediaPipe Pose indices used in the 165-d frame vector.
# 13 upper-body joints x 3 = 39 features.
POSE_UPPER = (
    0,   # nose
    2,   # left_eye
    5,   # right_eye
    7,   # left_ear
    8,   # right_ear
    11,  # left_shoulder
    12,  # right_shoulder
    13,  # left_elbow
    14,  # right_elbow
    15,  # left_wrist
    16,  # right_wrist
    23,  # left_hip
    24,  # right_hip
)
POSE_NAMES = (
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
)
N_HAND = 21
N_POSE = len(POSE_UPPER)
FEATURE_SIZE = N_HAND * 3 + N_HAND * 3 + N_POSE * 3  # 63 + 63 + 39 = 165
SEQ_LEN = 64
CLIP_SECONDS = 5.0
MODEL_FEATURE_SIZE = FEATURE_SIZE * 2  # coords + frame-to-frame velocity
POSE_SWAP_PAIRS = ((1, 2), (3, 4), (5, 6), (7, 8), (9, 10), (11, 12))


def _landmarks_to_array(landmarks, n: int) -> np.ndarray:
    out = np.zeros((n, 3), dtype=np.float32)
    if not landmarks:
        return out
    for i, lm in enumerate(landmarks[:n]):
        out[i, 0] = lm.x
        out[i, 1] = lm.y
        out[i, 2] = lm.z
    return out


def frame_features(pose_landmarks, left_hand, right_hand) -> np.ndarray:
    left = _landmarks_to_array(left_hand, N_HAND)
    right = _landmarks_to_array(right_hand, N_HAND)
    pose_all = _landmarks_to_array(pose_landmarks, 33)
    pose = pose_all[list(POSE_UPPER)]

    origin = np.zeros(3, dtype=np.float32)
    scale = 1.0
    l_sh = pose_all[11]
    r_sh = pose_all[12]
    if np.any(l_sh) and np.any(r_sh):
        origin = (l_sh + r_sh) / 2.0
        scale = float(np.linalg.norm(l_sh - r_sh)) or 1.0
    else:
        wrists = []
        if np.any(left[0]):
            wrists.append(left[0])
        if np.any(right[0]):
            wrists.append(right[0])
        if wrists:
            origin = np.mean(wrists, axis=0)

    def norm(pts: np.ndarray) -> np.ndarray:
        if not np.any(pts):
            return pts
        return (pts - origin) / max(scale, 1e-6)

    feat = np.concatenate(
        [
            norm(left).reshape(-1),
            norm(right).reshape(-1),
            norm(pose).reshape(-1),
        ]
    )
    return feat.astype(np.float32)


def resample_sequence(seq: np.ndarray, length: int = SEQ_LEN) -> np.ndarray:
    if seq.size == 0:
        return np.zeros((length, FEATURE_SIZE), dtype=np.float32)
    if len(seq) == 1:
        return np.repeat(seq, length, axis=0)
    src = np.linspace(0.0, 1.0, num=len(seq))
    dst = np.linspace(0.0, 1.0, num=length)
    out = np.empty((length, seq.shape[1]), dtype=np.float32)
    for d in range(seq.shape[1]):
        out[:, d] = np.interp(dst, src, seq[:, d])
    return out


def sequence_distance(a: np.ndarray, b: np.ndarray) -> float:
    a = resample_sequence(a)
    b = resample_sequence(b)
    va = a.ravel()
    vb = b.ravel()
    na = np.linalg.norm(va)
    nb = np.linalg.norm(vb)
    if na < 1e-8 or nb < 1e-8:
        return 1.0
    cosine = float(np.dot(va, vb) / (na * nb))
    return 1.0 - cosine


def motion_energy(seq: np.ndarray) -> float:
    if len(seq) < 2:
        return 0.0
    diffs = np.diff(seq, axis=0)
    return float(np.mean(np.linalg.norm(diffs, axis=1)))


SNAPSHOTS = 8
VECTOR_SIZE = FEATURE_SIZE * (5 + SNAPSHOTS)


def with_velocity(seq: np.ndarray) -> np.ndarray:
    vel = np.diff(seq, axis=0, prepend=seq[:1])
    return np.concatenate([seq, vel], axis=1).astype(np.float32)


def mirror_sequence(seq: np.ndarray) -> np.ndarray:
    """Swap left/right and negate x so the same sign works for either camera side."""
    seq = np.asarray(seq, dtype=np.float32)
    left = seq[:, :63].reshape(-1, N_HAND, 3).copy()
    right = seq[:, 63:126].reshape(-1, N_HAND, 3).copy()
    pose = seq[:, 126:165].reshape(-1, N_POSE, 3).copy()
    left[..., 0] *= -1
    right[..., 0] *= -1
    pose[..., 0] *= -1
    left, right = right, left
    for a, b in POSE_SWAP_PAIRS:
        pose[:, [a, b]] = pose[:, [b, a]]
    return np.concatenate(
        [left.reshape(len(seq), 63), right.reshape(len(seq), 63), pose.reshape(len(seq), 39)],
        axis=1,
    ).astype(np.float32)


def to_model_sequence(seq: np.ndarray, length: int = SEQ_LEN) -> np.ndarray:
    seq = np.asarray(seq, dtype=np.float32)
    if seq.ndim != 2:
        raise ValueError("sequence must be (frames, features)")
    if seq.shape[1] != FEATURE_SIZE:
        raise ValueError(
            f"expected {FEATURE_SIZE} features per frame, got {seq.shape[1]}"
        )
    return with_velocity(resample_sequence(seq, length))


def sequence_vector(seq: np.ndarray) -> np.ndarray:
    seq = resample_sequence(seq)
    mean = seq.mean(axis=0)
    std = seq.std(axis=0)
    mx = seq.max(axis=0)
    last = seq[-1]
    vel = np.diff(seq, axis=0).mean(axis=0)
    idx = np.linspace(0, SEQ_LEN - 1, SNAPSHOTS).astype(int)
    snaps = seq[idx].reshape(-1)
    return np.concatenate([mean, std, mx, last, vel, snaps]).astype(np.float32)
