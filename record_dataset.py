"""Visual recorder for the two presentation datasets. Run: python record_dataset.py."""
from __future__ import annotations

import math
import subprocess
import sys
import time
from pathlib import Path

SIGN_NAMES = {"Mingalarbar":"မင်္ဂလာပါ","Sick":"နေမကောင်း","I":"ကျွန်ုပ်","Headache":"ခေါင်းကိုက်","Help":"ကူညီပါ","Please":"ကျေးဇူးပြု၍","Medicine":"ဆေး"}

ROOT = Path(__file__).resolve().parent
VENV = ROOT / ".venv" / "Scripts" / "python.exe"
if VENV.exists() and Path(sys.executable).resolve() != VENV.resolve():
    raise SystemExit(subprocess.call([str(VENV), *sys.argv], cwd=str(ROOT)))

import cv2
import numpy as np
from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QImage, QPixmap
from PyQt5.QtWidgets import (
    QApplication, QCheckBox, QComboBox, QHBoxLayout, QLabel,
    QMessageBox, QPushButton, QSpinBox, QVBoxLayout, QWidget,
)

from sign_app.draw import draw_overlay
from sign_app.languages import get_profile
from sign_app.landmarks import LandmarkTracker
from sign_app.live import FRAME_MS, WINDOW
from sign_app.setup_assets import ensure_assets


class DatasetRecorder(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Warm Hands — ဒေတာမှတ်တမ်းတင်ရန်")
        self.resize(1180, 760)
        self.setStyleSheet("QWidget { font-size: 16px; } QPushButton { padding: 12px; }")
        self.mode = "idle"
        self.frames = []
        self.deadline = 0.0
        self.next_frame = 0.0
        self.recording_sign = ""
        self.recording_profile = None
        self.camera = None
        self.tracker = None

        self.preview = QLabel("ကင်မရာဖွင့်နေသည်…")
        self.preview.setAlignment(Qt.AlignCenter)
        self.preview.setMinimumSize(640, 480)
        self.preview.setStyleSheet("background: #111; color: white;")
        self.language = QComboBox()
        self.language.addItem("မြန်မာလက်ဟန်ဘာသာစကား", "myanmar")
        self.language.addItem("နိုင်ငံတကာလက်ဟန်ဘာသာစကား", "international")
        self.sign = QComboBox()
        self.target = QSpinBox()
        self.target.setRange(8, 1000)
        self.target.setValue(30)
        self.auto = QCheckBox("နောက်တစ်ကြိမ် အလိုအလျောက် ဆက်ရိုက်ရန်")
        self.counts = QLabel()
        self.counts.setWordWrap(True)
        self.status = QLabel("ဘာသာစကားနှင့် လက်ဟန်ကို ရွေးပြီး စရိုက်ရန်ကို နှိပ်ပါ။")
        self.status.setWordWrap(True)
        self.countdown = QLabel("အဆင်သင့်")
        self.countdown.setAlignment(Qt.AlignCenter)
        self.countdown.setStyleSheet("font-size: 48px; font-weight: bold; color: #dd6600;")
        self.start = QPushButton("စရိုက်ရန် (၃ စက္ကန့် ပြင်ဆင်ချိန်)")
        self.start.setShortcut("Space")
        self.cancel = QPushButton("ပယ်ဖျက်ရန်")
        self.cancel.setShortcut("Escape")
        self.cancel.setEnabled(False)
        side = QVBoxLayout()
        for widget in (QLabel("ဘာသာစကား"), self.language, QLabel("လက်ဟန်"), self.sign,
                       QLabel("လက်ဟန်တစ်ခုစီအတွက် ရိုက်မည့်အရေအတွက်"), self.target, self.counts,
                       self.countdown, self.auto, self.start, self.cancel, self.status):
            side.addWidget(widget)
        hint = QLabel("လိမ္မော်နှင့် အပြာလိုင်းများက လက်များကို ပြသည်။\nအစိမ်းလိုင်းများက ကိုယ်အပေါ်ပိုင်းကို ပြသည်။\nရိုက်နေစဉ် လက်များကို မြင်ရအောင်ထားပါ။\nSpace: စရိုက်ရန် · Esc: ပယ်ဖျက်ရန်")
        hint.setWordWrap(True)
        side.addWidget(hint)
        side.addStretch()
        layout = QHBoxLayout(self)
        layout.addWidget(self.preview, 3)
        layout.addLayout(side, 1)
        self.language.currentIndexChanged.connect(self.change_language)
        self.sign.currentIndexChanged.connect(self.refresh_counts)
        self.target.valueChanged.connect(self.refresh_counts)
        self.start.clicked.connect(self.begin)
        self.cancel.clicked.connect(self.cancel_recording)
        self.change_language()
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.tick)
        QTimer.singleShot(0, self.open_camera)

    def profile(self):
        return get_profile(self.language.currentData())

    def change_language(self):
        self.sign.clear()
        for item in self.profile().glosses():
            self.sign.addItem(SIGN_NAMES.get(item["en"], item["en"]), item["id"])
        self.refresh_counts()

    def sample_dirs(self, profile, sign):
        folder = profile.sign_dir(sign)
        return sorted((p for p in folder.glob("*") if p.is_dir() and p.name.isdigit()),
                      key=lambda p: int(p.name))

    def refresh_counts(self):
        profile = self.profile()
        rows = []
        for item in profile.glosses():
            count = sum(all((p / f"{i}.npy").exists() for i in range(WINDOW))
                        for p in self.sample_dirs(profile, item["id"]))
            rows.append(f"{SIGN_NAMES.get(item['en'], item['en'])}: {count}/{self.target.value()}")
        self.counts.setText("\n".join(rows))

    def set_busy(self, busy):
        for widget in (self.language, self.sign, self.target, self.start):
            widget.setEnabled(not busy)
        self.cancel.setEnabled(busy)

    def begin(self):
        if self.mode != "idle" or self.tracker is None:
            return
        profile = self.profile()
        sign = self.sign.currentData()
        if not sign:
            return
        complete = sum(all((p / f"{i}.npy").exists() for i in range(WINDOW))
                       for p in self.sample_dirs(profile, sign))
        if complete >= self.target.value():
            self.status.setText("သတ်မှတ်အရေအတွက် ပြည့်ပါပြီ။ နောက်လက်ဟန်ကို ရွေးပါ။")
            return
        self.recording_profile = profile
        self.recording_sign = sign
        self.frames = []
        self.mode = "countdown"
        self.deadline = time.monotonic() + 3.0
        self.set_busy(True)
        shared = " ကူညီပါ ဒေတာကို ဘာသာစကားနှစ်ခုလုံးတွင် အသုံးပြုပါမည်။" if sign == "help" else ""
        self.status.setText("နေရာယူပါ။ ၃၊ ၂၊ ၁ ပြီးလျှင် စရိုက်ပါမည်။" + shared)

    def cancel_recording(self):
        self.mode = "idle"
        self.frames = []
        self.set_busy(False)
        self.countdown.setText("အဆင်သင့်")
        self.status.setText("ပယ်ဖျက်ပြီးပါပြီ။ ဒေတာမသိမ်းထားပါ။ ပြန်ရိုက်နိုင်ပါသည်။")

    def open_camera(self):
        try:
            ensure_assets()
            self.tracker = LandmarkTracker()
            self.camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            if not self.camera.isOpened():
                self.camera.release()
                self.camera = cv2.VideoCapture(0)
            if not self.camera.isOpened():
                raise RuntimeError("Could not open webcam. Close other camera apps and retry.")
            self.timer.start(30)
        except Exception as exc:
            self.start.setEnabled(False)
            self.status.setText(str(exc))
            QMessageBox.critical(self, "Camera unavailable", str(exc))

    def save_sample(self):
        existing = self.sample_dirs(self.recording_profile, self.recording_sign)
        index = max((int(p.name) for p in existing), default=-1) + 1
        folder = self.recording_profile.sign_dir(self.recording_sign) / str(index)
        folder.mkdir(parents=True, exist_ok=False)
        try:
            for i, row in enumerate(self.frames):
                np.save(folder / f"{i}.npy", row)
        except Exception:
            for path in folder.glob("*.npy"):
                path.unlink()
            folder.rmdir()
            raise
        self.mode = "idle"
        self.frames = []
        self.set_busy(False)
        self.countdown.setText("သိမ်းပြီး ✓")
        shared = " ဘာသာစကားနှစ်ခုလုံးတွင် အသုံးပြုနိုင်ပါပြီ။" if self.recording_sign == "help" else ""
        self.status.setText(f"Saved {self.recording_sign} sample {index + 1}." + shared)
        self.refresh_counts()
        if self.auto.isChecked():
            self.begin()

    def tick(self):
        try:
            ok, image = self.camera.read()
            if not ok:
                self.cancel_recording()
                self.status.setText("Camera frame unavailable. Check the camera, then retry.")
                return
            track = self.tracker.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            now = time.monotonic()
            if self.mode == "countdown":
                remaining = self.deadline - now
                if remaining > 0:
                    self.countdown.setText(str(math.ceil(remaining)))
                else:
                    self.mode = "recording"
                    self.next_frame = now
            if self.mode == "recording":
                self.countdown.setText(f"REC {len(self.frames)}/{WINDOW}")
                self.status.setText("ယခုလက်ဟန်ပြပါ။ လက်များကို ကင်မရာတွင် မြင်ရအောင်ထားပါ။")
                if not track.hands_present:
                    self.cancel_recording()
                    self.status.setText("လက်များမတွေ့ပါ။ ယခုဒေတာကို မသိမ်းထားပါ။ ပြန်ရိုက်ပါ။")
                elif now >= self.next_frame:
                    self.frames.append(track.features[:126].astype(np.float32).copy())
                    self.next_frame = now + FRAME_MS / 1000.0
                    if len(self.frames) == WINDOW:
                        self.save_sample()
            # Mirror the preview only; training landmarks retain the live model's coordinates.
            shown = cv2.flip(image, 1)
            from types import SimpleNamespace
            def mirror(points):
                return [SimpleNamespace(x=1.0 - p.x, y=p.y) for p in points]
            preview_track = SimpleNamespace(pose=mirror(track.pose),
                                            left_hand=mirror(track.left_hand),
                                            right_hand=mirror(track.right_hand))
            label = self.sign.currentText() or "လက်ဟန်ရွေးပါ"
            hands = "လက်များတွေ့သည်" if track.hands_present else "လက်များပြပါ"
            shown = draw_overlay(shown, preview_track, label,
                                 f"{self.countdown.text()} | {hands}")
            rgb = cv2.cvtColor(shown, cv2.COLOR_BGR2RGB)
            h, w, _ = rgb.shape
            pixmap = QPixmap.fromImage(QImage(rgb.data, w, h, rgb.strides[0], QImage.Format_RGB888).copy())
            self.preview.setPixmap(pixmap.scaled(self.preview.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation))
        except Exception as exc:
            self.cancel_recording()
            self.timer.stop()
            self.start.setEnabled(False)
            self.status.setText(f"Recorder stopped: {exc}. Close and reopen to retry.")

    def closeEvent(self, event):
        self.timer.stop()
        if self.camera is not None:
            self.camera.release()
        if self.tracker is not None:
            self.tracker.close()
        event.accept()


def main(language=None, sign=None, sequences=30):
    app = QApplication(sys.argv)
    window = DatasetRecorder()
    if language:
        window.language.setCurrentIndex(window.language.findData(language))
    if sign:
        index = window.sign.findData(sign)
        if index < 0:
            raise SystemExit(f"Unknown sign: {sign}")
        window.sign.setCurrentIndex(index)
    window.target.setValue(sequences)
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
