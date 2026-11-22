/**
 * Animator: hand-written from signer pmt's 30 recorded takes (data/msl77/raw/pmt/kayah)
 * and the reference picture (build_clips.py leaves this file alone).
 * Sign id:  kayah
 * Myanmar:  ကယား
 * English:  Kayah
 *
 * Both hands, mirror images of each other, simultaneously, once.
 * Values are the medians over the takes, scaled from the signer's arm length to the
 * character's (wrist offsets from the shoulder; finger and palm directions as recorded):
 * START  hands just above and in front of the shoulders, elbows down and out;
 *        fingers point toward the centre, palm DOWN (slightly toward the body),
 *        fingers bent about 65° at the knuckles (joints straight). Held about 1 s.
 * FLIP   the hands turn over the top and outward along the arc (a slight rise):
 *        fingers inward → up → outward, palm down → toward the centre → up.
 * END    out to the sides at about shoulder height, palm UP (slightly toward the
 *        viewer), fingers straight and pointing outward. Held, then back to rest.
 *
 * Poses are written for the character's right hand (bone side L, viewer's left);
 * the left hand is its mirror image. Nothing outside this file changes.
 */
import type { Object3D } from 'three'
import { createSignAnimation, REST_LEFT, type ArmPose, type SignAnimation, type SignPose } from '../armPlayback'
import type { HandShape } from '../handArticulation'
import { mirror } from './shared'

export const KAYAH_DURATION = 3.5

/** START: fingers together, bent about 65° at the knuckles, finger joints nearly straight. */
const DRAPED: HandShape = {
  curl: { thumb: [.25, .2, .1], index: [1.12, .2, .1], middle: [1.2, .19, .1], ring: [1.2, .19, .1], pinky: [1.17, .2, .1] },
  spread: { thumb: -.1, index: -.03, middle: 0, ring: .02, pinky: .04 },
  thumbOpposition: .3,
}
/** Half-way through the flip. */
const OPENING: HandShape = {
  curl: { thumb: [.15, .15, .08], index: [.55, .2, .1], middle: [.6, .18, .1], ring: [.6, .18, .1], pinky: [.6, .2, .1] },
  spread: { thumb: -.15, index: -.03, middle: 0, ring: .02, pinky: .05 },
  thumbOpposition: .15,
}
/** END: open hand, fingers together, about 10° of natural bend at each joint. */
const OPEN_UP: HandShape = {
  curl: { thumb: [.08, .08, .05], index: [.1, .17, .1], middle: [.11, .17, .1], ring: [.11, .17, .1], pinky: [.12, .17, .1] },
  spread: { thumb: -.2, index: -.03, middle: 0, ring: .02, pinky: .05 },
  thumbOpposition: .05,
}

// Model space: +y up, +z toward the viewer; the right hand works on -x (centre of the body is +x).
// Shoulder (bone side L) at [-.6, 3.83, 0]; character arm length 1.39.
// Raw `palm` field is the normal of the BACK of the hand (minus the recorded palm normal).
const pose = (wrist: number[], direction: number[], palm: number[], handShape: HandShape, elbow: number[]): ArmPose =>
  ({ wrist, direction, palm, gather: 0, handShape, elbow })

/** Rising from rest. */
const rising = pose([-1.05, 3.3, .6], [.6, .6, .3], [-.1, .6, .6], DRAPED, [-1.3, 3.0, .3])
/** START (recorded: wrist .15 out, .13 up, .59 forward arm lengths from the shoulder). */
const start = pose([-.81, 4.01, .82], [.98, .1, .11], [-.09, .84, .39], DRAPED, [-1.25, 3.3, .6])
/** FLIP, over the top: fingers up, palm toward the centre, a little higher than the straight path. */
const flip = pose([-1.04, 3.92, .84], [-.05, 1, .1], [-.95, 0, -.05], OPENING, [-1.15, 3.15, .65])
/** END (recorded: wrist .47 out, .11 down, .58 forward arm lengths from the shoulder). */
const end = pose([-1.25, 3.68, .81], [-.99, 0, .1], [-.03, -.86, -.44], OPEN_UP, [-.95, 3.0, .7])
/** Back down toward rest. */
const lowering = pose([-1.25, 3.0, .45], [-.45, -.5, .3], [0, 0, -1], OPEN_UP, [-1.3, 2.8, -.1])

const keys: [number, ArmPose][] = [
  [0, REST_LEFT], [.15, REST_LEFT],
  [.35, rising],
  [.55, start],
  [1.55, start], // START hold: palms down, fingers pointing inward
  [1.8, flip], // turning over the top
  [2.05, end],
  [2.9, end], // END hold: palms up, fingers outward
  [3.2, lowering],
  [3.45, REST_LEFT],
  [KAYAH_DURATION, REST_LEFT],
]
// `left` drives bone side L (the character's right hand); `right` is its mirror image.
const poses: SignPose[] = keys.map(([time, arm]) => ({ time, left: arm, right: mirror(arm) }))

export function createKayahAnimation(model: Object3D): SignAnimation {
  return createSignAnimation(model, poses, KAYAH_DURATION, { continuous: true })
}
