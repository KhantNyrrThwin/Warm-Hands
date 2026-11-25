/**
 * Copy this file to `src/animation/clips/sweet.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  sweet
 * Myanmar:  ချိုသော
 * English:  Sweet
 */
import { Bone, PropertyBinding, Quaternion, Vector3, type Object3D } from 'three'
import {
  createSignAnimation,
  REST_LEFT,
  REST_RIGHT,
  type ArmPose,
  type SignPose,
} from '../armPlayback'

export const SWEET_DURATION = 2.8

// Turn head slightly to the avatar's left (-X side)
const HEAD_TURN_LEFT = -0.38

const L = REST_LEFT
const R = REST_RIGHT

const normalizeKey = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '')

function findRigNode(model: Object3D, candidates: string[]): Object3D | null {
  for (const rawName of candidates) {
    const sanitized = PropertyBinding.sanitizeNodeName(rawName)
    const targetNorm = normalizeKey(rawName)
    let found: Object3D | null = null

    model.traverse((obj) => {
      if (found) return
      if (obj.name === rawName || obj.name === sanitized) {
        found = obj
        return
      }
      if (obj instanceof Bone && normalizeKey(obj.name) === targetNorm) {
        found = obj
      }
    })

    if (found) return found
  }
  return null
}

const smoothstep01 = (x: number): number => {
  const u = Math.max(0, Math.min(1, x))
  return u * u * (3 - 2 * u)
}

// Smoothly turn the head left as the hand rises, hold near the mouth, then return
function headTurnWeight(seconds: number): number {
  if (seconds <= 0.18 || seconds >= SWEET_DURATION - 0.2) return 0
  if (seconds < 0.85) {
    return smoothstep01((seconds - 0.18) / (0.85 - 0.18))
  }
  if (seconds > 1.85) {
    return 1 - smoothstep01((seconds - 1.85) / (SWEET_DURATION - 0.2 - 1.85))
  }
  return 1
}

// Thumb and index cross/touch while middle/ring/pinky stay curled
const SWEET_CRISS_CROSS_SHAPE = {
  curl: { thumb: 0, index: 0.2, middle: 0.96, ring: 0.98, pinky: 1.0 },
  spread: { index: -0.08, middle: 0.0, ring: 0.0, pinky: 0.0 },
  thumbOpposition: 0.42,
}

// Soft approach waypoint so lifting from rest toward the mouth eases in smoothly
const leftMouthApproach: ArmPose = {
  wrist: [-0.48, 3.84, 0.88],
  direction: [0.22, 0.88, -0.42],
  palm: [-0.76, -0.24, 0.60],
  elbow: [-1.20, 3.18, 0.24],
  gather: 0.35,
  fingers: { thumb: 0.1, index: 0.2, middle: 0.96, ring: 0.98, pinky: 1.0 },
  handShape: SWEET_CRISS_CROSS_SHAPE,
}

// Main pose: Left hand held clear in front of the mouth with palm facing slightly upward
const leftHeartMouth: ArmPose = {
  wrist: [-0.35, 4.32, 0.98],
  direction: [0.24, 0.88, -0.41],
  palm: [-0.74, -0.28, 0.61],
  elbow: [-1.14, 3.56, 0.26],
  gather: 0.38,
  fingers: { thumb: 0.1, index: 0.2, middle: 0.96, ring: 0.98, pinky: 1.0 },
  handShape: SWEET_CRISS_CROSS_SHAPE,
}

// Soft exit waypoint so lowering back to rest eases out cleanly
const leftMouthExit: ArmPose = {
  wrist: [-0.48, 3.66, 0.78],
  direction: [0.22, 0.72, -0.66],
  palm: [-0.78, -0.18, 0.60],
  elbow: [-1.20, 3.04, 0.20],
  gather: 0.25,
  fingers: { thumb: 0.08, index: 0.15, middle: 0.78, ring: 0.80, pinky: 0.82 },
  handShape: SWEET_CRISS_CROSS_SHAPE,
}

const poses: SignPose[] = [
  { time: 0.0, left: L, right: R },
  { time: 0.18, left: L, right: R },

  // Left hand rises toward the mouth while head turns left
  { time: 0.58, left: leftMouthApproach, right: R },

  // Hold criss-cross finger pose near the mouth
  { time: 1.00, left: leftHeartMouth, right: R },
  { time: 1.75, left: leftHeartMouth, right: R },

  // Return hand smoothly to rest
  { time: 2.22, left: leftMouthExit, right: R },
  { time: SWEET_DURATION, left: L, right: R },
]

export function createSweetAnimation(model: Object3D) {
  const headNode = findRigNode(model, ['head', 'Head', 'mixamorigHead'])
  const restHeadQuat = headNode ? headNode.quaternion.clone() : null
  const yAxis = new Vector3(0, 1, 0)

  const clip = createSignAnimation(model, poses, SWEET_DURATION, {
    continuous: true,
    after(seconds: number) {
      if (!headNode || !restHeadQuat) return
      const w = headTurnWeight(seconds)
      if (w <= 0) {
        headNode.quaternion.copy(restHeadQuat)
        return
      }
      const turnQuat = new Quaternion().setFromAxisAngle(yAxis, HEAD_TURN_LEFT * w)
      headNode.quaternion.copy(restHeadQuat).premultiply(turnQuat)
    },
  })

  const applyHeadReset = (): void => {
    if (headNode && restHeadQuat) {
      headNode.quaternion.copy(restHeadQuat)
      model.updateMatrixWorld(true)
    }
  }

  return {
    ...clip,
    reset() {
      clip.reset()
      applyHeadReset()
    },
    idle() {
      clip.idle()
      applyHeadReset()
    },
  }
}