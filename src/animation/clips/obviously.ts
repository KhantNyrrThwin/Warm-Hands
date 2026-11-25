import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, createDemoClip, one, OPEN, POINT, rest, SPREAD, type BodyKey } from './shared'
import { PINCHED } from './shapes'
import { turnBetween } from './turn'

/**
 * ထင်ရှား / obviously
 * 1. Body turned about 30° to the right: bunched fingers at the eye spring
 *    open into an index finger pointing straight forward (seeing clearly).
 * 2. Facing front again: the other hand is held up at the side, and the
 *    spread signing hand sweeps down in an arc from the chest to palm-down.
 * Signed with the LEFT hand, like the book picture.
 */
export const OBVIOUSLY_DURATION = 4.0

/** Bunched fingertips at the outer corner of the eye. */
const EYE = arm([-.62, 4.92, .8], [.25, .95, -.15], [.9, -.2, .3], PINCHED, [-1.35, 3.9, .4])
const FORWARD = arm([-.6, 4.6, 1.15], [0, .1, 1], [0, -1, .1], POINT, [-1.35, 3.8, .5])

/** Other hand held up at the side, fingers up, palm in. */
const HELD = arm([.62, 3.55, .65], [0, 1, .1], [-1, 0, 0], OPEN, [1.3, 2.9, .2])
/** Spread hand on the upper chest, fingers toward the other side. */
const SWEEP_TOP = arm([-.15, 3.55, .78], [.7, .6, .2], [0, 0, -1], SPREAD, [-1.2, 2.9, .3])
const SWEEP_MID = arm([-.22, 3.2, .85], [.85, .2, .35], [0, -.6, -.8], SPREAD, [-1.2, 2.8, .3])
/** Lower, palm down, fingers toward the other side. */
const SWEEP_LOW = arm([-.35, 2.95, .82], [.85, -.1, .4], [0, -1, 0], SPREAD, [-1.2, 2.6, .3])

const obviously: SignPose[] = [
  rest(0), rest(.45),
  one(.95, EYE),
  one(1.15, EYE),
  one(1.45, FORWARD),
  one(1.8, FORWARD),
  { time: 2.35, left: SWEEP_TOP, right: HELD },
  { time: 2.55, left: SWEEP_TOP, right: HELD },
  { time: 2.8, left: SWEEP_MID, right: HELD },
  { time: 3.05, left: SWEEP_LOW, right: HELD },
  { time: 3.35, left: SWEEP_LOW, right: HELD },
  rest(OBVIOUSLY_DURATION),
]

const OBVIOUSLY_BODY: BodyKey[] = [
  { time: 0 },
  ...turnBetween(30, .05, .5, 1.85, 2.3),
  { time: OBVIOUSLY_DURATION },
]

export function createObviouslyAnimation(model: Object3D) {
  return createDemoClip(model, obviously, OBVIOUSLY_DURATION, OBVIOUSLY_BODY, 0, 'left')
}
