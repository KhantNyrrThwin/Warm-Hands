/**
 * Copy this file to `src/animation/clips/muscle.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  muscle
 * Myanmar:  ကြွက်သား
 * English:  Muscle
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

export const MUSCLE_DURATION = 3.2

const L = REST_LEFT
const R = REST_RIGHT

// Curved "C" hand shape
const C_SHAPE: HandShape = {
  curl: {
    thumb: 0.45,
    index: [0.42, 0.55, 0.40],
    middle: [0.45, 0.58, 0.42],
    ring: [0.48, 0.60, 0.44],
    pinky: [0.50, 0.62, 0.46],
  },
  spread: { thumb: 0.22, index: 0.08, middle: 0.06, ring: 0.08, pinky: 0.12 },
  thumbOpposition: 0.55,
}

// Pinch hand shape: thumb at 0.45 curl, four fingers slightly bent for second position
const PINCH_SHAPE: HandShape = {
  curl: {
    thumb: 0.45,
    index: [0.80, 0.34, 0.26],
    middle: [0.78, 0.32, 0.25],
    ring: [0.76, 0.30, 0.24],
    pinky: [0.74, 0.28, 0.22],
  },
  spread: { thumb: 0.03, index: 0.02, middle: 0.05, ring: 0.07, pinky: 0.09 },
  thumbOpposition: 0.95,
}

// Locked first pose: Left hand lowered (-Y) and nudged slightly outward (-X) from midline
const leftCMeet: ArmPose = {
  wrist: [-0.35, 3.18, 0.76],
  direction: [0.39, 0.92, 0.0],
  palm: [-0.92, 0.39, 0.0],
  elbow: [-0.88, 2.52, 0.20],
  gather: 0.24,
  handShape: C_SHAPE,
}

// Locked first pose: Right hand raised (+Y), nudged slightly outward (+X) from midline, rotated 180° in YZ
const rightCMeet: ArmPose = {
  wrist: [0.35, 3.66, 0.76],
  direction: [-0.39, -0.92, 0.0],
  palm: [0.92, -0.39, 0.0],
  elbow: [0.88, 2.96, 0.20],
  gather: 0.24,
  handShape: C_SHAPE,
}

// Second pose (left hand): Raised higher (+Y), rotated 180° along YZ into pinch shape
const leftPinchPose: ArmPose = {
  wrist: [-0.60, 3.12, 0.80],
  direction: [0.39, -0.92, 0.0],
  palm: [-0.92, -0.39, 0.0],
  elbow: [-1.10, 2.50, 0.22],
  gather: 0.18,
  handShape: PINCH_SHAPE,
}

// Second pose (right hand): Mirrored across X into pinch hand shape
const rightPinchPose: ArmPose = {
  wrist: [0.60, 2.80, 0.80],
  direction: [-0.39, 0.92, 0.0],
  palm: [0.92, 0.39, 0.0],
  elbow: [1.10, 2.18, 0.22],
  gather: 0.18,
  handShape: PINCH_SHAPE,
}

const poses: SignPose[] = [
  { time: 0.0, left: L, right: R },
  { time: 0.20, left: L, right: R },

  // First pose (locked): brisk lift from rest, steady hold
  { time: 0.75, left: leftCMeet, right: rightCMeet },
  { time: 1.55, left: leftCMeet, right: rightCMeet },

  // Second pose: smooth transition into pinch pose
  { time: 2.20, left: leftPinchPose, right: rightPinchPose },
  { time: 2.35, left: leftPinchPose, right: rightPinchPose },

  // Long, gradual return to rest
  { time: MUSCLE_DURATION, left: L, right: R },
]

export function createMuscleAnimation(model: Object3D) {
  return createSignAnimation(model, poses, MUSCLE_DURATION, { continuous: true })
}