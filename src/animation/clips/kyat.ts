/**
 * Copy this file to `src/animation/clips/kyat.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  kyat
 * Myanmar:  ကျပ်
 * English:  Kyat
 */
import type { Object3D } from 'three'
import {
  createSignAnimation,
  REST_LEFT,
  REST_RIGHT,
  type ArmPose,
  type SignPose,
} from '../armPlayback'
import { HAND_SHAPES, type HandShape } from '../handArticulation'

export const KYAT_DURATION = 2.8

const L = REST_LEFT
const R = REST_RIGHT

export const CUP: HandShape = {
  curl: {
    thumb: [0.56, 0.58, 0.55],
    index: [0.75, 0.75, 0.48],
    middle: [0.79, 0.75, 0.48],
    ring: [0.83, 0.75, 0.48],
    pinky: [0.87, 0.75, 0.48],
  },
  spread: {
    thumb: -0.25,
    index: -0.02,
    ring: 0.03,
    pinky: 0.06,
  },
  thumbOpposition: 0.25,
}

const POINT_SHAPE: HandShape = HAND_SHAPES.point ?? {
  curl: { thumb: 0.72, index: 0.0, middle: 0.96, ring: 0.98, pinky: 1.0 },
  spread: { index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 },
  thumbOpposition: 0.65,
}

// Right hand: straight vertical pointer on the right side (+X), palm facing left
const rightPointApproach: ArmPose = {
  wrist: [0.34, 2.52, 0.78],
  direction: [0, 1, 0],
  palm: [0.85, 0, -0.53],
  elbow: [1.02, 2.12, 0.22],
  gather: 0.25,
  handShape: POINT_SHAPE,
}

const rightPointHold: ArmPose = {
  wrist: [0.30, 2.74, 0.86],
  direction: [0, 1, 0],
  palm: [1, 0, 0],
  elbow: [0.96, 2.28, 0.24],
  gather: 0.30,
  handShape: POINT_SHAPE,
}

// Left hand: shifted back toward the left (-X), descending to meet the pointer tip from above
const leftCircleApproach: ArmPose = {
  wrist: [-0.28, 4.18, 0.82],
  direction: [0.16, 0.86, -0.48],
  palm: [-0.85, 0, 0.53],
  elbow: [-1.14, 3.48, 0.22],
  gather: 0.25,
  handShape: CUP,
}

const leftCircleMeet: ArmPose = {
  wrist: [0.06, 3.46, 0.86],
  direction: [0.20, 0.84, -0.50],
  palm: [-1, 0, 0],
  elbow: [-1.08, 3.04, 0.24],
  gather: 0.30,
  handShape: CUP,
}

// Subtle touch at the top of the extended pointer finger
const leftCircleTouch: ArmPose = {
  wrist: [0.06, 3.40, 0.86],
  direction: [0.20, 0.84, -0.50],
  palm: [-1, 0, 0],
  elbow: [-1.08, 3.00, 0.24],
  gather: 0.30,
  handShape: CUP,
}

const poses: SignPose[] = [
  { time: 0.0, left: L, right: R },
  { time: 0.20, left: L, right: R },
  { time: 0.65, left: leftCircleApproach, right: rightPointApproach },
  { time: 1.05, left: leftCircleMeet, right: rightPointHold },
  { time: 1.50, left: leftCircleTouch, right: rightPointHold },
  { time: 1.95, left: leftCircleMeet, right: rightPointHold },
  { time: 2.40, left: leftCircleApproach, right: rightPointApproach },
  { time: KYAT_DURATION, left: L, right: R },
]

export function createKyatAnimation(model: Object3D) {
  return createSignAnimation(model, poses, KYAT_DURATION, { continuous: true })
}