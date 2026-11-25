/**
 * Copy this file to `src/animation/clips/have_question.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  have_question
 * Myanmar:  မေးခွန်းရှိသည်
 * English:  Have question
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

type FacialSignPose = SignPose & {
  head?: [number, number, number]
  eyebrows?: number
}

export const HAVE_QUESTION_DURATION = 3.0

const L = REST_LEFT
const R = REST_RIGHT

// Left hand raised with palm facing outward
const leftRaised: ArmPose = {
  wrist: [-0.48, 3.45, 0.58],
  direction: [-0.05, 0.96, 0.28],
  palm: [0.25, 0.15, -0.96],
  gather: 0.12,
  handShape: HAND_SHAPES.open,
}

// Left hand lowered slightly with palm facing outward
const leftLowered: ArmPose = {
  wrist: [-0.50, 3.18, 0.62],
  direction: [-0.08, 0.88, 0.46],
  palm: [0.25, 0.25, -0.93],
  gather: 0.15,
  handShape: HAND_SHAPES.open,
}

const poses: FacialSignPose[] = [
  { time: 0.0, left: L, right: R, head: [0, 0, 0], eyebrows: 0 },
  { time: 0.2, left: L, right: R, head: [0, 0, 0], eyebrows: 0 },

  // Raise left hand, tilt head slightly downward, raise eyebrows
  { time: 0.85, left: leftRaised, right: R, head: [0.16, 0, -0.04], eyebrows: 0.6 },
  { time: 1.15, left: leftRaised, right: R, head: [0.18, 0, -0.04], eyebrows: 0.65 },

  // Lower left hand slightly while holding the questioning expression
  { time: 1.65, left: leftLowered, right: R, head: [0.20, 0, -0.05], eyebrows: 0.65 },
  { time: 2.25, left: leftLowered, right: R, head: [0.18, 0, -0.04], eyebrows: 0.6 },

  // Return to rest
  { time: HAVE_QUESTION_DURATION, left: L, right: R, head: [0, 0, 0], eyebrows: 0 },
]

export function createHaveQuestionAnimation(model: Object3D) {
  return createSignAnimation(model, poses, HAVE_QUESTION_DURATION, { continuous: true })
}