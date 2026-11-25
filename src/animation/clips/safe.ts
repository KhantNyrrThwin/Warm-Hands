import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, both, createDemoClip, OPEN, rest, SPREAD } from './shared'
import { OK_HAND } from './shapes'

/**
 * လုံခြုံ / safe
 * 1. Arms crossed over the chest, each hand resting on the opposite shoulder.
 * 2. Both hands come forward to shoulder height, palms out, fingers spread,
 *    then make an OK circle (thumb and index) while arcing down and outward.
 * Signed with the LEFT arm in front, like the book picture.
 */
export const SAFE_DURATION = 3.6

/** Left hand on the right shoulder (left arm crossed in front). */
const CROSS_L = arm([.42, 3.52, .55], [.35, .9, -.25], [-.2, .3, -.93], OPEN, [-.75, 2.65, .55])
/** Right hand on the left shoulder (right arm crossed behind). */
const CROSS_R = arm([-.42, 3.46, .45], [-.35, .9, -.25], [.2, .3, -.93], OPEN, [.75, 2.65, .45])

/** Hands up at the shoulders, palms out, fingers spread. */
const OPEN_UP = arm([-.5, 3.85, .75], [0, 1, .05], [0, 0, 1], SPREAD, [-1.3, 3.0, .2])
/** Middle of the arc. */
const ARC = arm([-.62, 3.74, .78], [-.12, .99, 0], [0, 0, 1], OK_HAND, [-1.35, 3.0, .2])
/** End of the arc: OK circles, a little lower and further out. */
const OK_OUT = arm([-.78, 3.68, .7], [-.25, .96, 0], [0, 0, 1], OK_HAND, [-1.4, 3.0, .15])

const safe: SignPose[] = [
  rest(0), rest(.15),
  { time: .7, left: CROSS_L, right: CROSS_R },
  { time: 1.4, left: CROSS_L, right: CROSS_R },
  both(1.85, OPEN_UP),
  both(2.05, OPEN_UP),
  both(2.3, ARC),
  both(2.55, OK_OUT),
  both(2.95, OK_OUT),
  rest(SAFE_DURATION),
]

export function createSafeAnimation(model: Object3D) {
  return createDemoClip(model, safe, SAFE_DURATION, [], 0, 'left')
}
