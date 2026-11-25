/**
 * Animator: positions and timing from signer pmt's recorded takes (data/msl77/raw/pmt/num_10),
 *           handshapes made by hand (build_clips.py leaves this file alone).
 * Sign id:  num_10
 * Myanmar:  10
 * English:  Ten
 *
 * Both hands rise together and are held side by side, upright, palms toward the centre:
 *   - the right hand makes the round "O" of Zero (the same tuned shape, the index fingertip on
 *     the thumb tip; turned so the viewer looks straight through the circle);
 *   - the other hand makes "1": the index finger straight up, the other fingers closed, the
 *     thumb over them.
 * Held still, then both go down. Positions and timing are pmt's medians; the averaged recording
 * only half-closed the circle, so the shapes are set by hand and the hands held steady.
 */
import type { Object3D } from 'three'
import { mirrorKeys } from './mirrored'
import { CIRCLE } from './num_0'
import { createRecordedClip, type RecordedArm, type RecordedKey } from './recorded'

export const NUM_10_DURATION = 2.89

// Authored in the recording's camera view: the signer's right hand works on -x. mirrorKeys()
// below puts the "O" on the character's right hand, as for the other signs.

const CLOSED = [1.25, 1.45, .9]
/** "1": index straight up, the other fingers closed, the thumb across them. */
const ONE = {
  c: { thumb: [.5, .48, .25], index: [.05, .05, .03], middle: CLOSED, ring: CLOSED, pinky: CLOSED },
  s: { thumb: -.1, index: 0, middle: 0, ring: 0, pinky: 0 },
  o: .7,
}
const relax = (shape: typeof ONE, k: number) => ({
  ...shape,
  c: Object.fromEntries(Object.entries(shape.c).map(([d, v]) => [d, v.map((x) => +(x * k).toFixed(3))])) as typeof ONE.c,
})

/** Held (pmt's medians): the "O" hand upright, palm squarely toward the centre (circle to the viewer). */
const ZERO_HELD: RecordedArm = { w: [-.43, 3.29, .42], d: [-.02, .98, .17], p: [-1, .05, .02], e: [-1.15, 2.82, -.35], ...CIRCLE }
/** Held: the "1" hand upright beside it, palm toward the centre. */
const ONE_HELD: RecordedArm = { w: [.43, 3.12, .4], d: [.05, .97, .25], p: [.73, .14, -.67], e: [1.15, 2.8, -.35], ...ONE }
const zeroRising: RecordedArm = { w: [-.74, 2.96, .85], d: [-.02, .42, .1], p: [-.44, .06, -.77], e: [-1.15, 2.95, -.2], ...relax(CIRCLE as unknown as typeof ONE, .7) }
const oneRising: RecordedArm = { w: [.75, 2.85, .82], d: [.05, .38, .13], p: [.39, .07, -.83], e: [1.15, 2.95, -.2], ...relax(ONE, .7) }
const zeroLowering: RecordedArm = { ...zeroRising, w: [-.75, 2.92, .83], d: [-.03, .39, .08], p: [-.38, .05, -.83] }
const oneLowering: RecordedArm = { ...oneRising, w: [.76, 2.82, .85], d: [.02, .35, .13], p: [.34, .09, -.85] }

// [time, signer's right hand, signer's left hand]; 0 = arm at rest.
const keys: RecordedKey[] = [
  [.52, zeroRising, oneRising],
  [.85, ZERO_HELD, ONE_HELD],
  [2.23, ZERO_HELD, ONE_HELD], // "1" and "0" held still
  [2.54, zeroLowering, oneLowering],
]

export function createNum10Animation(model: Object3D) {
  // Mirrored: played with the "O" on the character's right hand (the hands swap, as for the other signs).
  return createRecordedClip(model, mirrorKeys(keys), NUM_10_DURATION)
}
