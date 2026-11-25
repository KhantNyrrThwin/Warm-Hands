import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, createDemoClip, one, rest } from './shared'
import { B_HAND, L_HAND } from './shapes'

/**
 * ပေါင် / pound (weight)
 * 1. L hand in front of the chest, palm out: index straight up, thumb out to the side.
 * 2. The same hand, a little higher: four fingers straight up, thumb folded across the palm.
 * Signed with the LEFT hand, like the book picture.
 */
export const POUND_DURATION = 2.8

const L_POSE = arm([-.22, 3.35, .72], [0, 1, .05], [0, 0, 1], L_HAND, [-1.2, 2.8, .2])
const B_POSE = arm([-.25, 3.48, .74], [0, 1, .05], [0, 0, 1], B_HAND, [-1.2, 2.85, .2])

const pound: SignPose[] = [
  rest(0), rest(.15),
  one(.6, L_POSE),
  one(1.2, L_POSE),
  one(1.5, B_POSE),
  one(2.1, B_POSE),
  rest(POUND_DURATION),
]

export function createPoundAnimation(model: Object3D) {
  return createDemoClip(model, pound, POUND_DURATION, [], 0, 'left')
}
