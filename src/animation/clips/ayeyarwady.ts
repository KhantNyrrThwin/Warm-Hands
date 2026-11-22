/**
 * Animator: hand-made from signer pmt's 30 recorded takes (data/msl77/raw/pmt/ayeyarwady)
 *           (build_clips.py leaves this file alone; the generated version is replaced).
 * Sign id:  ayeyarwady
 * Myanmar:  ဧရာဝတီ
 * English:  Ayeyarwady
 *
 * Two hands, mirrored like the other signs so the moving hand is the character's right hand:
 *   - the other hand (the base) comes up in front of the stomach, fairly flat (pmt: ~25° bend),
 *     upright and pointing forward, palm toward the centre, and then does not move at all;
 *   - the right hand shows the index and middle fingers, together and straight, with the ring
 *     and little fingers folded into the palm and the thumb holding them; palm down, fingers
 *     forward and a little inward (as recorded). It travels sideways, away from the base hand
 *     (recorded: from ~0.65 to ~1.1 shoulder widths beside it), while the fingertips zigzag
 *     up and down (recorded: about two swings each way, ±~22°).
 * Not hand-tuned per take: positions are pmt's medians; the zigzag is made regular.
 */
import type { Object3D } from 'three'
import { mirrorKeys } from './mirrored'
import { createRecordedClip, type RecordedArm, type RecordedKey } from './recorded'

export const AYEYARWADY_DURATION = 4.2

// Authored in the recording's camera view: the signer's right hand works on -x. mirrorKeys()
// below puts the sign on the character's right hand, as for the other signs.

/** Index and middle straight and together; ring and little finger folded, the thumb over them. */
const TWO_FINGERS = {
  c: { thumb: [.5, .48, .25], index: [.06, .05, .03], middle: [.06, .05, .03], ring: [1.25, 1.45, .9], pinky: [1.25, 1.45, .9] },
  s: { thumb: -.15, index: -.04, middle: .04, ring: 0, pinky: 0 },
  o: .75,
}
/** Base hand: fairly flat, fingers together. */
const FLAT = {
  c: { thumb: [.3, .05, 0], index: [.12, .12, .06], middle: [.12, .14, .06], ring: [.14, .14, .06], pinky: [.16, .14, .06] },
  s: { thumb: -.1, index: -.04, middle: 0, ring: .03, pinky: .06 },
  o: .45,
}

/** The base hand, still for the whole sign: in front of the stomach, upright and forward, palm toward the centre. */
const BASE: RecordedArm = { w: [.43, 3.09, .31], d: [-.08, .6, .8], p: [.97, .08, .1], e: [1.15, 2.79, -.35], ...FLAT }
const baseRising: RecordedArm = { ...BASE, w: [.75, 2.85, .75], d: [.1, .3, .4] }

/** Right hand: palm down, fingers forward and a little inward; `tilt` > 0 points the fingertips up. */
const SWING = .42, BOB = .06, Y = 3.25, Z = .45
const right = (x: number, tilt: number): RecordedArm => {
  const d = [.62, tilt, .78], n = Math.hypot(...d)
  return {
    w: [x, Y + BOB * Math.sign(tilt) * Math.min(1, Math.abs(tilt) / SWING), Z],
    d: d.map((v) => v / n),
    p: [-.2, .93 - .3 * tilt, .3], // back of the hand up (palm down), turning with the fingers
    e: [-1.15, 2.82, -.35],
    ...TWO_FINGERS,
  }
}
const rightRising: RecordedArm = { ...right(-.6, 0), w: [-.6, 2.95, .8], d: [.46, -.07, .25] }

const START = -.25, END = -.85
const ZIG = [0, SWING, -SWING, SWING, -SWING, 0] // fingertips: level, up, down, up, down, level
const ZIG_START = .9, ZIG_STEP = .45
const zigKeys: RecordedKey[] = ZIG.map((tilt, i) => {
  const time = ZIG_START + ZIG_STEP * i
  return [+time.toFixed(3), right(START + (END - START) * i / (ZIG.length - 1), tilt), BASE]
})
const zigEnd = ZIG_START + ZIG_STEP * (ZIG.length - 1)

// [time, signer's right hand, signer's left hand]; 0 = arm at rest.
const keys: RecordedKey[] = [
  [.45, rightRising, baseRising],
  [.75, right(START, 0), BASE],
  ...zigKeys, // the base hand stays exactly where it is
  [zigEnd + .35, right(END, 0), BASE], // short hold at the end
  [zigEnd + .75, { ...right(END, 0), w: [-.92, 2.9, .8] }, baseRising],
]

export function createAyeyarwadyAnimation(model: Object3D) {
  // Mirrored: played on the character's right hand (a two-handed sign swaps hands).
  return createRecordedClip(model, mirrorKeys(keys), AYEYARWADY_DURATION)
}
