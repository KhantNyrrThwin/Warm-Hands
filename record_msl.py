"""Record a 20-sign Myanmar Sign Language dataset (5-second clips).

Run:
    python record_msl.py

Edit the sign list in data/msl20/glosses.json before you start.
Aim for about 30 clips of each sign, from more than one person if you can.
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path
from threading import Lock

_ROOT = Path(__file__).resolve().parent
_VENV_PYTHON = _ROOT / ".venv" / "Scripts" / "python.exe"
if _VENV_PYTHON.exists() and Path(sys.executable).resolve() != _VENV_PYTHON.resolve():
    raise SystemExit(subprocess.call([str(_VENV_PYTHON), *sys.argv], cwd=str(_ROOT)))

import cv2
import numpy as np
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QImage, QPixmap
from PyQt5.QtWidgets import (
    QApplication,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QMessageBox,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from sign_app.draw import draw_overlay
from sign_app.features import CLIP_SECONDS, motion_energy
from sign_app.landmarks import LandmarkTracker
from sign_app.msl_dataset import (
    add_clip,
    delete_last,
    display_name,
    load_glosses,
    progress_rows,
)
from sign_app.setup_assets import ensure_assets


class CameraThread(QThread):
    frame_ready = pyqtSignal(object, str)
    clip_ready = pyqtSignal(object, object)
    failed = pyqtSignal(str)

    def __init__(self) -> None:
        super().__init__()
        self._running = True
        self._record = False
        self._clip: list[np.ndarray] = []
        self._frames: list[np.ndarray] = []
        self._started_at = 0.0
        self._lock = Lock()
        self.status = "Select a sign, then press Record 5 seconds."

    def stop(self) -> None:
        self._running = False

    def start_recording(self) -> None:
        with self._lock:
            self._clip = []
            self._frames = []
            self._started_at = time.time()
            self._record = True
            self.status = f"Recording 0.0s / {CLIP_SECONDS:.0f}s"

    def run(self) -> None:
        try:
            tracker = LandmarkTracker()
        except Exception as exc:  # noqa: BLE001
            self.failed.emit(f"Could not load MediaPipe models: {exc}")
            return

        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            tracker.close()
            self.failed.emit("Could not open webcam.")
            return
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        try:
            while self._running:
                ok, bgr = cap.read()
                if not ok:
                    continue
                rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
                track = tracker.process(rgb)
                extra = self.status
                with self._lock:
                    recording = self._record
                if recording:
                    small = cv2.resize(bgr, (480, 360))
                    with self._lock:
                        self._clip.append(track.features)
                        self._frames.append(small)
                        elapsed = time.time() - self._started_at
                    hands = "hands OK" if track.hands_present else "hands not seen"
                    extra = f"Recording {elapsed:.1f}s / {CLIP_SECONDS:.0f}s — {hands}"
                    self.status = extra
                    if elapsed >= CLIP_SECONDS:
                        with self._lock:
                            self._record = False
                            landmarks = list(self._clip)
                            frames = list(self._frames)
                            self._clip = []
                            self._frames = []
                        seq = np.stack(landmarks) if landmarks else np.zeros((0, 1), np.float32)
                        self.clip_ready.emit(seq, frames)
                overlay = draw_overlay(bgr, track, "", extra)
                self.frame_ready.emit(cv2.flip(overlay, 1), extra)
        finally:
            cap.release()
            tracker.close()


class RecorderWindow(QWidget):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("MSL dataset recorder — 20 signs")
        self.resize(1280, 760)
        self.setStyleSheet(
            """
            QWidget { background: #111318; color: #f2f4f8; font-size: 14px; }
            QListWidget { background: #1c1f27; border: 1px solid #2d3340; }
            QLabel#title { font-size: 20px; font-weight: 700; }
            QPushButton {
                background: #2f6fed; color: white; padding: 10px;
                border: none; font-weight: 700;
            }
            QPushButton#danger { background: #8a3040; }
            QPushButton:disabled { background: #3a4150; color: #9aa3b2; }
            """
        )
        self.current_gloss = ""
        self.glosses = load_glosses()

        self.video = QLabel("Opening camera...")
        self.video.setAlignment(Qt.AlignCenter)
        self.video.setMinimumSize(860, 640)
        self.video.setStyleSheet("background:#000; color:#888;")

        self.list = QListWidget()
        self.status = QLabel(
            "Pick a sign. Sign it clearly for 5 seconds. Repeat until the count reaches 30."
        )
        self.status.setWordWrap(True)
        self.record_btn = QPushButton("Record 5 seconds")
        self.undo_btn = QPushButton("Delete last clip of this sign")
        self.undo_btn.setObjectName("danger")

        side = QVBoxLayout()
        title = QLabel("Myanmar Sign Language — record dataset")
        title.setObjectName("title")
        side.addWidget(title)
        side.addWidget(
            QLabel(
                "Same 5-second clip the detector will use later. "
                "Edit data/msl20/glosses.json to change the 20 signs."
            )
        )
        side.addWidget(self.list, 3)
        side.addWidget(self.record_btn)
        side.addWidget(self.undo_btn)
        side.addWidget(self.status)

        layout = QHBoxLayout(self)
        layout.addWidget(self.video, 3)
        layout.addLayout(side, 1)

        self._refresh_list()
        self.list.currentItemChanged.connect(self._on_select)
        self.record_btn.clicked.connect(self._start_record)
        self.undo_btn.clicked.connect(self._undo)
        if self.list.count():
            self.list.setCurrentRow(0)

        self.cam = CameraThread()
        self.cam.frame_ready.connect(self._on_frame)
        self.cam.clip_ready.connect(self._on_clip)
        self.cam.failed.connect(self._on_fail)
        self.cam.start()

    def _refresh_list(self, keep: str | None = None) -> None:
        keep = keep or self.current_gloss
        self.list.clear()
        selected_row = 0
        for i, (item, have, target) in enumerate(progress_rows()):
            mark = "OK" if have >= target else f"{have}/{target}"
            row = QListWidgetItem(f"{display_name(item)}   {mark}")
            row.setData(Qt.UserRole, item["id"])
            self.list.addItem(row)
            if item["id"] == keep:
                selected_row = i
        if self.list.count():
            self.list.setCurrentRow(selected_row)

    def _on_select(self, item: QListWidgetItem | None) -> None:
        if item is None:
            return
        self.current_gloss = item.data(Qt.UserRole)
        self.status.setText(f"Selected: {item.text()}\nFace the camera, hands in view, then Record.")

    def _start_record(self) -> None:
        if not self.current_gloss:
            QMessageBox.information(self, "Pick a sign", "Select a sign on the right first.")
            return
        self.record_btn.setEnabled(False)
        self.cam.start_recording()

    def _on_clip(self, seq, frames) -> None:
        self.record_btn.setEnabled(True)
        if seq is None or len(seq) < 8:
            self.status.setText("Clip too short. Try again.")
            return
        if motion_energy(seq) < 0.0004:
            if QMessageBox.question(
                self,
                "Little movement",
                "That clip looks almost still. Save it anyway?",
            ) != QMessageBox.Yes:
                self.status.setText("Discarded. Record again.")
                return
        try:
            sample = add_clip(self.current_gloss, seq, frames)
        except Exception as exc:  # noqa: BLE001
            QMessageBox.critical(self, "Could not save clip", str(exc))
            return
        self._refresh_list(self.current_gloss)
        self.status.setText(f"Saved {Path(sample['landmark_path']).name}")

    def _undo(self) -> None:
        if not self.current_gloss:
            return
        if delete_last(self.current_gloss):
            self._refresh_list(self.current_gloss)
            self.status.setText(f"Deleted last clip of {self.current_gloss}")
        else:
            self.status.setText("No clips to delete for this sign.")

    def _on_frame(self, bgr, extra: str) -> None:
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb.shape
        image = QImage(rgb.data, w, h, ch * w, QImage.Format_RGB888).copy()
        self.video.setPixmap(
            QPixmap.fromImage(image).scaled(
                self.video.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation
            )
        )
        if not extra.startswith("Recording"):
            return
        self.status.setText(extra)

    def _on_fail(self, message: str) -> None:
        QMessageBox.critical(self, "Camera / model error", message)

    def closeEvent(self, event) -> None:  # noqa: N802
        self.cam.stop()
        self.cam.wait(1500)
        event.accept()


def main() -> None:
    ensure_assets()
    app = QApplication(sys.argv)
    window = RecorderWindow()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
