/**
 * Copy this file to `src/animation/clips/<sign_id>.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: YOUR_NAME
 * Sign id:  PLACEHOLDER
 * Myanmar:  PLACEHOLDER
 * English:  PLACEHOLDER
 */
import type { Object3D } from 'three'
import {
  createSignAnimation,
  REST_LEFT,
  REST_RIGHT,
  type ArmPose,
  type SignPose,
} from '../armPlayback'
import { HAND_SHAPES } from '../handArticulation'

export const PLACEHOLDER_DURATION = 3.0

const L = REST_LEFT
const R = REST_RIGHT

/** Example: open right hand raised in front of the chest. Change this. */
const raised: ArmPose = {
  wrist: [0.55, 3.20, 0.55],
  direction: [0, 0.95, 0.20],
  palm: [0, 0, -1],
  gather: 0,
  handShape: HAND_SHAPES.open,
}

const poses: SignPose[] = [
  { time: 0, left: L, right: R },
  { time: 0.2, left: L, right: R },
  { time: 0.8, left: L, right: raised },
  { time: 2.2, left: L, right: raised },
  { time: PLACEHOLDER_DURATION, left: L, right: R },
]

export function createPlaceholderAnimation(model: Object3D) {
  return createSignAnimation(model, poses, PLACEHOLDER_DURATION, { continuous: true })
}
