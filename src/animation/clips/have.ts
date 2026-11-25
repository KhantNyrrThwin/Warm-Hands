/**
 * Copy this file to `src/animation/clips/have.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  have
 * Myanmar:  ရှိသည်
 * English:  Have
 */
import { Bone, PropertyBinding, Quaternion, Vector3, type Object3D } from 'three'
import {
  createSignAnimation,
  REST_LEFT,
  REST_RIGHT,
  type ArmPose,
  type SignPose,
} from '../armPlayback'
import { HAND_SHAPES } from '../handArticulation'

export const HAVE_DURATION = 3.0

const L = REST_LEFT
const R = REST_RIGHT

interface NodKeyframe {
  time: number
  pitch: number
}

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

// Keyframe pitch milestones (radians) for a pronounced double nod
const NOD_KEYFRAMES: NodKeyframe[] = [
  { time: 0.0, pitch: 0 },
  { time: 0.2, pitch: 0 },
  { time: 0.80, pitch: -0.22 }, // Clear chin lift as hand raises
  { time: 1.12, pitch: 0.52 },  // Nod 1: deep downward dip
  { time: 1.44, pitch: -0.16 }, // Strong upward rebound between nods
  { time: 1.78, pitch: 0.58 },  // Nod 2: second deep downward dip
  { time: 2.15, pitch: -0.10 }, // Gentle lift before returning to neutral
  { time: 2.65, pitch: 0 },
  { time: HAVE_DURATION, pitch: 0 },
]

function sampleNodPitch(seconds: number): number {
  if (seconds <= NOD_KEYFRAMES[0].time) return NOD_KEYFRAMES[0].pitch
  const last = NOD_KEYFRAMES[NOD_KEYFRAMES.length - 1]
  if (seconds >= last.time) return last.pitch

  for (let i = 0; i < NOD_KEYFRAMES.length - 1; i++) {
    const a = NOD_KEYFRAMES[i]
    const b = NOD_KEYFRAMES[i + 1]
    if (seconds >= a.time && seconds <= b.time) {
      const span = b.time - a.time || 1
      const u = Math.max(0, Math.min(1, (seconds - a.time) / span))
      const eased = u * u * (3 - 2 * u)
      return a.pitch + (b.pitch - a.pitch) * eased
    }
  }
  return 0
}

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

const poses: SignPose[] = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Raise left hand
  { time: 0.80, left: leftRaised, right: R },
  { time: 1.12, left: leftRaised, right: R },

  // Lower left hand slightly while completing the nods
  { time: 1.44, left: leftLowered, right: R },
  { time: 1.78, left: leftLowered, right: R },
  { time: 2.15, left: leftLowered, right: R },

  // Return to rest
  { time: HAVE_DURATION, left: L, right: R },
]

export function createHaveAnimation(model: Object3D) {
  const headNode = findRigNode(model, ['head', 'Head', 'mixamorigHead'])
  const restHeadQuat = headNode ? headNode.quaternion.clone() : null
  const xAxis = new Vector3(1, 0, 0)

  const clip = createSignAnimation(model, poses, HAVE_DURATION, {
    continuous: true,
    after(seconds: number) {
      if (!headNode || !restHeadQuat) return
      const pitch = sampleNodPitch(seconds)
      if (Math.abs(pitch) < 1e-5) {
        headNode.quaternion.copy(restHeadQuat)
        return
      }
      const nodQuat = new Quaternion().setFromAxisAngle(xAxis, pitch)
      headNode.quaternion.copy(restHeadQuat).premultiply(nodQuat)
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