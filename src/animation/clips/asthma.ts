/**
 * Copy this file to `src/animation/clips/asthma.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  asthma
 * Myanmar:  ပန်းနာရင်ကျပ်ရောဂါ
 * English:  Asthma
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

export const ASTHMA_DURATION = 3.85

const L = REST_LEFT
const R = REST_RIGHT

// Stage 1: Lift out in front of the left chest with a natural forward-upward angle
const chestApproach: ArmPose = {
  wrist: [-0.34, 2.75, 0.88],
  direction: [0.35, 0.72, 0.60],
  palm: [0.68, -0.15, 0.72],
  elbow: [-1.18, 2.15, 0.15],
  gather: 0.05,
  handShape: HAND_SHAPES.open,
}

// Stage 2: Bring hand in front of the center chest just before touching down
const chestSettle: ArmPose = {
  wrist: [-0.22, 3.22, 0.84],
  direction: [0.78, 0.58, 0.24],
  palm: [0.30, -0.15, 0.94],
  elbow: [-1.16, 2.30, 0.15],
  gather: 0.05,
  handShape: HAND_SHAPES.open,
}

// Base orientation on the chest: fingers angled comfortably up-and-across, palm inward
const chestBase: Pick<ArmPose, 'direction' | 'palm' | 'elbow' | 'gather' | 'handShape'> = {
  direction: [0.82, 0.55, 0.15],
  palm: [0.18, -0.15, 0.97],
  elbow: [-1.15, 2.35, 0.15],
  gather: 0.05,
  handShape: HAND_SHAPES.open,
}

// Circular path centered on the middle of the chest (starts on the left side so entry flows right into the arc)
const circleLeft: ArmPose = { ...chestBase, wrist: [-0.26, 3.18, 0.76] }
const circleTop: ArmPose = { ...chestBase, wrist: [-0.16, 3.30, 0.76] }
const circleRight: ArmPose = { ...chestBase, wrist: [-0.06, 3.18, 0.76] }
const circleBottom: ArmPose = { ...chestBase, wrist: [-0.16, 3.06, 0.76] }

const poses: SignPose[] = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Smooth two-stage lift and inward turn onto the chest
  { time: 0.68, left: chestApproach, right: R },
  { time: 0.98, left: chestSettle, right: R },

  // Flow directly into the left edge of the circle and trace two smooth loops
  { time: 1.22, left: circleLeft, right: R },
  { time: 1.46, left: circleTop, right: R },
  { time: 1.70, left: circleRight, right: R },
  { time: 1.94, left: circleBottom, right: R },
  { time: 2.18, left: circleLeft, right: R },
  { time: 2.42, left: circleTop, right: R },
  { time: 2.66, left: circleRight, right: R },
  { time: 2.92, left: circleBottom, right: R },

  // Lift off gently back through the approach arc to rest
  { time: 3.16, left: chestSettle, right: R },
  { time: 3.36, left: chestApproach, right: R },
  { time: ASTHMA_DURATION, left: L, right: R },
]

export function createAsthmaAnimation(model: Object3D) {
  return createSignAnimation(model, poses, ASTHMA_DURATION, { continuous: true })
}