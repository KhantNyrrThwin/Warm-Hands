/**
 * Copy this file to `src/animation/clips/liver.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  liver
 * Myanmar:  အသည်း
 * English:  Liver
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

export const LIVER_DURATION = 3.0

const L = REST_LEFT
const R = REST_RIGHT

// Stage 1: Lift out beside the left torso with a natural diagonal angle so the wrist turns smoothly
const torsoApproach: ArmPose = {
  wrist: [-0.74, 2.45, 0.80],
  direction: [0.42, 0.45, 0.78],
  palm: [0.68, -0.15, 0.72],
  elbow: [-1.42, 2.05, 0.10],
  gather: 0.05,
  handShape: HAND_SHAPES.open,
}

// Stage 2: Bring open left hand to the far-left edge just before placing it flat
const torsoSettle: ArmPose = {
  wrist: [-0.68, 2.75, 0.72],
  direction: [0.85, 0.35, 0.38],
  palm: [0.52, -0.15, 0.84],
  elbow: [-1.40, 2.18, 0.12],
  gather: 0.05,
  handShape: HAND_SHAPES.open,
}

// Flat open left hand pushed further left (-0.66) along the outer left torso
const leftTorsoCover: ArmPose = {
  wrist: [-0.66, 2.78, 0.66],
  direction: [0.92, 0.32, 0.22],
  palm: [0.52, -0.15, 0.84],
  elbow: [-1.40, 2.20, 0.14],
  gather: 0.05,
  handShape: HAND_SHAPES.open,
}

const poses: SignPose[] = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Smooth two-stage approach to avoid wrist snap
  { time: 0.5, left: torsoApproach, right: R },
  { time: 0.75, left: torsoSettle, right: R },

  // Place hand flat over the far-left torso and hold
  { time: 0.92, left: leftTorsoCover, right: R },
  { time: 2.05, left: leftTorsoCover, right: R },

  // Lift off smoothly back through the approach waypoints to rest
  { time: 2.3, left: torsoSettle, right: R },
  { time: 2.6, left: torsoApproach, right: R },
  { time: LIVER_DURATION, left: L, right: R },
]

export function createLiverAnimation(model: Object3D) {
  return createSignAnimation(model, poses, LIVER_DURATION, { continuous: true })
}