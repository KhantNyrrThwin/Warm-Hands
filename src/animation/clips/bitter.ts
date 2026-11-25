/**
 * Copy this file to `src/animation/clips/bitter.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  bitter
 * Myanmar:  ခါးသော
 * English:  Bitter
 */
import type { Object3D } from 'three'
import {
  createSignAnimation,
  REST_LEFT,
  REST_RIGHT,
  type ArmPose,
  type SignPose,
} from '../armPlayback'

export const BITTER_DURATION = 3.0

const L = REST_LEFT
const R = REST_RIGHT

// Index finger slightly bent (~0.28 curl), other fingers curled in
const SLIGHTLY_BENT_INDEX_SHAPE = {
  curl: { thumb: 0.45, index: 0.3, middle: 0.85, ring: 0.88, pinky: 0.9 },
  spread: { index: 0, middle: 0.04, ring: 0.06, pinky: 0.08 },
  thumbOpposition: 0.35,
}

const BITTER_HAND_STATE = {
  gather: 0.15,
  fingers: { index: 0.28, middle: 0.85, ring: 0.88, pinky: 0.9, thumb: 0.45 },
  handShape: SLIGHTLY_BENT_INDEX_SHAPE,
}

// Mid-lift waypoint at chest height to guide the wrist turn cleanly without spinning
const leftBitterLift: ArmPose = {
  ...BITTER_HAND_STATE,
  wrist: [-0.24, 3.25, 0.85],
  direction: [0.15, 0.35, 0.92],
  palm: [-0.92, -0.05, 0.38],
  elbow: [-1.25, 2.5, 0.25],
}

// Left hand at the mouth with slightly bent index finger and palm facing right (-X)
const leftBitterMouth: ArmPose = {
  ...BITTER_HAND_STATE,
  wrist: [-0.10, 4.16, 1.0],
  direction: [0.15, 0.96, 0.15],
  palm: [-0.96, -0.05, 0.25],
  elbow: [-1.2, 2.9, 0.3],
}

// Lowered pose holding the exact same hand orientation and slightly bent index shape
const leftBitterLowered: ArmPose = {
  ...BITTER_HAND_STATE,
  wrist: [-0.20, 3.35, 0.88],
  direction: [0.15, 0.96, 0.15],
  palm: [-0.96, -0.05, 0.25],
  elbow: [-1.2, 2.4, 0.25],
}

const poses: SignPose[] = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Guided lift up to the mouth
  { time: 0.52, left: leftBitterLift, right: R },
  { time: 0.9, left: leftBitterMouth, right: R },
  { time: 1.35, left: leftBitterMouth, right: R },

  // Lower down while holding the same hand position/orientation
  { time: 2.15, left: leftBitterLowered, right: R },
  { time: 2.45, left: leftBitterLowered, right: R },

  // Return to rest
  { time: BITTER_DURATION, left: L, right: R },
]

export function createBitterAnimation(model: Object3D) {
  return createSignAnimation(model, poses, BITTER_DURATION, { continuous: true })
}