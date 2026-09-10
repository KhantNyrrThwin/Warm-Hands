# Warm Hands 3D avatar and Mingalarbar greeting

The main view loads `public/models/WarmHands_Character.glb` with Three.js. Enter **မင်္ဂလာပါ** and press the orange Send button to play the greeting. Surrounding whitespace and zero-width keyboard characters are accepted. Other text shows a prompt instead of playing an unrelated sign.

The 6.4-second sequence follows the supplied images in `src/assets/Mingalarpar`:

1. Rest with hands down.
2. Raise the hands toward the waist.
3. Move both hands in front of the chest.
4. Turn the palms toward each other, fingers upward.
5. Hold the palms together with a small head inclination, then return to rest.

Send is disabled during loading and playback. Playback completion comes from the animation itself, so a timer cannot stop the gesture early. Hidden tabs pause the sequence. Replaying starts the same sequence from the resting pose. The original PNG references remain available as source material; they are no longer used as playback frames.

## Implementation

- `src/components/CharacterViewer.tsx`: lazy-loaded renderer, character loading, responsive framing, playback lifecycle and blinking. It shows the original character image when WebGL or asset loading fails.
- `src/animation/mingalarbar.ts`: reference poses and a two-bone arm solver. Wrists follow smooth target paths; quaternion interpolation turns the palms without Euler-angle flips. Bone lookup uses Three.js's own name sanitizer to match the loaded GLB.
- `src/animation/greetingInput.ts`: Burmese input matching.
- `tests/greeting.test.mjs`: checks the input matcher and loads the actual GLB to verify raised hands, close and level wrists, upward fingers, a stable hold, finite joint rotations, exact reset, and repeatability.

The motion is authored in the application; it is not embedded as an animation clip inside the GLB. This is an interpretation of the supplied images, not a linguistically validated MSL motion capture. Review handshape, timing and expression with a fluent MSL signer before using it for healthcare communication. The camera and microphone features remain prototype features; this change does not implement recognition or speech transcription.

## Run and check

```sh
bun install
bun run dev
bun run build
bun run lint
bun run test
```

The character and loader are separate lazy-loaded chunks. The standard build may report a size warning for the Three.js chunk. No assets or signing data are fetched from third-party services at runtime.
