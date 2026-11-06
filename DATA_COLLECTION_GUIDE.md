# MSL 77 — Data collection, combining and training

Three people record the 77 signs (listed in `msl77_signs.py`, taken from *MSL for Warm Hands.xlsx*, Sheet2), each on their own laptop. One person, the **trainer**, combines everything and trains the model.

| File | What it does |
|---|---|
| `msl77_signs.py` | The 77 signs (id, Myanmar, English) and the shared settings: 3 s break, 5 s recording, 60 frames |
| `collect_data.py` | Camera app with live landmarks. Loop: 3 s break, 5 s recording, save |
| `build_dataset.py` | `report` / `export` / `import` / `build`: checks progress, zips data, merges people, builds the dataset with full details |
| `train_model.py` | Trains the 77-class model and saves the model, metrics and confusion matrix |

Each `.py` file has a matching `.bat` that you can double-click on Windows.

---

## 1. Setup (every laptop, once)

```bash
git pull
```

```bash
pip install -r requirements.txt
```

The collector only needs `numpy opencv-python PyQt5 mediapipe`. Only the trainer needs `torch`.

## 2. Record (each person, on their own laptop)

```bash
python collect_data.py
```

1. **Signer ID**: give every person a different, lowercase English ID, for example `aung`, `hla`, `mya`. **Two people must never use the same ID.** The ID is how their data stays separate. Always use the same ID when you come back the next day.
2. Fill in your name, dominant hand and laptop name. Keep 30 as the number of takes per sign (the default).
3. Select a sign in the list and press **Space**:
   - **yellow frame**: 3 s break. Get ready and put your hands down.
   - **red frame + REC**: 5 s recording. Sign once, clearly, with your hands in view.
   - The take is saved, and the next 3 s break starts automatically.
4. When a sign reaches 30, the app moves on to the next unfinished sign. **Esc** stops. **Ctrl+Z** deletes the last take if you made a mistake. The take is moved to `data/msl77/raw/_deleted/`, so you can still get it back.
5. If your hands were visible in less than 60 % of the frames, the take is **not saved** and is recorded again.

You can stop at any time. When you reopen the app, the counts continue from where you stopped.

**Tips for a good model.** Change something a little between takes: distance from the camera, position in the frame, speed. Record on different days or in different lighting if you can. Sit so that your shoulders and both hands are inside the picture. Start and end each take with your hands resting.

Check your progress at any time:

```bash
python build_dataset.py report
```

## 3. Send your data (each person)

```bash
python build_dataset.py export
```

This creates `data/msl77/exports/msl77_<signerid>_<date>.zip` (roughly 200–400 MB for 77 × 30 takes). Send the zip to the trainer by Google Drive, Telegram or USB. You can export part-way through and send a newer zip later. Takes that are already imported are skipped.

> Recordings are **not** committed to git (`data/msl77/` is in `.gitignore`), because the full set is too large for the repository.

## 4. Combine (trainer)

The trainer can also be one of the three signers. Their own recordings are already in `data/msl77/raw/`.

```bash
python build_dataset.py import "D:\Downloads\msl77_hla_20261110-1530.zip" "D:\Downloads\msl77_mya_20261110-1612.zip"
```

`import` also accepts an unzipped folder. The data ends up like this:

```
data/msl77/raw/
├── aung/  signer.json  i/aung__i__20261108-101500-123.npz  mingalarbar/...  (77 sign folders)
├── hla/   signer.json  i/hla__i__...npz ...
└── mya/   signer.json  ...
```

Every file name starts with the signer ID, so nothing can overwrite anything else. Copying the folders in by hand works too.

Then build the combined dataset:

```bash
python build_dataset.py build
```

Output in `data/msl77/dataset/`:

| File | Contents |
|---|---|
| `msl77_dataset.npz` | `X` (N, 60, 165) landmarks, `y` labels, `hand_mask` (N, 60, 2), `signer`, `sample_id`, label names in Myanmar and English |
| `dataset_info.json` | Every detail: per-sign × per-signer counts, each signer's name, laptop, hand, average fps, hand visibility and dates, quality rules, feature layout, rejected files with the reason, and missing takes |
| `samples.csv` | One row per recorded file (opens in Excel): signer, sign, laptop, frames, fps, hand %, time, kept/rejected |
| `DATASET_REPORT.md` | The same information as readable tables. ⚠ marks a sign/person below 30 |

Laptops record at different frame rates (12–30 fps). `build` resamples every take by its timestamps to exactly 60 frames over 5 s, so the three laptops' data match. Short hand dropouts (≤ 4 frames) are filled in.

## 5. Train (trainer)

```bash
python train_model.py
```

This uses a stratified 70 / 15 / 15 split (train / val / test) across all three people. It prints the test accuracy, the weakest signs and the most-confused pairs.

For an honest estimate on a **new person**, hold one signer out completely:

```bash
python train_model.py --val-signer mya
```

When you are happy with the results, train the final model on 100 % of the data:

```bash
python train_model.py --all-data
```

Saved to `models/`: `msl77_model.pt` (weights, labels, normalisation; everything needed to predict), `msl77_metrics.json` and `msl77_confusion.csv`. Use `load_model()` and `predict()` in `train_model.py` to run it on a 60 × 165 sequence.

## Data format (one take)

`data/msl77/raw/<signer>/<sign>/<signer>__<sign>__<time>.npz`

| Key | Shape | Meaning |
|---|---|---|
| `features` | (T, 165) | Left hand 21×3, right hand 21×3, 13 upper-body pose points ×3. Shoulder-centred and scaled. The same features the live app uses |
| `timestamps` | (T,) | Seconds since the recording started |
| `left`, `right` | (T, 21, 3) | Raw MediaPipe hand landmarks (camera coordinates, not mirrored) |
| `pose` | (T, 33, 4) | Raw pose landmarks + visibility |
| `left_present`, `right_present` | (T,) | Whether each hand was detected |
| `meta` | JSON | Sign, signer, name, hand, laptop, OS, camera, resolution, fps, hand ratios, time, MediaPipe version |

Do not rename sign IDs in `msl77_signs.py` after recording has started. New signs can be added at the end of the list.
