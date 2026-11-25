import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, createDemoClip, one, rest } from './shared'
import { V_HAND } from './shapes'

/**
 * အပြင်းအထန် / severe : a V hand (index and middle finger) lying across the
 * chest, palm up, flicks up in an arc to beside the head, fingers pointing up.
 * Signed with the LEFT hand, like the book picture.
 */
export const SEVERE_DURATION = 2.6

/** Across the chest, fingers pointing to the other side, palm up. */
const CHEST = arm([-.35, 3.3, .72], [1, 0, .1], [0, 1, 0], V_HAND, [-1.2, 2.75, .3])
/** Middle of the arc. */
const ARC = arm([-.8, 3.85, .7], [.35, .93, .1], [-.3, .1, .95], V_HAND, [-1.4, 3.0, .2])
/** Raised beside the head, fingers up, palm out. */
const UP = arm([-1.1, 4.5, .45], [-.05, 1, 0], [0, 0, 1], V_HAND, [-1.6, 3.4, .1])

const severe: SignPose[] = [
  rest(0), rest(.15),
  one(.6, CHEST),
  one(.95, CHEST),
  one(1.15, ARC),
  one(1.35, UP),
  one(1.85, UP),
  rest(SEVERE_DURATION),
]

export function createSevereAnimation(model: Object3D) {
  return createDemoClip(model, severe, SEVERE_DURATION, [], 0, 'left')
}
