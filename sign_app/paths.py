from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
TEMPLATES_PATH = DATA_DIR / "sign_templates.npz"
GLOSSES_PATH = DATA_DIR / "wlasl_glosses.json"
WLASL_JSON_PATH = DATA_DIR / "WLASL_v0.3.json"
VIDEO_DIR = DATA_DIR / "videos"
LANDMARK_DIR = DATA_DIR / "landmarks"
HF_INDEX_PATH = DATA_DIR / "hf_video_index.json"
SAMPLES_PATH = DATA_DIR / "samples.json"
MSL_DIR = DATA_DIR / "msl20"
MSL_GLOSSES_PATH = MSL_DIR / "glosses.json"
MSL_SAMPLES_PATH = MSL_DIR / "samples.json"
MSL_LANDMARK_DIR = MSL_DIR / "landmarks"
MSL_VIDEO_DIR = MSL_DIR / "videos"
MSL_CHECKPOINT_PATH = MODELS_DIR / "msl20_bilstm.npz"
LSTM_DATA_DIR = DATA_DIR / "lstm"
LSTM_LIVE_DIR = DATA_DIR / "lstm_live"
LSTM_CHECKPOINT_PATH = MODELS_DIR / "msl20_lstm.npz"
MSL_TORCH_CHECKPOINT_PATH = MODELS_DIR / "msl20_bilstm.pt"
MSL_TARGET_CLIPS = 30
CHECKPOINT_PATH = MODELS_DIR / "wlasl_hospital100_bilstm.npz"
TORCH_CHECKPOINT_PATH = MODELS_DIR / "wlasl_hospital100_bilstm.pt"
LEGACY_CHECKPOINT_PATH = MODELS_DIR / "wlasl_hospital100_lstm.npz"
CLIP_SECONDS = 5.0
HOSPITAL_GLOSSES_PATH = DATA_DIR / "hospital_glosses.json"
HF_DATASET = "Voxel51/WLASL"

HAND_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"
)
POSE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)
HAND_MODEL_PATH = MODELS_DIR / "hand_landmarker.task"
POSE_MODEL_PATH = MODELS_DIR / "pose_landmarker_lite.task"

DEFAULT_WLASL_ZIP = ROOT / "WLASL_v0.3.json.zip"
NESTED_WLASL_JSON = ROOT / "WLASL_v0.3.json" / "WLASL_v0.3.json"
