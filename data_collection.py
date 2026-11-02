"""Collect hand-landmark sequences for the Sign-Language-Translator LSTM.

Live translation classifies 10 frames taken 120 ms apart. Record the same
kind of window, or the model will not match the camera.

    python data_collection.py --live --language myanmar

Opens the visual recorder with landmarks and a three-second countdown.
Space starts one sequence; Esc cancels the current sample. Record 30
sequences per sign, from slightly different distances and positions. Then:

    python model.py --live --language myanmar
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
_VENV_PYTHON = ROOT / ".venv" / "Scripts" / "python.exe"
if _VENV_PYTHON.exists() and Path(sys.executable).resolve() != _VENV_PYTHON.resolve():
    raise SystemExit(subprocess.call([str(_VENV_PYTHON), *sys.argv], cwd=str(ROOT)))

import cv2
import numpy as np

sys.path.insert(0, str(ROOT))

from sign_app.landmarks import LandmarkTracker
from sign_app.live import FRAME_MS, WINDOW
from sign_app.msl_dataset import gloss_ids, load_glosses, load_samples
from sign_app.paths import LSTM_DATA_DIR, LSTM_LIVE_DIR
from sign_app.setup_assets import ensure_assets
from sign_app.slt_infer import FRAMES, to_slt_sequence


def _sequence_count(action: str, root: Path = LSTM_DATA_DIR) -> int:
    folder = root / action
    if not folder.is_dir():
        return 0
    return sum(1 for path in folder.iterdir() if path.is_dir())


def _save_sequence(
    action: str,
    sequence: np.ndarray,
    index: int | None = None,
    root: Path = LSTM_DATA_DIR,
) -> Path:
    sequence = np.asarray(sequence, dtype=np.float32)
    if sequence.shape != (FRAMES, 126):
        sequence = to_slt_sequence(sequence)
    if index is None:
        index = _sequence_count(action, root)
    folder = root / action / str(index)
    folder.mkdir(parents=True, exist_ok=True)
    for frame, row in enumerate(sequence):
        np.save(folder / str(frame), row)
    return folder


def import_recorded_clips() -> int:
    """Copy existing Warm Hands landmark clips into the LSTM dataset layout."""
    samples = load_samples()
    if not samples:
        raise RuntimeError("No Warm Hands recordings in data/msl20/samples.json.")
    if LSTM_DATA_DIR.exists():
        shutil.rmtree(LSTM_DATA_DIR)
    written = 0
    next_index: dict[str, int] = {}
    for sample in samples:
        path = Path(sample["landmark_path"])
        action = str(sample["gloss"])
        if action not in gloss_ids() or not path.exists():
            continue
        clip = np.load(path)
        if clip.ndim != 2 or clip.shape[1] < 126 or len(clip) < 4:
            continue
        index = next_index.get(action, 0)
        _save_sequence(action, clip, index)
        next_index[action] = index + 1
        written += 1
    print(f"Imported {written} clips into {LSTM_DATA_DIR}", flush=True)
    for action, count in sorted(next_index.items()):
        print(f"  {action}: {count}", flush=True)
    return written


def _window_open(name: str) -> bool:
    try:
        return cv2.getWindowProperty(name, cv2.WND_PROP_VISIBLE) >= 1
    except cv2.error:
        return False


def record(sequences: int, only: str = "") -> None:
    """Record 10-frame windows at the same 120 ms pace the live camera uses."""
    ensure_assets()
    known = {item["id"]: item for item in load_glosses()}
    if only:
        if only not in known:
            raise SystemExit(f"Unknown sign '{only}'. Use an id from the selected language's glosses.json.")
        actions = [only]
    else:
        actions = gloss_ids()
    pending = [(action, _sequence_count(action, LSTM_LIVE_DIR)) for action in actions]
    pending = [(action, have) for action, have in pending if have < sequences]
    if not pending:
        print(f"Every selected sign already has {sequences} sequences in {LSTM_LIVE_DIR}.")
        return
    print("Live-format recording. Each sequence is 10 frames, 120 ms apart.", flush=True)
    print("Vary your distance and position. Space starts a sequence. Esc quits.", flush=True)
    for action, have in pending:
        label = known[action].get("my") or action
        print(f"  {action} ({label}): {have}/{sequences}", flush=True)

    tracker = LandmarkTracker()
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        tracker.close()
        raise SystemExit("Cannot access camera.")

    window = "Camera"
    aborted = False
    interval = FRAME_MS / 1000.0
    try:
        for action, have in pending:
            if aborted:
                break
            label = known[action].get("my") or action
            for sequence in range(have, sequences):
                if aborted:
                    break
                frames: list[np.ndarray] = []
                started = False
                next_at = 0.0
                while len(frames) < WINDOW:
                    ok, image = cap.read()
                    if not ok:
                        continue
                    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                    track = tracker.process(rgb)
                    hands = "hands seen" if track.hands_present else "show your hands"
                    color = (0, 180, 0) if track.hands_present else (0, 0, 255)
                    cv2.putText(
                        image,
                        f"{label}  ({action})   {sequence + 1}/{sequences}",
                        (20, 36),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.8,
                        color,
                        2,
                        cv2.LINE_AA,
                    )
                    if not started:
                        cv2.putText(
                            image,
                            "Press Space, then perform the sign. Esc quits.",
                            (20, 450),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.7,
                            (0, 0, 255),
                            2,
                            cv2.LINE_AA,
                        )
                    else:
                        cv2.putText(
                            image,
                            f"Frame {len(frames)}/{WINDOW}   {hands}",
                            (20, 450),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.8,
                            color,
                            2,
                            cv2.LINE_AA,
                        )
                    cv2.imshow(window, image)
                    key = cv2.waitKey(1) & 0xFF
                    if not _window_open(window) or key == 27:
                        aborted = True
                        break
                    if not started:
                        if key == ord(" "):
                            started = True
                            next_at = time.perf_counter()
                        continue
                    if not track.hands_present or time.perf_counter() < next_at:
                        continue
                    frames.append(track.features[:126].astype(np.float32))
                    next_at += interval
                if aborted or len(frames) < WINDOW:
                    break
                _save_sequence(action, np.stack(frames), sequence, LSTM_LIVE_DIR)
                print(f"Saved {action} {sequence + 1}/{sequences}", flush=True)
    finally:
        cap.release()
        tracker.close()
        cv2.destroyAllWindows()
    print(f"Sequences are in {LSTM_LIVE_DIR}", flush=True)
    print("When every sign has about 30, train with: python model.py --live", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Warm Hands LSTM data collection")
    parser.add_argument(
        "--import-data",
        action="store_true",
        help="Import data/msl20 landmark clips into data/lstm.",
    )
    parser.add_argument("--live", action="store_true", help="Record 10-frame windows for live translation.")
    parser.add_argument("--sign", default="", help="Record one gloss id, for example hello.")
    parser.add_argument("--sequences", type=int, default=30, help="Sequences to store per sign.")
    parser.add_argument("--language", choices=["myanmar", "international"], required=True)
    args = parser.parse_args()
    if args.sequences < 8:
        parser.error("Need at least 8 sequences per sign; 30 or more is recommended.")
    if args.import_data:
        parser.error("Record fresh data with --live.")
    from sign_app.languages import get_profile
    global LSTM_LIVE_DIR, load_glosses, gloss_ids
    profile = get_profile(args.language)
    LSTM_LIVE_DIR = profile.live_dir
    load_glosses = profile.glosses
    gloss_ids = lambda: [item["id"] for item in profile.glosses()]
    if args.import_data:
        import_recorded_clips()
        return
    if not args.live:
        raise SystemExit(
            "The old 5-second clips do not match live translation.\n"
            "Record new 10-frame sequences with:\n\n"
            "    python data_collection.py --live\n"
        )
    from record_dataset import main as open_recorder
    open_recorder(args.language, args.sign.strip(), args.sequences)


if __name__ == "__main__":
    main()
