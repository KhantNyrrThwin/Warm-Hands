# Detailed signing hands

The avatar now has rebuilt arms, oval wrists, a broader palm with thumb and little-finger pads, unequal finger lengths, rounded joint contours, short curved nail plates, and subtle flexion creases. Resting palms face backward. The white traditional shirt, golden longyi, smaller eyes, and sandals are retained.

Each hand keeps the existing bone names: `hand.L/R` and three joints for each of `thumb`, `index`, `middle`, `ring`, and `pinky`. Finger weighting is assigned by anatomical region to keep adjacent fingers independent. Every finger flexes toward the palm around its local positive X axis. The thumb's three bones represent its base, knuckle, and interphalangeal joint.

`src/animation/handArticulation.ts` provides independent joint curl, finger spread, and thumb opposition. `ArmPose.handShape` in `armPlayback.ts` accepts these controls alongside the existing arm targets and finger gathering. Curl may be a normalized 0–1 value or three joint angles in radians. `HAND_SHAPES` contains open, fist, thumbs-up, and pointing shapes for animation authoring; these are handshapes, not newly registered translations or validated signs. Wrist orientation must also be authored to orient a thumbs-up vertically.

The Blender master is saved separately at:

`C:/Users/Acer/Documents/Codex/2026-09-09/ho/outputs/Warm Hands Signing Hands/Warm Hands - Signing Hands.blend`

It includes editable `Hand Review - Open`, `Hand Review - Fist`, `Hand Review - Thumbs Up`, and `Hand Review - Pinch` actions. The web GLB exports the neutral rig; the application authors its signing motion. The pinch action is an authoring starting point and still needs contact adjustment.

The detailed export is approximately 9.3 MB and 304,000 triangles. More geometry is retained around the hands than in the earlier avatar. Test performance on target phones before delivery. The longyi remains a simple deformation garment, without cloth simulation.

Checks:

```sh
bun test tests/greeting.test.mjs
bun test tests/handArticulation.test.mjs
bun run build
bun run lint
```

The hand tests use the real skinned GLB to check independent finger movement, palm-directed flexion, an extended thumb with closed fingers, thumb opposition, interpolation back to open fingers, and exact reset. The visual review images show the palm, back, fist, and extended-thumb handshape. These establish animation capability; fluent signer review is still needed for each authored sign.
