# Five-sign presentation

The app asks for Myanmar or International Sign Language when it opens. Change language at the top right. Each language has its own recordings and checkpoint; old datasets and models are preserved and are not used by this flow.

- Myanmar: Mingalarbar, Sick, I, Headache, Help.
- International: Please, Help, Sick, Medicine, I.

## Record and train (77 MSL signs)

The old 5-sign recorder and trainers (`record_dataset.py`, `data_collection.py`, `model.py`, …) were removed. Data collection and training now use `collect_data.py`, `build_dataset.py` and `train_model.py` for the 77 signs. See [DATA_COLLECTION_GUIDE.md](DATA_COLLECTION_GUIDE.md).

The live app still loads the existing 5-sign checkpoints until it is switched to `models/msl77_model.pt`.

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
