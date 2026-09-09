# Warm Hands: revised data collection and neural network guide

Prepared 8 September 2026. Focus: *Warm Hards Data Collection Process.pdf*, version 1.0, with scope checked against *Warm Hands Proposal.pdf*. This is a proposed technical revision, not a trained or clinically validated system. The original PDFs are unchanged. Code fragments are implementation guidance; they have not been integration-tested with MediaPipe, TensorFlow, or a tablet.

## 1. Recommendation and scope

Keep the idea of MediaPipe landmarks followed by an LSTM classifier. Correct the feature extraction and evaluation protocol before collecting the full dataset. Start with recognition of one deliberate, isolated MSL medical sign or approved short expression per recording. A classifier for 100 labels is not a general translator for continuous MSL sentences.

There are two separate machine-learning systems:

1. Google's pretrained MediaPipe models locate body and hand landmarks in camera images.
2. Your trained temporal classifier maps sequences of those landmarks to your approved MSL labels.

Your classifier receives numbers, not video pixels. You do not connect MediaPipe to every layer or retrain its hand detector through this classifier. The first LSTM receives the processed landmark sequence; all remaining connections are internal to Keras.

## 2. Corrections to the original document

### Section 4.2: incorrect pose indices

`results.pose_landmarks.landmark[:11]` extracts nose, eyes, ears and mouth points. It does not extract shoulders or arms. MediaPipe shoulders are 11–12, elbows 13–14, wrists 15–16 and hips 23–24. A useful explicitly defined 11-point selection is:

```python
POSE_IDS = [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24]
# nose, ears, shoulders, elbows, wrists, hips
```

This is a proposed selection, not the only correct selection. It includes hips as torso reference/context when visible. It is not a facial-expression representation. [Official pose landmark index definitions](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker).

### Section 5.1: preserve location and movement

Wrist-centering each hand preserves its shape but removes its absolute trajectory. If the same hand shape moves from the chest to the forehead, the local hand representation may remain nearly unchanged. Retain both local hand shape and the wrist position relative to the body. Normalize body coordinates using a shared shoulder origin and shoulder width.

Do not combine hand and pose depth values as if they share one calibrated 3D reference frame. The revised baseline uses body-relative image-plane position, and hand-local estimated depth only. It therefore does not fully recover movement toward the camera. Test signs that depend on depth; add a validated depth representation if necessary.

### Section 4.2: missing landmarks

Zeros alone confuse missing data with valid zero coordinates. Add validity flags. Reject windows with inadequate tracking instead of confidently predicting from fabricated coordinates. One-handed signs are valid: do not reject every frame containing only one hand.

### Sections 3 and 6: collection and splitting

30 clips per class across 15–20 signers is only about 1.5–2 clips per signer per class if balanced. This is a pilot dataset, not evidence that generalization is solved. Separate signers across training, validation and test sets before generating windows or augmented copies.

### Section 7: timing and output

30 processed frames are not necessarily one second. Camera capture and landmark extraction may run at different rates. Store timestamps and define the sampling interval. Replace an unconditional 1.5-second lock with a tested sign-completion/release policy; a fixed lock can suppress legitimate repeated signs.

An 85% softmax score is not proof of an 85% chance of being correct. Treat confidence and debounce settings as validation-tuned parameters. A 100-class model always favors one of those labels, even on unfamiliar motions. Include non-sign examples and a rejection mechanism.

### Section 8: size, speed and privacy

Remove the unmeasured claims of 18 MB becoming 2.8 MB and a 3.5× speed improvement. The specified original network has 215,876 parameters including normalization state: about 0.86 MB of float32 parameter values, excluding file packaging, optimizer state and MediaPipe assets. Those figures do not establish actual application size or speed.

Distinguish consented research recordings from runtime camera processing. Also distinguish the offline sign-recognition branch from the proposal's Google Cloud speech branch: cloud speech processing transmits audio. “No audio is uploaded” cannot describe that whole architecture.

## 3. Revised feature contract: 165 values per timestep

Use an explicit, versioned order:

1. Left hand local coordinates: 21 × 3 = 63.
2. Right hand local coordinates: 21 × 3 = 63.
3. Selected pose points, body-relative x/y: 11 × 2 = 22.
4. Left and right hand wrist positions, body-relative x/y: 2 × 2 = 4.
5. Left and right hand validity flags: 2.
6. Selected pose-point validity flags: 11.

Total: **63 + 63 + 22 + 4 + 2 + 11 = 165**. The original 159 was arithmetically correct for its own design; 165 describes this different proposed feature design. It is not an experimentally established optimum.

### Normalization equations

For an image of width W and height H, convert normalized x/y to `(W*x, H*y)` before measuring distances. Otherwise the 1280×720 aspect ratio distorts Euclidean distance.

For the body, with image-plane shoulder points sL and sR:

```
c = (sL + sR) / 2
d = ||sL - sR||
body_point = (point_xy - c) / d
body_wrist = (hand_wrist_xy - c) / d
```

Reject an invalid or implausibly small shoulder scale. A numerical epsilon prevents division by zero but does not make poor tracking valid. A future shoulder-smoothing policy must be causal and used identically during training and deployment.

For each detected hand, convert its normalized values to the approximate common numerical scale `(W*x, H*y, W*z)`, subtract its wrist, and divide by a valid palm scale such as wrist-to-middle-MCP distance. MediaPipe hand z is an estimate with a wrist-relative origin and roughly the scale of x; this does not produce calibrated metric 3D. Preserve image-plane orientation: aggressively rotating every hand to the same orientation can remove sign distinctions. [Hand result coordinate definitions](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/python).

### Feature-builder function

The following assumes an adapter has produced anatomical left/right hand arrays and pose arrays from the same image and timestamp. `None` denotes an absent hand. Set pose validity from presence/visibility plus application quality checks. Validate all input shapes and finite numbers in the adapter.

```python
import numpy as np

POSE_IDS = np.array([0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24])

def build_features(left, right, pose, pose_valid, width, height,
                   min_shoulder_px, min_palm_px):
    # left/right: (21, 3) normalized image coordinates or None
    # pose: (33, 3); pose_valid: (33,) booleans
    # Minimum pixel sizes are validation-tuned tracking quality settings.
    if pose is None or not (pose_valid[11] and pose_valid[12]):
        return None  # invalid body reference; do not classify this window
    xy = pose[:, :2] * np.array([width, height])
    center = (xy[11] + xy[12]) / 2
    scale = np.linalg.norm(xy[11] - xy[12])
    if not np.isfinite(scale) or scale <= min_shoulder_px:
        return None

    pmask = np.asarray(pose_valid[POSE_IDS], dtype=bool)
    body = np.zeros((11, 2), dtype=np.float32)
    body[pmask] = (xy[POSE_IDS[pmask]] - center) / scale

    def encode_hand(hand):
        if hand is None:
            return np.zeros(63), np.zeros(2), 0.0
        pts = np.asarray(hand) * np.array([width, height, width])
        local = pts - pts[0]
        palm_scale = np.linalg.norm(local[9])  # middle-finger MCP
        if not np.isfinite(palm_scale) or palm_scale <= min_palm_px:
            return np.zeros(63), np.zeros(2), 0.0
        wrist_body = (pts[0, :2] - center) / scale
        return (local / palm_scale).reshape(-1), wrist_body, 1.0

    lh, lw, lm = encode_hand(left)
    rh, rw, rm = encode_hand(right)
    features = np.concatenate([
        lh, rh, body.reshape(-1), lw, rw, [lm, rm], pmask
    ]).astype(np.float32)
    assert features.shape == (165,)
    return features if np.isfinite(features).all() else None
```

A missing hand and a genuinely lowered hand can both produce a zero flag; the flag does not reveal the cause. Learn from background data and use temporal quality checks. Do not interpret failed detection alone as a sign boundary.

## 4. What neural network topology means

Topology describes layer types, order, connections and tensor dimensions. A unit is a learned numerical feature, not a named sign or finger. You do not assign “pain detection” to neuron 1 or “finger bending” to layer 1. Training learns distributed patterns from labeled examples.

Let B be batch size, T the sequence length and F=165 the feature count. For an initial experiment keep T=30, but select the real duration from observed sign lengths. For example, 30 samples at 15 samples/second cover approximately two seconds; 30 samples at 30/second cover approximately one second. Include any wait for sufficient sign evidence in end-to-end latency.

Recommended starting topology:

```
(B, T, 165)
  -> LSTM(64, return_sequences=True)   -> (B, T, 64)
  -> Dropout(0.20)                    -> (B, T, 64)
  -> LSTM(64, return_sequences=False)  -> (B, 64)
  -> Dropout(0.20)                    -> (B, 64)
  -> Dense(64, relu)                  -> (B, 64)
  -> Dense(K, softmax)                -> (B, K)
```

K=101 for 100 approved sign labels plus one background/non-sign class. That extra class needs actual training clips, including rest, transitions and ordinary movements. It cannot represent every possible unknown sign, so retain a rejection mechanism. Start with fewer approved classes if the collection budget is limited.

### Input layer

`keras.Input(shape=(T, 165))` declares one sample's dimensions. B is omitted because Keras supplies the batch dimension. It has no learned weights. Each timestep must use exactly the same feature order and normalization.

### First LSTM: 64 units, returning all timesteps

At each timestep, it receives the 165 current measurements, its previous hidden state h, and its previous memory c. It computes input, forget and output gates and a candidate memory:

```
i_t = sigmoid(x_t W_i + h_(t-1) U_i + b_i)
f_t = sigmoid(x_t W_f + h_(t-1) U_f + b_f)
g_t = tanh   (x_t W_g + h_(t-1) U_g + b_g)
o_t = sigmoid(x_t W_o + h_(t-1) U_o + b_o)
c_t = f_t * c_(t-1) + i_t * g_t
h_t = o_t * tanh(c_t)
```

`*` is elementwise multiplication. Sigmoid produces values between 0 and 1, controlling how much information passes. Tanh produces values between -1 and 1 for candidate and exposed memory. Keras computes these operations and learns W, U and b; you should not manually code their gradients for the application.

This layer can learn useful time-dependent combinations of finger configuration, wrist location and body posture. Those interpretations are possibilities, not guaranteed meanings assigned to individual units. `return_sequences=True` preserves one 64-value hidden representation for each timestep, allowing another LSTM to read the sequence. [Keras LSTM API](https://keras.io/api/layers/recurrent_layers/lstm/).

### Dropout: rate 0.20

During training, randomly suppress some activations and scale the retained values. This discourages over-reliance on particular features. During normal inference it is inactive. It does not remove 20% of the signs or select missing camera frames. It adds no trainable parameters. [Keras Dropout](https://keras.io/api/layers/regularization_layers/dropout/).

### Second LSTM: 64 units, final summary

It receives the first LSTM's 64-value sequence. It uses the same gate equations but different learned weights. `return_sequences=False` returns the final hidden summary `(B,64)`, which combines evidence from the observed window. It is not merely classifying the last camera frame: the hidden state depends on previous timesteps.

This is a unidirectional model. In the simple sliding-window implementation its recurrent state starts fresh for each window. Do not enable `stateful=True` and feed overlapping windows without a deliberate state policy, or observations may be counted repeatedly.

### Dense hidden layer: 64 units and ReLU

Compute `a = max(0, hW+b)`. W has shape `(64,64)` and b has shape `(64,)`. This learns combinations of the temporal summary useful for separating labels. For example, similar hand shapes may become separable through different movement/location evidence. ReLU introduces nonlinearity. [Keras Dense](https://keras.io/api/layers/core_layers/dense/).

### Output layer: K units and softmax

Each output corresponds to one stored label ID. Compute logits `z=aW+b`, then `p_k=exp(z_k)/sum_j exp(z_j)` using the library's numerically stable implementation. The scores sum to 1. The largest score is the candidate class; the output policy decides whether to show it. Softmax does not verify correctness or detect every unfamiliar input.

### Why simplify the original model?

The original 64→128→64 LSTM stack and 64→32 dense stack are dimensionally valid. More layers are not automatically more accurate. The smaller proposal has 102,629 parameters for F=165 and K=101, about 0.41 MB of float32 parameter values. Compare both architectures on identical corrected features and signer splits before choosing.

Batch normalization in the original standardizes intermediate activations using training statistics and moving inference statistics. It is different from geometric landmark normalization and can behave differently between training and inference. It is not inherently invalid here; omit it in the first simple baseline and test its effect later. [Keras BatchNormalization](https://keras.io/api/layers/normalization_layers/batch_normalization/).

## 5. Model and training functions

```python
import tensorflow as tf
from tensorflow import keras

def build_model(timesteps=30, n_features=165, n_classes=101):
    inputs = keras.Input(shape=(timesteps, n_features), name="landmarks")
    x = keras.layers.LSTM(64, return_sequences=True,
                          activation="tanh",
                          recurrent_activation="sigmoid")(inputs)
    x = keras.layers.Dropout(0.2)(x)
    x = keras.layers.LSTM(64, activation="tanh",
                          recurrent_activation="sigmoid")(x)
    x = keras.layers.Dropout(0.2)(x)
    x = keras.layers.Dense(64, activation="relu")(x)
    outputs = keras.layers.Dense(n_classes, activation="softmax")(x)
    return keras.Model(inputs, outputs, name="warm_hands_baseline")

def train_model(model, x_train, y_train, x_val, y_val):
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-3, clipnorm=1.0),
        loss=keras.losses.SparseCategoricalCrossentropy(),
        metrics=[keras.metrics.SparseCategoricalAccuracy(name="accuracy")],
    )
    return model.fit(
        x_train, y_train,
        validation_data=(x_val, y_val),
        batch_size=32, epochs=200,
        callbacks=[
            keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=15, restore_best_weights=True),
            keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6),
            keras.callbacks.ModelCheckpoint(
                "best.keras", monitor="val_loss", save_best_only=True),
        ],
    )
```

The code assumes fixed-size, valid training windows and integer labels `(N,)`. For one-hot labels `(N,K)`, use categorical rather than sparse categorical cross-entropy. Both represent the same classification objective with different label encodings. For true class y, loss is `-log(p_y)`. Backpropagation through time calculates gradients, and Adam updates the classifier weights. MediaPipe weights remain unchanged.

Early stopping limits training after validation loss stops improving; explicitly restore the best weights. Learning-rate reduction allows smaller updates when progress stalls. Their patience values are starting settings, not measured optima. [EarlyStopping](https://keras.io/api/callbacks/early_stopping/), [ReduceLROnPlateau](https://keras.io/api/callbacks/reduce_lr_on_plateau/).

Variable-length batching is an alternative. If using padding, supply a real timestep mask or carefully defined padding convention. The 13 landmark-validity flags above describe missing feature groups; they are not automatically a Keras timestep mask. Do not remove an entire legitimate timestep just because one hand is absent.

## 6. Connecting MediaPipe to the classifier

The document uses the older `mp.solutions.holistic` interface. Its result field names differ from current Tasks APIs. Pin a tested library version if retaining that implementation. For a new implementation, use Hand Landmarker plus Pose Landmarker Tasks and an explicit result adapter. Do not mix old Holistic fields with new Tasks result objects.

Minimal synchronous setup:

```python
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

hand_options = vision.HandLandmarkerOptions(
    base_options=python.BaseOptions(model_asset_path="hand_landmarker.task"),
    running_mode=vision.RunningMode.VIDEO,
    num_hands=2,
)
pose_options = vision.PoseLandmarkerOptions(
    base_options=python.BaseOptions(model_asset_path="pose_landmarker.task"),
    running_mode=vision.RunningMode.VIDEO,
    num_poses=1,
)

# Create once at startup, close at shutdown.
with vision.HandLandmarker.create_from_options(hand_options) as hands, \
     vision.PoseLandmarker.create_from_options(pose_options) as pose:
    # Within your capture loop; frame_bgr and timestamp_ms come from capture:
    # rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    # image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    # hand_result = hands.detect_for_video(image, timestamp_ms)
    # pose_result = pose.detect_for_video(image, timestamp_ms)
    pass
```

The model asset paths must refer to downloaded matching task models. Use increasing timestamps. The Tasks return hand landmarks/handedness and pose landmarks through their respective result objects. Keep anatomical left/right slots consistent; result list position is not a permanent left/right identity. Resolve uncertainty with handedness, proximity to pose wrists and temporal association, and reject ambiguous multiple-person frames. Validate your camera mirroring convention with known left/right movements. [Hand Tasks guide](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/python), [Pose Tasks guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python).

For asynchronous live mode, correlate hand and pose results by source timestamp, not callback arrival order. Bound queues and discard stale results; the hand task may skip submitted frames when busy. Never silently fuse different times.

### Application function contracts

1. `capture_frame() -> (image, timestamp_ms)`: capture RGB input through OpenCV or the target platform camera; maintain increasing source timestamps.
2. `extract_landmarks(image, timestamp_ms) -> raw_results`: run both MediaPipe tasks on the same frame.
3. `assign_hands(raw_results, previous_tracks) -> left, right, pose, validity`: convert result objects into the canonical arrays; preserve person and hand identity.
4. `build_features(...) -> float32[165] or None`: apply the shared normalization above and validity flags.
5. `sample_timeline(timestamp_ms, features)`: enforce the chosen sampling interval. In live mode use a causal policy; do not interpolate using future observations. Long tracking gaps invalidate the window.
6. `update_window(sample) -> float32[T,165] or not_ready`: maintain a timestamped bounded buffer. Clear it on a long gap or signer change. Quality thresholds must allow legitimate one-hand signs.
7. `predict_window(window) -> float[K]`: call `model(window[None,...], training=False)` or the exported device interpreter. The extra dimension is B=1.
8. `decode_prediction(scores, quality, timestamp_ms) -> candidate/reject`: apply background rejection, validation-tuned confidence, optional top-two margin and stability duration.
9. `update_sign_state(candidate) -> event or None`: track waiting, collecting and emitted states. For the first version, a user-controlled start/end capture is easier to evaluate than automatic continuous segmentation.
10. `render_candidate(event)`: show approved Burmese text, uncertainty/retry state and a correction/confirmation control. Only confirmed output should drive spoken clinical messages in the proposed prototype.
11. `speak_confirmed_text(text)`: use verified Burmese TTS or approved recorded phrases; support mute/replay and test device/language availability.
12. `release_resources()`: close camera/tasks/interpreter resources and clear transient buffers.

All preprocessing lives before the neural network. Drawing the skeleton is a UI aid; it does not train the classifier. Save the feature schema, normalization settings, label order, sampling settings and model version together.

### Output stability

Use elapsed time, not an unexplained count of five frame evaluations. Highly overlapping windows are correlated; five matching outputs are not five independent confirmations. Tune the tradeoff between missed signs, false activations and delay on continuous validation recordings.

After emitting a sign, require a reliable release/new-sign event before re-emitting the same label. Do not equate low confidence or camera failure with release. Include repeated signs and transitions in evaluation. Prompted capture can use an explicit new-capture action to support repeats without inventing an automatic boundary detector.

## 7. Revised data collection and evaluation process

1. Co-design a vocabulary with fluent MSL users and relevant experts. Record sign variant, intended meaning, static/dynamic status, hand requirements and whether face/body cues distinguish it. An English medical word is not automatically one MSL sign.
2. Pilot 10–20 labels. Inspect actual duration and tracking failures before fixing T and sampling frequency. Expand only after the pilot protocol works.
3. Make counts explicit. One possible collection budget is 20 signers × 100 signs × 10 repetitions = 20,000 sign clips, plus background clips. This is a planning example, not a required minimum or guarantee. Spread repetitions over sessions and realistic variation.
4. Frame head, torso and hands adequately. Distance and lux ranges are experimental conditions, not assurances of tracking integrity. Test seated posture, realistic background, lighting, signing speed and safe simulated use conditions.
5. Store consented clip or landmark sequence, timestamps, signer ID, session ID, label/variant, device, conditions and quality flags. Separate identity records from research IDs. Decide whether consent permits raw-video retention for annotation and future feature extraction; landmarks can still contain sensitive information.
6. Split by signer. With 20 signers, 14/3/3 is an approximate 70/15/15 split. Ensure each class occurs in all groups. Keep all windows and augmented variants from an original recording in its assigned group.
7. Augment training data only. Apply coherent rotations to related coordinates across a sequence. Avoid frame-by-frame random rotations that invent movement. Do not mirror laterality-sensitive medical labels without a verified label transformation. Define noise in the actual normalized units; sigma=0.003 has no universal meaning. Resampling must not create a train/live timing mismatch.
8. Train baselines using the same data, splits and input policy. Fit any learned scalers only on training data. Use validation for architecture, thresholds and calibration. Keep the test set untouched until final evaluation.
9. Report macro-F1, per-class precision/recall, confusion matrix, and performance on unseen signers. Aggregate uncertainty at signer/recording level rather than treating overlapping windows as independent observations. Signer-independent evaluation matters in low-resource recognition. [Holmes et al., 2022](https://aclanthology.org/2022.sltat-1.7/).
10. Test continuous recordings separately: false accepted events/minute, missed signs, repeated-sign errors, rejection/coverage, and time from sign completion to usable output. For sentence-level future work, evaluate insertions, deletions and substitutions rather than only isolated-class accuracy.

The proposal mentions facial expressions, but this baseline does not model them adequately. Add a selected, normalized face-feature stream if the vocabulary requires it, then update F and evaluate its contribution. Restrict claims if facial distinctions are excluded.

## 8. Edge deployment

Export and validate float32 first. Then compare float16, dynamic-range or integer quantization supported by the selected runtime. For integer quantization, use representative training sequences covering signs, background and missing-landmark patterns; do not use the held-out test set for calibration. Conversion support depends on model operations and runtime. A successful desktop Keras run does not establish tablet conversion or speed. [RNN conversion guidance](https://developers.google.com/edge/litert/conversion/tensorflow/rnn), [Integer quantization guidance](https://developers.google.com/edge/litert/conversion/tensorflow/quantization/post_training_integer_quant).

Device method sequence: load interpreter, allocate tensors, inspect input/output metadata, set input, invoke, read output. Integer input/output requires applying the exported tensor scale and zero point; do not feed float values directly to an integer tensor. Re-evaluate accuracy and the output thresholds after conversion.

Measure classifier file size separately from MediaPipe assets and full application size. Report target tablet, OS/runtime, threads/delegate, warm-up procedure, sustained camera/landmark rate, peak memory, battery/thermal behavior and median/p95 end-to-end latency. Include camera capture, landmark inference, buffer accumulation, classifier and output stability. Any speed or size values remain targets until measured.

## 9. The rest of the application

The reverse direction is a separate pipeline:

```
Doctor speech/text -> Burmese text -> approved MSL phrase/sign sequence
                  -> approved animation clips -> avatar playback
```

Suggested functions: `transcribe_audio(audio)`, `normalize_burmese_text(text)`, `resolve_approved_phrase(text)`, `lookup_sign_sequence(phrase_id)`, `load_animation(sign_id)` and `play_sequence(sequence)`.

Google currently lists Burmese `my-MM` for particular Speech-to-Text models/regions; check the intended region, model and operating mode during implementation. Cloud recognition needs connectivity and an explicit privacy description. A typed-text or approved-phrase menu is a useful offline alternative. [Google language support](https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages).

Three.js renders animations; it does not translate Burmese into MSL grammar. Begin with fluent-signer-approved phrases and animation assets. Arbitrary word-by-word concatenation may produce incorrect signing. Test avatar hand shapes, orientation, location, motion, transitions and required facial cues with MSL users. This branch does not use the sign-to-label classifier in reverse.

The proposal's “transfer learning” also needs precise wording: using a fixed pretrained MediaPipe extractor is reuse of pretrained visual models. A randomly initialized LSTM trained on your dataset is not a fine-tuned pretrained sign-language model. If you actually transfer a temporal model, identify its source data, checkpoint and adapted layers.

## 10. Originality and thesis suitability

Yes, this can support a thesis, subject to MIIT's degree requirements and your supervisor's approval. A thesis can contribute a dataset, a carefully evaluated adaptation or an application study without inventing LSTM. Publication acceptance and novelty cannot be guaranteed from a design review.

Existing work titled *Myanmar Sign Language Recognition Using Deep Learning* already describes MediaPipe and LSTM for MSL. The ConsILR proceedings report 900 videos across 10 signs, with 3 signers in the main dataset. The paper appears on printed pages 135–148. This directly rules out a safe claim that “MSL + MediaPipe + LSTM” itself is new. It does not by itself establish whether its dataset is publicly downloadable or suitable for medical use. [Original proceedings](https://www.conferences.info.uaic.ro/consilr/prevEditions/Consilr_2023.pdf).

Therefore replace “there are no MSL datasets” with a bounded statement backed by a documented literature/resource search, such as: “This project will investigate the availability of reusable datasets for the selected MSL medical vocabulary and collect the data needed for its evaluation.” This review is not an exhaustive novelty or dataset-availability search.

What can be yours: the consented data you collect under agreed terms, the feature-selection and preprocessing implementation, trained classifier weights, application code, experimental protocol and documented findings. Cite MediaPipe, LSTM, libraries, datasets and borrowed techniques. Do not claim ownership of MSL or Google's pretrained models. Follow university rules on AI assistance and accurately describe your own work.

Promising research question:

“Does preserving body-relative wrist motion alongside local hand shape improve recognition of selected MSL medical signs on unseen signers, while meeting a measured tablet latency budget?”

Suggested controlled experiments:

- Local hand features only versus local hand features plus body-relative position.
- Corrected original three-LSTM topology versus proposed two-LSTM topology on identical features.
- With versus without explicit landmark-validity features.
- Float32 versus a supported quantized deployment.
- With versus without validated facial features, if relevant to the vocabulary.

Treat these as hypotheses. Report negative results and uncertainty as well as improvements. A medical vocabulary alone may be insufficient research novelty; substantiate what is new through comparison with related work.

Possible thesis title: **“Signer-Independent Recognition of Myanmar Medical Signs Using Body-Relative Landmarks and Lightweight Temporal Models.”** This names the intended evaluation, not an achieved result.

Suggested chapters: problem and bounded scope; MSL and related work; consent and dataset protocol; feature representation and architecture; implementation and deployment; experiments and error analysis; limitations and future work.

## 11. Suggested replacement for Section 6.1

The proposed baseline receives timestamp-sampled sequences with shape `(T,165)`. Each timestep contains normalized local landmarks for both hands, selected body-relative pose coordinates, body-relative wrist coordinates and landmark-validity indicators. A 64-unit LSTM returns a sequence of hidden states, followed by dropout at rate 0.2. A second 64-unit LSTM returns one sequence summary, followed by dropout at rate 0.2. A 64-unit ReLU dense layer precedes a K-unit softmax output layer, where K includes the selected medical signs and a trained background class. Sequence duration, model capacity, sampling policy and acceptance thresholds will be selected using validation signers. The original deeper topology will be retained as a comparison. Final accuracy, rejection behavior, file size and latency will be measured on held-out signers and the target device rather than asserted in advance.

## 12. Work completed and remaining

Completed in this review: read both supplied PDFs; checked pose indices, core Keras/MediaPipe interfaces and deployment documentation; identified direct MSL prior work; corrected the feature contract and proposed a smaller topology with implementation guidance. Feature dimensions and parameter arithmetic were checked.

Remaining: obtain approved sign definitions and consent; collect data; implement and test the result adapter and timestamp policy; train competing models; test export; measure unseen-signer and tablet performance; review thesis scope with your supervisor. No model training, accuracy measurement, mobile benchmark or clinical validation has been performed here.
