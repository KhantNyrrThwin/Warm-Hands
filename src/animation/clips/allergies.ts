/**
 * Copy this file to `src/animation/clips/<sign_id>.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  allergies
 * Myanmar:  ဓာတ်မတည့်ခြင်း
 * English:  Allergies
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

export const ALLERGIES_DURATION = 3.2

const L = REST_LEFT
const R = REST_RIGHT

// --- Phase 1: Index fingers meet along a downward-left diagonal[cite: 1] ---
// Character's right hand (upper-right chest, pointing down-left toward left index)[cite: 1]
const rightPointTouch = {
  wrist: [0.85, 2.95, 0.65],
  direction: [-0.75, 0.55, 0.35],
  palm: [0, -0.45, 0.90],
  gather: 0,
  handShape: HAND_SHAPES.point,
};

// Character's left hand (lower-left chest, pointing up-right toward right index)[cite: 1]
const leftPointTouch = {
  wrist: [0.05, 3.55, 0.65],
  direction: [0.75, -0.55, 0.35],
  palm: [-0.35, 0.25, 0.90],
  gather: 0,
  handShape: HAND_SHAPES.point,
};

// --- Phase 2: Index fingers separate slightly along the diagonal[cite: 1] ---
const rightPointApart = {
  wrist: [1.05, 2.80, 0.62],
  direction: [-0.75, 0.55, 0.35],
  palm: [0, -0.45, 0.90],
  gather: 0,
  handShape: HAND_SHAPES.point,
};

const leftPointApart = {
  wrist: [-0.10, 3.68, 0.62],
  direction: [0.75, -0.55, 0.35],
  palm: [-0.35, 0.25, 0.90],
  gather: 0,
  handShape: HAND_SHAPES.point,
};

// --- Phase 3: Open splayed hands shaking ("incompatible" motion)[cite: 1] ---
// Right hand near chin/upper-center chest, oscillating wrist/rotation[cite: 1]
const rightShakeA = {
  wrist: [0.98, 2.75, 0.62],
  direction: [-0.18, 0.90, 0.40],
  palm: [0.84, 0.22, -0.50],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

const rightShakeB = {
  wrist: [0.98, 2.75, 0.62],
  direction: [-0.18, 0.90, 0.40],
  palm: [0.92, -0.14, -0.37],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

// Left hand lower-left, palm angled upward/inward, oscillating[cite: 1]
const leftShakeA = {
  wrist: [0.08, 3.55, 0.68],
  direction: [0.22, 0.88, 0.42],
  palm: [-0.84, 0.22, -0.50],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

const leftShakeB = {
  wrist: [0.08, 3.55, 0.68],
  direction: [0.22, 0.88, 0.42],
  palm: [-0.92, -0.14, -0.37],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

const poses: SignPose[] = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // 1. Index fingers meet[cite: 1]
  { time: 0.75, left: leftPointTouch, right: rightPointTouch },
  { time: 0.95, left: leftPointTouch, right: rightPointTouch },

  // 2. Pull apart slightly along the diagonal[cite: 1]
  { time: 1.30, left: leftPointApart, right: rightPointApart },

  // 3. Open hands and shake rapidly[cite: 1]
  { time: 1.55, left: leftShakeA, right: rightShakeA },
  { time: 1.72, left: leftShakeB, right: rightShakeB },
  { time: 1.89, left: leftShakeA, right: rightShakeA },
  { time: 2.06, left: leftShakeB, right: rightShakeB },
  { time: 2.23, left: leftShakeA, right: rightShakeA },
  { time: 2.40, left: leftShakeB, right: rightShakeB },

  // Return to rest
  { time: ALLERGIES_DURATION, left: L, right: R },
]

export function createAllergiesAnimation(model: Object3D) {
  return createSignAnimation(model, poses, ALLERGIES_DURATION, { continuous: true })
}