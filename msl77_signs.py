"""The 77 Myanmar Sign Language (MSL) signs for Warm Hands.

Source: "MSL for Warm Hands.xlsx" (Sheet2). The `id` is the folder/file name
used on disk, so never rename an id after data collection has started:
renaming would split one sign into two classes. Add new signs at the end.
"""
from __future__ import annotations

from pathlib import Path

# (id, Myanmar, English, category)
SIGNS: list[tuple[str, str, str, str]] = [
    ("i", "ကျွန်တော်", "I / me", "greeting"),
    ("mingalarbar", "မင်္ဂလာပါ", "Hello", "greeting"),
    ("fine", "ကောင်းပါတယ်", "Fine / good", "greeting"),
    ("not_very_well", "သိပ်မကောင်းဘူး", "Not very well", "greeting"),
    ("not_good", "မကောင်းဘူး", "Not good", "greeting"),
    ("age", "အသက်", "Age", "question"),
    ("how_much", "ဘယ်လောက်", "How much / how many", "question"),
    ("num_0", "0", "Zero", "number"),
    ("num_1", "1", "One", "number"),
    ("num_2", "2", "Two", "number"),
    ("num_3", "3", "Three", "number"),
    ("num_4", "4", "Four", "number"),
    ("num_5", "5", "Five", "number"),
    ("num_6", "6", "Six", "number"),
    ("num_7", "7", "Seven", "number"),
    ("num_8", "8", "Eight", "number"),
    ("num_9", "9", "Nine", "number"),
    ("num_10", "10", "Ten", "number"),
    ("kachin", "ကချင်", "Kachin", "region"),
    ("kayah", "ကယား", "Kayah", "region"),
    ("kayin", "ကရင်", "Kayin", "region"),
    ("chin", "ချင်း", "Chin", "region"),
    ("mon", "မွန်", "Mon", "region"),
    ("rakhine", "ရခိုင်", "Rakhine", "region"),
    ("shan", "ရှမ်း", "Shan", "region"),
    ("sagaing", "စစ်ကိုင်း", "Sagaing", "region"),
    ("mandalay", "မန္တလေး", "Mandalay", "region"),
    ("magway", "မကွေး", "Magway", "region"),
    ("bago", "ပဲခူး", "Bago", "region"),
    ("yangon", "ရန်ကုန်", "Yangon", "region"),
    ("ayeyarwady", "ဧရာဝတီ", "Ayeyarwady", "region"),
    ("tanintharyi", "တနင်္သာရီ", "Tanintharyi", "region"),
    ("naypyidaw", "နေပြည်တော်", "Nay Pyi Taw", "region"),
    ("finished", "ပြီး", "Finished", "time"),
    ("not_finished_yet", "မပြီးသေးဘူး", "Not finished yet", "time"),
    ("doctor", "ဆရာဝန်", "Doctor", "people"),
    ("nurse", "သူနာပြု", "Nurse", "people"),
    ("meet", "တွေ့", "Meet / see", "action"),
    ("go", "သွား (go)", "Go", "action"),
    ("father", "အဖေ", "Father", "family"),
    ("mother", "အမေ", "Mother", "family"),
    ("older_sister", "အစ်မ", "Older sister", "family"),
    ("younger_brother", "ညီ", "Younger brother", "family"),
    ("older_brother", "အစ်ကို", "Older brother", "family"),
    ("tomorrow", "မနက်ဖြန်", "Tomorrow", "time"),
    ("day_after_tomorrow", "သန်ဘက်ခါ", "Day after tomorrow", "time"),
    ("hour", "နာရီ", "Hour / clock", "time"),
    ("time", "အချိန်", "Time", "time"),
    ("ministry_of_health", "ကျန်းမာရေးဝန်ကြီးဌာန", "Ministry of Health", "health"),
    ("severe", "အပြင်းအထန်", "Severe", "health"),
    ("el_nino", "အယ်လ်နီညို", "El Nino", "other"),
    ("hundred", "ဟန်းဒရက်", "Hundred", "number"),
    ("pound", "ပေါင်", "Pound (weight)", "measure"),
    ("stomach_ache", "အစာအိမ်နာ", "Stomach ache", "symptom"),
    ("toothache", "သွားကိုက်", "Toothache", "symptom"),
    ("fever", "အဖျား", "Fever", "symptom"),
    ("cough", "ချောင်းဆိုး", "Cough", "symptom"),
    ("medicine", "ဆေး", "Medicine", "health"),
    ("allergic", "မတည့်", "Allergic / not suitable", "health"),
    ("have", "ရှိတယ်", "Have / there is", "answer"),
    ("dont_have", "မရှိပါ", "Don't have / there isn't", "answer"),
    ("drink", "သောက်", "Drink", "action"),
    ("eat", "စား", "Eat", "action"),
    ("minute", "မိနစ်", "Minute", "time"),
    ("avoid", "ရှောင်", "Avoid", "action"),
    ("disease", "ရောဂါ", "Disease", "health"),
    ("lung", "အဆုတ်", "Lung", "body"),
    ("heart", "နှလုံး", "Heart", "body"),
    ("aids", "AIDS", "AIDS", "disease"),
    ("diarrhea", "ဝမ်းရောဂါ", "Diarrhea", "disease"),
    ("asthma", "ရင်ကြပ်ပန်းနာရောဂါ", "Asthma", "disease"),
    ("brain", "ဦးနှောက်", "Brain", "body"),
    ("throat", "လည်ချောင်း", "Throat", "body"),
    ("muscle", "ကြွက်သား", "Muscle", "body"),
    ("liver", "အသည်း", "Liver", "body"),
    ("small_intestine", "အူသိမ်", "Small intestine", "body"),
    ("large_intestine", "အူမကြီး", "Large intestine", "body"),
]

SIGN_IDS = [s[0] for s in SIGNS]
SIGN_BY_ID = {s[0]: {"index": i, "id": s[0], "my": s[1], "en": s[2], "category": s[3]}
              for i, s in enumerate(SIGNS)}

assert len(SIGNS) == 77, f"expected 77 signs, found {len(SIGNS)}"
assert len(set(SIGN_IDS)) == len(SIGN_IDS), "duplicate sign id"

# ---- Recording settings shared by the collector, the dataset builder and training.
RECORD_SECONDS = 5.0      # length of one sample
BREAK_SECONDS = 3.0       # rest/countdown before each sample
TARGET_FRAMES = 60        # every sample is resampled to this many frames (12 per second)
FEATURE_SIZE = 165        # left hand 63 + right hand 63 + 13 upper-body pose points 39
DATASET_VERSION = "msl77-v1"

ROOT = Path(__file__).resolve().parent
MSL77_DIR = ROOT / "data" / "msl77"
RAW_DIR = MSL77_DIR / "raw"           # one sub-folder per signer: raw/<signer_id>/...
DATASET_DIR = MSL77_DIR / "dataset"   # output of build_dataset.py
EXPORT_DIR = MSL77_DIR / "exports"    # zip files to send to the person who trains
MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "msl77_model.pt"


def label(sign_id: str) -> str:
    s = SIGN_BY_ID[sign_id]
    return f"{s['index'] + 1:02d}. {s['my']}  ({s['en']})"
