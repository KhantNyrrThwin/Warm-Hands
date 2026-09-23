"""WLASL hospital sign detector (webcam).

Isolated sign-to-text pretest: record 5 seconds, then classify the whole
clip with a BiLSTM. This matches the later React flow.

Run:
    .\\.venv\\Scripts\\python.exe app.py
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
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMessageBox,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from sign_app.classifier import SignClassifier, active_checkpoint, available as model_available
from sign_app.draw import draw_overlay
from sign_app.features import CLIP_SECONDS
from sign_app.landmarks import LandmarkTracker
from sign_app.phrase import recognize_phrase, split_gloss
from sign_app.setup_assets import ensure_assets


class CameraThread(QThread):
    frame_ready = pyqtSignal(object, str)
    clip_ready = pyqtSignal(object)
    failed = pyqtSignal(str)

    def __init__(self) -> None:
        super().__init__()
        self._running = True
        self._record = False
        self._clip: list[np.ndarray] = []
        self._started_at = 0.0
        self._lock = Lock()
        self.prediction = ""
        self.status = "Press Record, then sign for 5 seconds."

    def stop(self) -> None:
        self._running = False

    def start_recording(self) -> None:
        with self._lock:
            self._clip = []
            self._started_at = time.time()
            self._record = True
            self.prediction = ""
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
                    with self._lock:
                        self._clip.append(track.features)
                        elapsed = time.time() - self._started_at
                    extra = f"Recording {elapsed:.1f}s / {CLIP_SECONDS:.0f}s — keep signing"
                    self.status = extra
                    if elapsed >= CLIP_SECONDS:
                        with self._lock:
                            self._record = False
                            frames = list(self._clip)
                            self._clip = []
                        clip = np.stack(frames) if frames else None
                        if clip is None or len(clip) < 8:
                            self.status = "Clip too short. Press Record and try again."
                            self.clip_ready.emit(np.zeros((0, 1), np.float32))
                        else:
                            self.status = "Classifying the 5-second clip..."
                            self.clip_ready.emit(clip)
                overlay = draw_overlay(bgr, track, self.prediction, extra)
                display = cv2.flip(overlay, 1)
                self.frame_ready.emit(display, extra)
        finally:
            cap.release()
            tracker.close()


class MainWindow(QWidget):
    def __init__(self, classifier: SignClassifier) -> None:
        super().__init__()
        self.classifier = classifier
        self.msl = classifier.is_msl
        self.setWindowTitle("Myanmar Sign Language detector" if self.msl else "Hospital ASL detector")
        self.resize(1280, 760)
        self.setStyleSheet(
            """
            QWidget { background: #111318; color: #f2f4f8; font-size: 14px; }
            QLineEdit, QListWidget { background: #1c1f27; border: 1px solid #2d3340; }
            QLabel#title { font-size: 20px; font-weight: 700; }
            QLabel#result { font-size: 28px; font-weight: 700; color: #7ee0a6; }
            QPushButton {
                background: #2f6fed; color: white; padding: 10px;
                border: none; font-weight: 700;
            }
            QPushButton:disabled { background: #3a4150; color: #9aa3b2; }
            """
        )

        self.video = QLabel("Opening camera...")
        self.video.setAlignment(Qt.AlignCenter)
        self.video.setMinimumSize(860, 640)
        self.video.setStyleSheet("background:#000; color:#888;")

        self.search = QLineEdit()
        self.search.setPlaceholderText(
            "Search your 20 MSL signs..." if self.msl else "Search the hospital signs..."
        )
        self.gloss_list = QListWidget()
        self.result = QLabel("Text output will appear here")
        self.result.setObjectName("result")
        self.result.setWordWrap(True)
        self.status = QLabel(
            "LSTM sign-to-text: record 5 seconds, then read the sentence."
            if self.msl
            else "BiLSTM isolated-sign pretest: record 5 seconds, then read the gloss."
        )
        self.status.setWordWrap(True)
        self.record_btn = QPushButton("Record 5 seconds")

        side = QVBoxLayout()
        title = QLabel("Myanmar Sign Language" if self.msl else "Hospital / appointment signs")
        title.setObjectName("title")
        side.addWidget(title)
        hint = QLabel(
            "Sign one word in the 5 seconds, or two signs in order. "
            "Please then help is written ကျေးဇူးပြု၍ ကူညီပါ."
            if self.msl
            else "BiLSTM (64×330): whole 5s clip → left hand + right hand + "
            "upper-body pose + velocities."
        )
        if self.msl and getattr(classifier, "kind", "") == "slt":
            hint.setText(
                "LSTM (10×126): both hands over 10 frames, then grammar correction. "
                "Please then help is written ကျေးဇူးပြု၍ ကူညီပါ."
            )
        hint.setWordWrap(True)
        side.addWidget(hint)
        metrics = classifier.metrics
        if metrics.get("val_top1", -1) >= 0:
            score = f"Checkpoint test accuracy {metrics['val_top1']:.0%}"
            if metrics.get("val_top5", -1) >= 0:
                score += f"  top-5 {metrics['val_top5']:.0%}"
            side.addWidget(QLabel(score))
        side.addWidget(self.record_btn)
        side.addWidget(self.result)
        side.addWidget(self.search)
        side.addWidget(self.gloss_list, 3)
        side.addWidget(self.status)

        layout = QHBoxLayout(self)
        layout.addWidget(self.video, 3)
        layout.addLayout(side, 1)

        self.glosses = [{"gloss": name, "samples": ""} for name in classifier.glosses]
        self._fill_glosses("")
        self.search.textChanged.connect(self._fill_glosses)
        self.record_btn.clicked.connect(self._start_record)

        self.cam = CameraThread()
        self.cam.frame_ready.connect(self._on_frame)
        self.cam.clip_ready.connect(self._on_clip)
        self.cam.failed.connect(self._on_fail)
        self.cam.start()

    def _fill_glosses(self, query: str) -> None:
        query = query.strip().lower()
        self.gloss_list.clear()
        for item in self.glosses:
            gloss = item["gloss"]
            if query and query not in gloss.lower():
                continue
            row = QListWidgetItem(gloss)
            row.setData(Qt.UserRole, gloss)
            self.gloss_list.addItem(row)

    def _start_record(self) -> None:
        self.record_btn.setEnabled(False)
        self.result.setText("Recording...")
        self.cam.start_recording()

    def _on_clip(self, seq) -> None:
        self.record_btn.setEnabled(True)
        if seq is None or len(seq) < 8:
            self.result.setText("Clip too short — try again")
            self.cam.prediction = ""
            self.cam.status = "Press Record, then sign for 5 seconds."
            return
        if self.msl:
            sentence, parts = recognize_phrase(self.classifier, seq)
            if not parts or not sentence:
                self.result.setText("No prediction")
                self.cam.prediction = ""
                self.cam.status = "Press Record, then sign for 5 seconds."
                return
            from sign_app.grammar import correct_labels

            detail = "   ".join(
                f"{split_gloss(gloss)[0]} {conf:.0%}" for gloss, conf in parts
            )
            detail = f"{detail}   {correct_labels([gloss for gloss, _conf in parts])}"
            # The green text is the sentence. The camera font cannot draw Myanmar.
            self.result.setText(sentence)
            self.cam.prediction = " + ".join(split_gloss(gloss)[0] for gloss, _conf in parts)
            self.cam.status = detail
            self.status.setText(detail)
            return
        ranked = self.classifier.predict(seq, top_k=5)
        if not ranked:
            self.result.setText("No prediction")
            self.cam.prediction = ""
            self.cam.status = "Press Record, then sign for 5 seconds."
            return
        gloss, conf = ranked[0]
        self.result.setText(f"{gloss.upper()}  ({conf:.0%})")
        extra = "   ".join(f"{g} {c:.0%}" for g, c in ranked)
        self.cam.prediction = f"{gloss.upper()}  {conf:.0%}"
        self.cam.status = extra
        self.status.setText(extra)

    def _on_frame(self, bgr, extra: str) -> None:
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb.shape
        image = QImage(rgb.data, w, h, ch * w, QImage.Format_RGB888).copy()
        self.video.setPixmap(
            QPixmap.fromImage(image).scaled(
                self.video.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation
            )
        )
        self.status.setText(extra)

    def _on_fail(self, message: str) -> None:
        QMessageBox.critical(self, "Camera / model error", message)

    def closeEvent(self, event) -> None:  # noqa: N802
        self.cam.stop()
        self.cam.wait(1500)
        event.accept()


def main() -> None:
    zip_arg = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    ensure_assets(zip_arg)
    if not model_available():
        QApplication(sys.argv)
        QMessageBox.critical(
            None,
            "Model missing",
            "No LSTM checkpoint found. For Myanmar signs run:\n\n"
            "python data_collection.py --import-data\n"
            "python model.py",
        )
        sys.exit(1)
    try:
        classifier = SignClassifier()
    except Exception as exc:  # noqa: BLE001
        QApplication(sys.argv)
        QMessageBox.critical(
            None,
            "Model could not load",
            f"{exc}\n\nRetrain with:\npython train_msl.py\n\nExpected: {active_checkpoint()}",
        )
        sys.exit(1)
    app = QApplication(sys.argv)
    window = MainWindow(classifier)
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
