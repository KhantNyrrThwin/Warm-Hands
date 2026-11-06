"""Warm Hands — MSL 77-sign data collector (camera + live landmarks).

Run on each signer's laptop:

    python collect_data.py

Flow for every sample:  3 s break (get ready)  ->  5 s recording  ->  saved.
With "Continuous" ticked it keeps going (break, record, break, record ...) until
the target for the sign is reached, then moves to the next unfinished sign.

Each sample is saved to   data/msl77/raw/<signer_id>/<sign_id>/<file>.npz
holding the 165-d feature vector per frame (same features the app uses), the raw
MediaPipe hand + pose landmarks, timestamps and all recording details. Nothing
from different signers ever shares a folder, so the three collectors' data can
be merged by just copying folders (see DATA_COLLECTION_GUIDE.md).

Keys:  Space = start   Esc = stop   Ctrl+Z = delete (undo) the last saved sample
"""
from __future__ import annotations

import datetime as dt
import json
import platform
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parent
VENV = ROOT / ".venv" / "Scripts" / "python.exe"
if VENV.exists() and Path(sys.executable).resolve() != VENV.resolve():
    raise SystemExit(subprocess.call([str(VENV), *sys.argv], cwd=str(ROOT)))
sys.path.insert(0, str(ROOT))

import cv2
import mediapipe
import numpy as np
from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QColor, QFont, QImage, QPixmap
from PyQt5.QtWidgets import (
    QApplication, QCheckBox, QComboBox, QFormLayout, QHBoxLayout, QLabel,
    QLineEdit, QListWidget, QListWidgetItem, QMessageBox, QProgressBar,
    QPushButton, QShortcut, QSpinBox, QVBoxLayout, QWidget,
)
from PyQt5.QtGui import QKeySequence

from msl77_signs import (
    BREAK_SECONDS, DATASET_VERSION, MSL77_DIR, RAW_DIR, RECORD_SECONDS,
    SIGN_BY_ID, SIGN_IDS, label,
)
from sign_app.draw import draw_overlay
from sign_app.landmarks import LandmarkTracker
from sign_app.paths import HAND_MODEL_PATH, HAND_MODEL_URL, POSE_MODEL_PATH, POSE_MODEL_URL
from sign_app.setup_assets import _download

SETTINGS_PATH = MSL77_DIR / "collector_settings.json"
SIGNER_RE = re.compile(r"^[a-z0-9_]{2,24}$")
MIN_HAND_RATIO = 0.60   # hands must be visible in >= 60 % of frames, else the take is redone
MIN_FRAMES = 20         # < 4 fps means the laptop is too slow / camera froze


def _points(landmarks, n: int, with_visibility: bool = False) -> np.ndarray:
    out = np.zeros((n, 4 if with_visibility else 3), dtype=np.float32)
    for i, p in enumerate(landmarks[:n] if landmarks else []):
        out[i, 0], out[i, 1], out[i, 2] = p.x, p.y, p.z
        if with_visibility:
            out[i, 3] = getattr(p, "visibility", None) or 0.0
    return out


def _load_settings() -> dict:
    try:
        return json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


class Collector(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Warm Hands — MSL ၇၇ လက်ဟန် ဒေတာစုဆောင်းရန်")
        self.resize(1280, 800)
        self.setStyleSheet("QWidget { font-size: 15px; } QPushButton { padding: 10px; }")
        self.state = "idle"          # idle | break | recording
        self.phase_end = 0.0
        self.rec_start = 0.0
        self.buffer: list[dict] = []
        self.last_saved: Path | None = None
        self.camera = None
        self.tracker = None
        self.cam_size = (0, 0)
        self.fps = 0.0
        self._last_frame_t = None
        settings = _load_settings()

        # ---------- left: camera preview
        self.preview = QLabel("ကင်မရာဖွင့်နေသည်…")
        self.preview.setAlignment(Qt.AlignCenter)
        self.preview.setMinimumSize(720, 540)
        self.preview.setStyleSheet("background: #111; color: white;")

        # ---------- right: controls
        self.signer = QLineEdit(settings.get("signer_id", ""))
        self.signer.setPlaceholderText("English ID, e.g. aung")
        self.signer_name = QLineEdit(settings.get("signer_name", ""))
        self.signer_name.setPlaceholderText("အမည် (optional)")
        self.hand = QComboBox()
        self.hand.addItems(["right", "left"])
        self.hand.setCurrentText(settings.get("dominant_hand", "right"))
        self.laptop = QLineEdit(settings.get("laptop", platform.node()))
        self.camera_index = QSpinBox()
        self.camera_index.setRange(0, 5)
        self.camera_index.setValue(int(settings.get("camera_index", 0)))
        self.target = QSpinBox()
        self.target.setRange(1, 500)
        self.target.setValue(int(settings.get("target", 30)))

        form = QFormLayout()
        form.addRow("Signer ID", self.signer)
        form.addRow("အမည်", self.signer_name)
        form.addRow("လက်သန် (dominant)", self.hand)
        form.addRow("Laptop", self.laptop)
        form.addRow("Camera #", self.camera_index)
        form.addRow("လက်ဟန်တစ်ခုစီ ရိုက်ရန်", self.target)

        self.sign_list = QListWidget()
        self.sign_list.setMinimumHeight(220)
        for sid in SIGN_IDS:
            item = QListWidgetItem(label(sid))
            item.setData(Qt.UserRole, sid)
            self.sign_list.addItem(item)
        self.sign_list.setCurrentRow(int(settings.get("sign_row", 0)))

        self.big_sign = QLabel()
        self.big_sign.setAlignment(Qt.AlignCenter)
        self.big_sign.setWordWrap(True)
        self.big_sign.setStyleSheet("font-size: 30px; font-weight: bold; color: #1b5e9e;")
        self.countdown = QLabel("အဆင်သင့်")
        self.countdown.setAlignment(Qt.AlignCenter)
        self.countdown.setStyleSheet("font-size: 44px; font-weight: bold; color: #dd6600;")
        self.phase_bar = QProgressBar()
        self.phase_bar.setTextVisible(False)
        self.phase_bar.setRange(0, 1000)
        self.progress = QLabel()
        self.progress.setWordWrap(True)
        self.continuous = QCheckBox(f"Continuous — {BREAK_SECONDS:g} s နားပြီး ဆက်ရိုက်ရန်")
        self.continuous.setChecked(True)
        self.auto_next = QCheckBox("ပြည့်လျှင် နောက်လက်ဟန်သို့ အလိုအလျောက်သွားရန်")
        self.auto_next.setChecked(True)
        self.start = QPushButton(f"စရိုက်ရန်  (Space)  —  {BREAK_SECONDS:g}s break + {RECORD_SECONDS:g}s record")
        self.start.setStyleSheet("background: #2e7d32; color: white; font-weight: bold;")
        self.stop = QPushButton("ရပ်ရန် (Esc)")
        self.stop.setEnabled(False)
        self.undo = QPushButton("နောက်ဆုံးဒေတာ ဖျက်ရန် (Ctrl+Z)")
        self.undo.setEnabled(False)
        self.status = QLabel("Signer ID ထည့်ပြီး လက်ဟန်ရွေးကာ စရိုက်ရန်ကို နှိပ်ပါ။")
        self.status.setWordWrap(True)
        self.info = QLabel()
        self.info.setStyleSheet("color: #666; font-size: 13px;")

        side = QVBoxLayout()
        side.addLayout(form)
        side.addWidget(QLabel("လက်ဟန် (၇၇)"))
        side.addWidget(self.sign_list, 1)
        side.addWidget(self.progress)
        buttons = QHBoxLayout()
        buttons.addWidget(self.stop)
        buttons.addWidget(self.undo)
        for w in (self.continuous, self.auto_next, self.start):
            side.addWidget(w)
        side.addLayout(buttons)
        side.addWidget(self.status)
        hint = QLabel("လိမ္မော်/အပြာ = လက်များ · အစိမ်း = ကိုယ်အပေါ်ပိုင်း\n"
                      "ရိုက်နေစဉ် (အနီဘောင်) လက်ဟန်ကို အပြည့်ပြပါ။ အဝါဘောင် = နားချိန်")
        hint.setWordWrap(True)
        hint.setStyleSheet("color: #555; font-size: 13px;")
        side.addWidget(hint)
        side.addWidget(self.info)

        left = QVBoxLayout()
        left.addWidget(self.big_sign)
        left.addWidget(self.preview, 1)
        left.addWidget(self.phase_bar)
        left.addWidget(self.countdown)

        layout = QHBoxLayout(self)
        layout.addLayout(left, 3)
        layout.addLayout(side, 2)

        self.start.clicked.connect(self.begin)
        self.stop.clicked.connect(lambda: self.halt("ရပ်ထားပါသည်။ ရိုက်နေဆဲဒေတာကို မသိမ်းပါ။"))
        self.undo.clicked.connect(self.delete_last)
        QShortcut(QKeySequence("Space"), self, activated=self.begin)
        QShortcut(QKeySequence("Escape"), self, activated=self.stop.click)
        QShortcut(QKeySequence("Ctrl+Z"), self, activated=self.undo.click)
        self.sign_list.currentRowChanged.connect(self.refresh)
        self.signer.textChanged.connect(self.refresh)
        self.target.valueChanged.connect(self.refresh)
        self.camera_index.valueChanged.connect(lambda: QTimer.singleShot(0, self.open_camera))
        self.refresh()

        self.timer = QTimer(self)
        self.timer.timeout.connect(self.tick)
        QTimer.singleShot(0, self.open_camera)

    # ------------------------------------------------------------------ helpers
    def signer_id(self) -> str:
        return self.signer.text().strip().lower()

    def current_sign(self) -> str:
        item = self.sign_list.currentItem()
        return item.data(Qt.UserRole) if item else SIGN_IDS[0]

    def sign_dir(self, sign: str) -> Path:
        return RAW_DIR / self.signer_id() / sign

    def count(self, sign: str) -> int:
        if not SIGNER_RE.match(self.signer_id()):
            return 0
        folder = self.sign_dir(sign)
        return len(list(folder.glob("*.npz"))) if folder.is_dir() else 0

    def refresh(self, *_):
        target = self.target.value()
        total, done = 0, 0
        for row, sid in enumerate(SIGN_IDS):
            n = self.count(sid)
            total += min(n, target)
            done += n >= target
            item = self.sign_list.item(row)
            mark = "✓ " if n >= target else ""
            item.setText(f"{mark}{label(sid)}   {n}/{target}")
            item.setForeground(QColor("#2e7d32") if n >= target else QColor("#000"))
        sid = self.current_sign()
        s = SIGN_BY_ID[sid]
        self.big_sign.setText(f"{s['my']}   ·   {s['en']}")
        self.progress.setText(
            f"ဤလက်ဟန်: <b>{self.count(sid)}/{target}</b> &nbsp;·&nbsp; "
            f"ပြီးသောလက်ဟန်: <b>{done}/77</b> &nbsp;·&nbsp; "
            f"စုစုပေါင်း: <b>{total}/{77 * target}</b>")

    def save_settings(self):
        SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
        SETTINGS_PATH.write_text(json.dumps({
            "signer_id": self.signer_id(), "signer_name": self.signer_name.text().strip(),
            "dominant_hand": self.hand.currentText(), "laptop": self.laptop.text().strip(),
            "camera_index": self.camera_index.value(), "target": self.target.value(),
            "sign_row": self.sign_list.currentRow(),
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    def write_signer_profile(self):
        folder = RAW_DIR / self.signer_id()
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / "signer.json"
        profile = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {
            "signer_id": self.signer_id(), "created_at": dt.datetime.now().isoformat(timespec="seconds")}
        profile.update({
            "signer_name": self.signer_name.text().strip(),
            "dominant_hand": self.hand.currentText(),
            "laptops": sorted(set(profile.get("laptops", [])) | {self.laptop.text().strip()}),
            "updated_at": dt.datetime.now().isoformat(timespec="seconds"),
        })
        path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")

    def set_busy(self, busy: bool):
        for w in (self.signer, self.signer_name, self.hand, self.laptop, self.camera_index,
                  self.target, self.sign_list, self.start):
            w.setEnabled(not busy)
        self.stop.setEnabled(busy)

    # ------------------------------------------------------------------ flow
    def begin(self):
        if self.state != "idle" or self.tracker is None or self.camera is None:
            return
        if not SIGNER_RE.match(self.signer_id()):
            QMessageBox.warning(self, "Signer ID", "Signer ID ကို အင်္ဂလိပ်စာလုံး အသေး / ဂဏန်း / _ "
                                "ဖြင့် ၂-၂၄ လုံး ထည့်ပါ။ (ဥပမာ  aung,  hla_hla,  signer1)")
            return
        if not self.laptop.text().strip():
            self.laptop.setText(platform.node())
        if self.count(self.current_sign()) >= self.target.value() and not self.pick_next_sign():
            self.status.setText("လက်ဟန်အားလုံး ပြည့်ပါပြီ။ ကျေးဇူးတင်ပါသည်။ 🎉")
            return
        self.save_settings()
        self.write_signer_profile()
        self.set_busy(True)
        self.start_break()

    def start_break(self):
        self.state = "break"
        self.phase_end = time.monotonic() + BREAK_SECONDS
        self.buffer = []
        self.refresh()
        self.status.setText(f"နားပါ / အသင့်ပြင်ပါ — နောက်တစ်ခု: {SIGN_BY_ID[self.current_sign()]['my']}")

    def start_recording(self, now: float):
        self.state = "recording"
        self.rec_start = now
        self.phase_end = now + RECORD_SECONDS
        self.buffer = []
        self.status.setText("ယခု လက်ဟန်ပြပါ။ လက်များကို ကင်မရာတွင် မြင်ရအောင်ထားပါ။")

    def halt(self, message: str):
        self.state = "idle"
        self.buffer = []
        self.set_busy(False)
        self.countdown.setText("အဆင်သင့်")
        self.phase_bar.setValue(0)
        self.status.setText(message)
        self.refresh()

    def pick_next_sign(self) -> bool:
        target, start = self.target.value(), self.sign_list.currentRow()
        for step in range(1, len(SIGN_IDS) + 1):
            row = (start + step) % len(SIGN_IDS)
            if self.count(SIGN_IDS[row]) < target:
                self.sign_list.setCurrentRow(row)
                return True
        return False

    def finish_recording(self):
        frames = self.buffer
        self.buffer = []
        hand_ratio = float(np.mean([f["left_present"] or f["right_present"] for f in frames])) if frames else 0.0
        if len(frames) < MIN_FRAMES:
            self.countdown.setText("✗")
            self.status.setText(f"Frame နည်းလွန်းသည် ({len(frames)})။ ကင်မရာ/laptop နှေးနေသည်။ ထပ်ရိုက်ပါမည်။")
        elif hand_ratio < MIN_HAND_RATIO:
            self.countdown.setText("✗")
            self.status.setText(f"လက်များ {hand_ratio:.0%} သာ မြင်ရသည်။ မသိမ်းပါ — ထပ်ရိုက်ပါမည်။")
        else:
            path = self.save(frames, hand_ratio)
            self.countdown.setText("သိမ်းပြီး ✓")
            self.status.setText(f"Saved: {path.parent.name}/{path.name}  ({len(frames)} frames, hands {hand_ratio:.0%})")
        self.refresh()
        if not self.continuous.isChecked():
            self.state = "idle"
            self.set_busy(False)
            self.phase_bar.setValue(0)
            return
        if self.count(self.current_sign()) >= self.target.value():
            if not self.auto_next.isChecked():
                return self.halt("ဤလက်ဟန် ပြည့်ပါပြီ။ နောက်လက်ဟန်ကို ရွေးပြီး ဆက်ရိုက်ပါ။")
            if not self.pick_next_sign():
                return self.halt("လက်ဟန် ၇၇ ခုလုံး ပြည့်ပါပြီ။ ကျေးဇူးတင်ပါသည်။ 🎉  "
                                 "ယခု  python build_dataset.py export  ဖြင့် zip ထုတ်ပါ။")
        self.start_break()

    def save(self, frames: list[dict], hand_ratio: float) -> Path:
        sign = self.current_sign()
        s = SIGN_BY_ID[sign]
        folder = self.sign_dir(sign)
        folder.mkdir(parents=True, exist_ok=True)
        stamp = dt.datetime.now()
        path = folder / f"{self.signer_id()}__{sign}__{stamp:%Y%m%d-%H%M%S-%f}.npz"
        timestamps = np.array([f["t"] for f in frames], dtype=np.float32)
        duration = float(timestamps[-1] - timestamps[0]) if len(timestamps) > 1 else 0.0
        meta = {
            "dataset_version": DATASET_VERSION,
            "sign_id": sign, "sign_index": s["index"], "sign_my": s["my"], "sign_en": s["en"],
            "signer_id": self.signer_id(), "signer_name": self.signer_name.text().strip(),
            "dominant_hand": self.hand.currentText(),
            "laptop": self.laptop.text().strip(), "hostname": platform.node(),
            "os": f"{platform.system()} {platform.release()}",
            "camera_index": self.camera_index.value(),
            "camera_resolution": list(self.cam_size),
            "record_seconds": RECORD_SECONDS, "break_seconds": BREAK_SECONDS,
            "frames": len(frames), "duration": round(duration, 3),
            "fps": round((len(frames) - 1) / duration, 2) if duration > 0 else 0.0,
            "hand_visible_ratio": round(hand_ratio, 3),
            "left_hand_ratio": round(float(np.mean([f["left_present"] for f in frames])), 3),
            "right_hand_ratio": round(float(np.mean([f["right_present"] for f in frames])), 3),
            "take": self.count(sign) + 1,
            "recorded_at": stamp.isoformat(timespec="seconds"),
            "mediapipe": mediapipe.__version__,
            "features": "165 = left hand 21x3 + right hand 21x3 + 13 pose x3, shoulder-centred & scaled",
        }
        tmp = path.with_suffix(".tmp.npz")
        np.savez_compressed(
            tmp,
            features=np.stack([f["features"] for f in frames]).astype(np.float32),
            timestamps=timestamps,
            left=np.stack([f["left"] for f in frames]),
            right=np.stack([f["right"] for f in frames]),
            pose=np.stack([f["pose"] for f in frames]),
            left_present=np.array([f["left_present"] for f in frames], dtype=bool),
            right_present=np.array([f["right_present"] for f in frames], dtype=bool),
            meta=np.array(json.dumps(meta, ensure_ascii=False)),
        )
        tmp.replace(path)
        self.last_saved = path
        self.undo.setEnabled(True)
        return path

    def delete_last(self):
        path = self.last_saved
        if path is None or not path.exists():
            self.undo.setEnabled(False)
            return
        was_busy = self.state != "idle"
        if was_busy:
            self.halt("")
        # Moved to _deleted (not erased) so a mistake can still be recovered by hand.
        trash = RAW_DIR / "_deleted" / path.parent.parent.name / path.parent.name
        trash.mkdir(parents=True, exist_ok=True)
        shutil.move(str(path), str(trash / path.name))
        self.last_saved = None
        self.undo.setEnabled(False)
        row = SIGN_IDS.index(path.parent.name)
        self.sign_list.setCurrentRow(row)
        self.refresh()
        self.status.setText(f"ဖျက်ပြီး: {path.name}  (data/msl77/raw/_deleted သို့ ရွှေ့ထားသည်)။ "
                            "Space နှိပ်ပြီး ပြန်ရိုက်ပါ။")

    # ------------------------------------------------------------------ camera
    def open_camera(self):
        if self.state != "idle":
            return
        self.timer.stop()
        if self.camera is not None:
            self.camera.release()
            self.camera = None
        try:
            if self.tracker is None:
                _download(HAND_MODEL_URL, HAND_MODEL_PATH)
                _download(POSE_MODEL_URL, POSE_MODEL_PATH)
                self.tracker = LandmarkTracker()
            idx = self.camera_index.value()
            cam = cv2.VideoCapture(idx, cv2.CAP_DSHOW) if sys.platform == "win32" else cv2.VideoCapture(idx)
            if not cam.isOpened():
                cam.release()
                cam = cv2.VideoCapture(idx)
            if not cam.isOpened():
                raise RuntimeError(f"Camera #{idx} ကို ဖွင့်မရပါ။ အခြား camera app များကို ပိတ်ပြီး ထပ်စမ်းပါ။")
            cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.camera = cam
            self.cam_size = (int(cam.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cam.get(cv2.CAP_PROP_FRAME_HEIGHT)))
            self.start.setEnabled(True)
            self.timer.start(10)
        except Exception as exc:
            self.start.setEnabled(False)
            self.status.setText(str(exc))
            QMessageBox.critical(self, "Camera unavailable", str(exc))

    def tick(self):
        try:
            ok, image = self.camera.read()
            if not ok:
                self.halt("ကင်မရာမှ ပုံမရပါ။ ကင်မရာကို စစ်ပြီး ထပ်စမ်းပါ။")
                return
            now = time.monotonic()
            if self._last_frame_t is not None:
                dt_ = now - self._last_frame_t
                self.fps = 0.9 * self.fps + 0.1 * (1.0 / dt_) if dt_ > 0 else self.fps
            self._last_frame_t = now
            track = self.tracker.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

            if self.state == "break":
                remaining = self.phase_end - now
                if remaining <= 0:
                    self.start_recording(now)
                else:
                    self.countdown.setText(f"နားချိန် {int(np.ceil(remaining))}")
                    self.phase_bar.setValue(int(1000 * (1 - remaining / BREAK_SECONDS)))
            if self.state == "recording":
                self.buffer.append({
                    "t": now - self.rec_start,
                    "features": track.features.astype(np.float32).copy(),
                    "left": _points(track.left_hand, 21),
                    "right": _points(track.right_hand, 21),
                    "pose": _points(track.pose, 33, with_visibility=True),
                    "left_present": bool(track.left_hand),
                    "right_present": bool(track.right_hand),
                })
                elapsed = now - self.rec_start
                seen = np.mean([f["left_present"] or f["right_present"] for f in self.buffer])
                self.countdown.setText(f"● REC {elapsed:0.1f}/{RECORD_SECONDS:g}s  · လက် {seen:.0%}")
                self.phase_bar.setValue(int(1000 * min(1.0, elapsed / RECORD_SECONDS)))
                if elapsed >= RECORD_SECONDS:
                    self.finish_recording()

            self.show_frame(image, track)
            self.info.setText(f"{self.cam_size[0]}x{self.cam_size[1]} · {self.fps:4.1f} fps · "
                              f"saving to data/msl77/raw/{self.signer_id() or '?'}")
        except Exception as exc:
            self.timer.stop()
            self.halt(f"Recorder stopped: {exc}. Close and reopen to retry.")
            self.start.setEnabled(False)

    def show_frame(self, image, track):
        # Mirror the preview only (feels like a mirror); saved landmarks keep camera coordinates,
        # exactly like the live translator sees them.
        shown = cv2.flip(image, 1)

        def mirror(points):
            return [SimpleNamespace(x=1.0 - p.x, y=p.y) for p in points]

        preview_track = SimpleNamespace(pose=mirror(track.pose), left_hand=mirror(track.left_hand),
                                        right_hand=mirror(track.right_hand))
        s = SIGN_BY_ID[self.current_sign()]
        hands = "hands OK" if (track.left_hand or track.right_hand) else "SHOW YOUR HANDS"
        phase = {"idle": "READY", "break": "BREAK - get ready", "recording": "RECORDING"}[self.state]
        shown = draw_overlay(shown, preview_track, f"{s['index'] + 1:02d}  {s['en']}",
                             f"{phase} | {hands} | {self.fps:.0f} fps")
        h, w = shown.shape[:2]
        if self.state != "idle":
            color = (0, 0, 230) if self.state == "recording" else (0, 200, 255)
            cv2.rectangle(shown, (0, 0), (w - 1, h - 1), color, 10)
            frac = min(1.0, max(0.0, 1 - (self.phase_end - time.monotonic()) /
                                (RECORD_SECONDS if self.state == "recording" else BREAK_SECONDS)))
            cv2.rectangle(shown, (0, h - 14), (int(w * frac), h), color, -1)
        if self.state == "recording":
            cv2.circle(shown, (w - 30, 115), 12, (0, 0, 255), -1)
        rgb = cv2.cvtColor(shown, cv2.COLOR_BGR2RGB)
        pixmap = QPixmap.fromImage(QImage(rgb.data, w, h, rgb.strides[0], QImage.Format_RGB888).copy())
        self.preview.setPixmap(pixmap.scaled(self.preview.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation))

    def closeEvent(self, event):
        self.timer.stop()
        if self.state != "idle":
            self.buffer = []
        try:
            self.save_settings()
        except Exception:
            pass
        for closer in (getattr(self.camera, "release", None), getattr(self.tracker, "close", None)):
            try:
                if closer:
                    closer()
            except Exception:
                pass
        event.accept()


def main():
    app = QApplication(sys.argv)
    app.setFont(QFont("Myanmar Text", 11) if sys.platform == "win32" else app.font())
    window = Collector()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
