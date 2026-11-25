/**
 * Copy this file to `src/animation/clips/aids.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  aids
 * Myanmar:  အေအိုင်ဒီအက်စ်
 * English:  AIDS
 */
import type { Object3D } from 'three'
import {
  createSignAnimation,
  REST_LEFT,
  REST_RIGHT,
  type ArmPose,
  type SignPose,
} from '../armPlayback'
import type { HandShape } from '../handArticulation'

export const AIDS_DURATION = 3.2

const L = REST_LEFT
const R = REST_RIGHT

const INDEX_UP_SHAPE: HandShape = {
  curl: { thumb: 0.45, index: 0.05, middle: 0.85, ring: 0.88, pinky: 0.9 },
  spread: { index: 0, middle: 0.04, ring: 0.06, pinky: 0.08 },
  thumbOpposition: 0.35,
}

const POINT_LEFT_INDEX_SHAPE: HandShape = {
  curl: { thumb: 0.45, index: 0.05, middle: 0.85, ring: 0.88, pinky: 0.9 },
  spread: { index: 0, middle: 0.04, ring: 0.06, pinky: 0.08 },
  thumbOpposition: 0.35,
}

// Right hand positioned comfortably lower with palm facing left (+X)
const rightIndexUp: ArmPose = {
  wrist: [0.34, 2.88, 0.68],
  direction: [0.0, 0.98, 0.2],
  palm: [1.0, 0.0, 0.0],
  gather: 0.15,
  fingers: { index: 0.0, middle: 0.85, ring: 0.88, pinky: 0.9, thumb: 0.45 },
  handShape: INDEX_UP_SHAPE,
}

// Left hand positioned higher with a level pointing direction
const leftAtTip: ArmPose = {
  wrist: [-0.34, 3.60, 0.68],
  direction: [0.98, 0.0, 0.2],
  palm: [0.0, 1.0, 0.0],
  gather: 0.15,
  fingers: { index: 0.0, middle: 0.85, ring: 0.88, pinky: 0.9, thumb: 0.45 },
  handShape: POINT_LEFT_INDEX_SHAPE,
}

// Left index slides down to the middle/base of the right index finger
const leftAtBase: ArmPose = {
  wrist: [-0.34, 3.39, 0.68],
  direction: [0.98, -0.04, 0.19],
  palm: [0.0, 1.0, 0.0],
  gather: 0.15,
  fingers: { index: 0.0, middle: 0.85, ring: 0.88, pinky: 0.9, thumb: 0.45 },
  handShape: POINT_LEFT_INDEX_SHAPE,
}

const poses: SignPose[] = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Bring right index up and left index to meet its tip perpendicularly
  { time: 0.85, left: leftAtTip, right: rightIndexUp },
  { time: 1.15, left: leftAtTip, right: rightIndexUp },

  // Sweep left index down along the right index to the middle/base
  { time: 1.85, left: leftAtBase, right: rightIndexUp },
  { time: 2.35, left: leftAtBase, right: rightIndexUp },

  // Return to rest
  { time: AIDS_DURATION, left: L, right: R },
]

export function createAidsAnimation(model: Object3D) {
  return createSignAnimation(model, poses, AIDS_DURATION, { continuous: true })
}