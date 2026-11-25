import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { GRAM_POSE } from './gram'
import { arm, createDemoClip, one, rest } from './shared'
import { K_HAND } from './shapes'

/**
 * ကီလိုဂရမ် / kilogram
 * 1. K hand beside the face, palm out: index straight up, thumb touching the middle finger.
 * 2. Then the gram sign (ဂရမ်): index and thumb level and parallel with a small gap.
 * Signed with the LEFT hand, like the book picture.
 */
export const KILOGRAM_DURATION = 3.0

const K_POSE = arm([-.85, 4.0, .6], [.05, 1, 0], [0, 0, 1], K_HAND, [-1.5, 3.2, .2])

const kilogram: SignPose[] = [
  rest(0), rest(.15),
  one(.6, K_POSE),
  one(1.2, K_POSE),
  one(1.6, GRAM_POSE),
  one(2.3, GRAM_POSE),
  rest(KILOGRAM_DURATION),
]

export function createKilogramAnimation(model: Object3D) {
  return createDemoClip(model, kilogram, KILOGRAM_DURATION, [], 0, 'left')
}
