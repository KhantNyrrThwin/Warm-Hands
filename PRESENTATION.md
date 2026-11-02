# Five-sign presentation

The app asks for Myanmar or International Sign Language when it opens. Change language at the top right. Each language has its own recordings and checkpoint; old datasets and models are preserved and are not used by this flow.

- Myanmar: Mingalarbar, Sick, I, Headache, Help.
- International: Please, Help, Sick, Medicine, I.

## Record fresh datasets

Use a working Python environment with `pip install -r requirements.txt`.

Open the visual recorder (recommended):

```sh
python record_dataset.py
```

Choose Myanmar or International, select a sign, and click **Record** (or press Space). The camera shows hand and upper-body landmarks on a mirrored preview. A large **3 → 2 → 1** countdown gives you time to get into position before each sample. Perform the sign when **REC** appears. Samples save automatically, and the panel shows progress for all five signs. Esc or **Cancel recording** discards an in-progress sample. If hands disappear during capture, the sample is discarded so you can retry.

Enable **Record next sample automatically** to collect consecutive samples alone; each sample gets a fresh three-second countdown. It stops when the selected sign reaches its target. Choose the next sign yourself.

These commands open the same UI with the language and target preselected:

```sh
python data_collection.py --live --language myanmar --sequences 30
python data_collection.py --live --language international --sequences 30
```

Run again to resume. Add `--sign headache` (or another lowercase sign ID) to preselect a sign. Record the appropriate sign language for each dataset, including shared words. Vary signer, distance, position and lighting. Each sample uses 10 frames at 120 ms intervals to match live recognition. The countdown frames are excluded from training data.

Recordings go into `data/myanmar5/live` and `data/international5/live`. **Help is shared:** recording Help with either language selected saves to `data/international5/live/help`. Both languages show the same Help count and train on those same samples. When adding Help samples manually, put numbered sample folders in that shared directory; each folder must contain `0.npy` through `9.npy`. Other signs remain separate, including Sick and I.

The 30 samples previously recorded under Myanmar Please are Please recordings and are stored under `data/international5/live/please`; `data/help-migration.json` records their original paths and verified file hashes. Shared Help starts empty and must be recorded again. Myanmar's class list now ends with Help. Retrain both language models after collecting Help, then restart the AI server. Model weights are not changed by moving or renaming recording data.

Aim for at least 30 samples per sign. Training requires all five classes and at least eight complete samples per class.

## Train after recording

```sh
python model.py --live --language myanmar
python model.py --live --language international
```

Models are saved separately as `models/myanmar5_lstm.npz` and `models/international5_lstm.npz` (with matching `.pt` files). Restart the AI server after retraining to load the new checkpoints.

```sh
npm run dev:ai
npm run dev
```

Choose a language, then select Input Sign Language. An untrained language shows a message explaining which training command to run. Health, live WebSocket and uploaded-clip recognition accept `?language=myanmar` or `?language=international`.

Each sign gets a visible five-second countdown. Perform one sign per round; confident short predictions are combined into one result at the end of that round. The next five-second round begins automatically. A round without any confident prediction finishes the sentence. Complete commits any recognized sign in the current round and finishes immediately. The corrected Myanmar sentence stays visible after the camera closes.

Recognition displays Myanmar text only for both language choices. Local sentence rules run whenever a sign is added: I + Sick becomes `ကျွန်ုပ်နေမကောင်းပါ`, I + Headache becomes `ကျွန်ုပ်ခေါင်းကိုက်ပါ`, I + Help becomes `ကျွန်ုပ်ကိုကူညီပါ`, and Please + Help becomes `ကျေးဇူးပြု၍ ကူညီပါ`. These rules cover the presentation vocabulary rather than arbitrary Myanmar grammar. Restart the AI server to load the output changes; this sentence formatting does not require model retraining.

The trainer reports accuracy on a held-out sample split. This does not establish accuracy on new people; evaluate with people and recording sessions excluded from training.

## Avatar and voice input

The avatar uses the original hand-authored animations for Mingalarbar, Thank You, Please, Help, and Medicine. Sick follows the eight reference photos in filename order (01, 02, 3 through 8): raise and open the hand on the viewer's left, hold at the forehead, then relax and lower it. Continuous interpolation smooths the passing poses, with a bent elbow and reach fitted to the avatar's limb lengths. The experimental NumPy-derived animations have been removed. I follows the A-E reference photos: raise an open hand on the viewer's left, place the palm on the chest, hold once, withdraw and lower. Headache raises both curled hands beside the temples, flexes the fingers through three small scratching strokes while hovering clear of the head, then lowers both hands. Dataset recordings and recognition models are preserved.

Only the voice-to-text code from `myy-voice` was integrated. Voice input uses the browser's `SpeechRecognition` / `webkitSpeechRecognition` with `my-MM`, displays the live transcript, and places the recognized text in the textbox. It does not replace recognized speech with a preset greeting or automatically rewrite the transcript. Use the play button to animate supported words. Microphone permission and browser support for Myanmar recognition are required; use Chrome when the current browser does not support recognition.

The interface, countdown instructions, text placeholder, playback messages, and dataset recorder controls use Myanmar text. The language chooser shows only the two language titles.
