"""Warm Hands AI bridge: the React camera streams frames for live LSTM translation."""

from __future__ import annotations

import asyncio
import os
import sys
import threading
from pathlib import Path

WH_ROOT = Path(os.environ.get("WH_ROOT", Path(__file__).resolve().parent.parent)).resolve()
if not (WH_ROOT / "sign_app").is_dir():
    raise SystemExit(f"Python sign model not found at {WH_ROOT}. Set WH_ROOT.")
sys.path.insert(0, str(WH_ROOT))

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from sign_app.classifier import SignClassifier
from sign_app.languages import get_profile
from sign_app.msl_dataset import display_name
from sign_app.features import CLIP_SECONDS, FEATURE_SIZE
from sign_app.myanmar_grammar import correct_myanmar as correct_labels
from sign_app.landmarks import LandmarkTracker
from sign_app.live import LiveTranslator
from sign_app.phrase import recognize_phrase, split_gloss
from sign_app.setup_assets import ensure_assets

app = FastAPI(title="Warm Hands AI", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_lock = threading.Lock()
_tracker: LandmarkTracker | None = None
_load_error = ""
_classifiers: dict[str, SignClassifier] = {}
MAX_INFER_FRAMES = 24


def _parse_label(label: str) -> dict:
    text = label
    english = label
    if "  (" in label and label.endswith(")"):
        text, rest = label.rsplit("  (", 1)
        english = rest[:-1]
    return {"text": text, "gloss": label, "english": english}


def _startup() -> None:
    global _tracker, _load_error
    try:
        ensure_assets()
        _tracker = LandmarkTracker()
        try:
            correct_labels(["hello"])
        except Exception:
            pass
        _load_error = ""
    except Exception as exc:  # noqa: BLE001
        _load_error = str(exc)


@app.on_event("startup")
def on_startup() -> None:
    _startup()


def _require_ready(language: str = "myanmar") -> tuple[LandmarkTracker, SignClassifier]:
    try:
        profile = get_profile(language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if _load_error or _tracker is None:
        raise HTTPException(status_code=503, detail=_load_error or "Camera tracker is not ready.")
    if not profile.checkpoint.exists():
        raise HTTPException(status_code=503, detail=f"No trained {language} model. Record data, then run: python model.py --live --language {language}")
    with _lock:
        if language not in _classifiers:
            classifier = SignClassifier(profile.checkpoint)
            expected = [display_name(item) for item in profile.glosses()]
            if classifier.glosses != expected:
                raise HTTPException(status_code=503, detail=f"Retrain {language}: checkpoint classes do not match the five signs.")
            _classifiers[language] = classifier
    return _tracker, _classifiers[language]


def _live_step(session: LiveTranslator, data: bytes) -> dict:
    tracker = _tracker
    if tracker is None:
        raise RuntimeError("Camera tracker is not ready.")
    rgb = _decode_image(data)
    if rgb is None:
        return session.snapshot(hands=False)
    rgb = _shrink(rgb)
    if not rgb.flags["C_CONTIGUOUS"]:
        rgb = np.ascontiguousarray(rgb)
    with _lock:
        track = tracker.process(rgb)
    return session.step_features(track.features, track.hands_present)


@app.websocket("/api/live")
async def live(socket: WebSocket, language: str = "myanmar") -> None:
    await socket.accept()
    try:
        _, classifier = _require_ready(language)
    except HTTPException as exc:
        await socket.send_json({"error": exc.detail})
        await socket.close()
        return
    session = LiveTranslator(classifier)
    try:
        while True:
            try:
                message = await asyncio.wait_for(socket.receive(), timeout=0.5)
            except asyncio.TimeoutError:
                payload = session.check_idle()
                await socket.send_json(payload)
                if payload["completed"]:
                    return
                continue
            if message.get("type") == "websocket.disconnect":
                break
            text = message.get("text")
            if text == "reset":
                await socket.send_json(session.reset())
                continue
            if text == "complete":
                await socket.send_json(session.complete())
                return
            data = message.get("bytes")
            if not data:
                continue
            try:
                payload = await asyncio.to_thread(_live_step, session, data)
            except Exception as exc:  # noqa: BLE001
                payload = {**session.snapshot(hands=False), "error": str(exc)}
            await socket.send_json(payload)
            if payload.get("completed"):
                return
    except WebSocketDisconnect:
        return


@app.get("/api/health")
def health(language: str = "myanmar") -> dict:
    try:
        _, classifier = _require_ready(language)
        return {"ok": True, "clip_seconds": CLIP_SECONDS, "language": language,
                "model": classifier.path.name, "is_msl": classifier.is_msl,
                "glosses": [_parse_label(name) for name in classifier.glosses],
                "metrics": classifier.metrics, "error": None}
    except HTTPException as exc:
        if exc.status_code == 400:
            raise
        return {"ok": False, "clip_seconds": CLIP_SECONDS, "language": language, "error": exc.detail}


def _decode_image(data: bytes) -> np.ndarray | None:
    arr = np.frombuffer(data, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        return None
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def _decode_video(data: bytes) -> list[np.ndarray]:
    tmp = Path(os.environ.get("TEMP", ".")) / "warmhands_clip.webm"
    tmp.write_bytes(data)
    cap = cv2.VideoCapture(str(tmp))
    frames: list[np.ndarray] = []
    try:
        if not cap.isOpened():
            return frames
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            frames.append(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    finally:
        cap.release()
        tmp.unlink(missing_ok=True)
    return frames


def _even_sample(items: list, count: int) -> list:
    if len(items) <= count:
        return items
    last = len(items) - 1
    return [items[round(i * last / (count - 1))] for i in range(count)]


def _shrink(rgb: np.ndarray, max_width: int = 320) -> np.ndarray:
    height, width = rgb.shape[:2]
    if width <= max_width:
        return rgb
    scale = max_width / width
    return cv2.resize(rgb, (max_width, max(1, int(height * scale))), interpolation=cv2.INTER_AREA)


def _predict_rgb_frames(frames: list[np.ndarray], language: str = "myanmar") -> dict:
    tracker, classifier = _require_ready(language)
    frames = [_shrink(frame) for frame in _even_sample(frames, MAX_INFER_FRAMES)]
    if len(frames) < 8:
        raise HTTPException(status_code=400, detail="Clip too short. Please sign for the full 5 seconds.")
    features: list[np.ndarray] = []
    hands = 0
    with _lock:
        for rgb in frames:
            if not rgb.flags["C_CONTIGUOUS"]:
                rgb = np.ascontiguousarray(rgb)
            track = tracker.process(rgb)
            if track.features.shape != (FEATURE_SIZE,):
                continue
            features.append(track.features)
            if track.hands_present:
                hands += 1
    if len(features) < 8:
        raise HTTPException(status_code=400, detail="Could not read enough frames from the clip.")
    sequence = np.stack(features)
    if classifier.is_msl:
        sentence, parts = recognize_phrase(classifier, sequence)
        if not parts or not sentence:
            raise HTTPException(status_code=422, detail="No prediction from the sign model.")
        keys = [split_gloss(label)[0] for label, _conf in parts]
        if len(parts) == 1:
            ranked = classifier.predict(sequence, top_k=5)
            alternatives = [{**_parse_label(name), "confidence": conf} for name, conf in ranked]
            top = _parse_label(parts[0][0])
            top["text"] = sentence
        else:
            alternatives = [
                {
                    "text": split_gloss(label)[1],
                    "gloss": label,
                    "english": split_gloss(label)[0],
                    "confidence": conf,
                }
                for label, conf in parts
            ]
            top = {"text": sentence, "gloss": " + ".join(keys), "english": " ".join(keys)}
        confidence = min(conf for _label, conf in parts)
    else:
        ranked = classifier.predict(sequence, top_k=5)
        if not ranked:
            raise HTTPException(status_code=422, detail="No prediction from the sign model.")
        top = _parse_label(ranked[0][0])
        confidence = ranked[0][1]
        alternatives = [{**_parse_label(name), "confidence": conf} for name, conf in ranked]
    if classifier.is_msl:
        grammar = correct_labels([label for label, _conf in parts])
    else:
        grammar = correct_labels([ranked[0][0]])
    return {
        **top,
        "text": grammar,
        "myanmar": grammar,
        "confidence": confidence,
        "hands_ratio": hands / max(len(features), 1),
        "frame_count": len(features),
        "clip_seconds": CLIP_SECONDS,
        "alternatives": alternatives,
        "grammar": grammar,
        "model": classifier.path.name,
    }


@app.post("/api/recognize")
async def recognize(
    language: str = "myanmar",
    frames: list[UploadFile] = File(default=[]),
    video: UploadFile | None = File(default=None),
) -> dict:
    rgb_frames: list[np.ndarray] = []
    if frames:
        for item in _even_sample(frames, MAX_INFER_FRAMES):
            rgb = _decode_image(await item.read())
            if rgb is not None:
                rgb_frames.append(rgb)
    if not rgb_frames and video is not None:
        rgb_frames = _decode_video(await video.read())
    if not rgb_frames:
        raise HTTPException(status_code=400, detail="Send JPEG frames from the 5-second recording.")
    return _predict_rgb_frames(rgb_frames, language)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("WH_AI_PORT", "8000")))
