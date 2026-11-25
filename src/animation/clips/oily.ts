/**
 * Copy this file to `src/animation/clips/oily.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  oily
 * Myanmar:  အဆီ
 * English:  Oily
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

export const OILY_DURATION = 3.0

const L = REST_LEFT
const R = REST_RIGHT

// Separate object reference so armPlayback doesn't run its thumbsUp upward-roll override
const CURLED_FINGERS_SHAPE = { ...HAND_SHAPES.thumbsUp }

// Adjust between Math.PI / 2, -Math.PI / 2, or Math.PI if the thumb needs a different swing direction
const THUMB_DOWN_ANGLE = Math.PI / 2

const circleBack: ArmPose = {
  wrist: [-0.28, 3.08, 0.62],
  direction: [0.0, -1.0, 0.0],
  palm: [0.0, 0.0, -1.0],
  gather: 0.2,
  handShape: CURLED_FINGERS_SHAPE,
}

const circleRight: ArmPose = {
  wrist: [-0.20, 3.08, 0.70],
  direction: [0.0, -1.0, 0.0],
  palm: [0.0, 0.0, -1.0],
  gather: 0.2,
  handShape: CURLED_FINGERS_SHAPE,
}

const circleFront: ArmPose = {
  wrist: [-0.28, 3.08, 0.78],
  direction: [0.0, -1.0, 0.0],
  palm: [0.0, 0.0, -1.0],
  gather: 0.2,
  handShape: CURLED_FINGERS_SHAPE,
}

const circleLeft: ArmPose = {
  wrist: [-0.36, 3.08, 0.70],
  direction: [0.0, -1.0, 0.0],
  palm: [0.0, 0.0, -1.0],
  gather: 0.2,
  handShape: CURLED_FINGERS_SHAPE,
}

const poses: SignPose[] = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Move into position and trace two horizontal XZ circles
  { time: 0.65, left: circleBack, right: R },
  { time: 0.85, left: circleRight, right: R },
  { time: 1.05, left: circleFront, right: R },
  { time: 1.25, left: circleLeft, right: R },
  { time: 1.45, left: circleBack, right: R },
  { time: 1.65, left: circleRight, right: R },
  { time: 1.85, left: circleFront, right: R },
  { time: 2.05, left: circleLeft, right: R },
  { time: 2.25, left: circleBack, right: R },

  // Return to rest
  { time: OILY_DURATION, left: L, right: R },
]

const normalizeKey = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '')

function findRigNode(model: Object3D, rawName: string): Object3D | null {
  const sanitized = PropertyBinding.sanitizeNodeName(rawName)
  const targetNorm = normalizeKey(rawName)
  let fallback: Object3D | null = null

  model.traverse((obj) => {
    if (fallback) return
    if (obj.name === rawName || obj.name === sanitized) {
      fallback = obj
      return
    }
    if (obj instanceof Bone && normalizeKey(obj.name) === targetNorm) {
      fallback = obj
    }
  })

  return fallback
}

export function createOilyAnimation(model: Object3D) {
  const handL = findRigNode(model, 'hand.L')
  const thumb1L = findRigNode(model, 'thumb.01.L')
  let loggedMissing = false

  const zAxis = new Vector3(0, 0, 1)
  const swingQuat = new Quaternion()

  return createSignAnimation(model, poses, OILY_DURATION, {
    continuous: true,
    after(seconds: number) {
      if (!handL || !thumb1L) {
        if (!loggedMissing) {
          loggedMissing = true
          const boneNames: string[] = []
          model.traverse((o) => {
            if (o instanceof Bone) boneNames.push(o.name)
          })
          console.warn('[oily.ts] Still missing bones:', {
            handL: !!handL,
            thumb1L: !!thumb1L,
            sampleBones: boneNames.slice(0, 30),
          })
        }
        return
      }

      if (seconds <= 0.2 || seconds >= OILY_DURATION - 0.3) return

      const parentInvQ = handL.parent
        ? handL.parent.getWorldQuaternion(new Quaternion()).invert()
        : new Quaternion()
      const currentWorldQ = handL.getWorldQuaternion(new Quaternion())

      swingQuat.setFromAxisAngle(zAxis, THUMB_DOWN_ANGLE)
      const nextWorldQ = swingQuat.clone().multiply(currentWorldQ)
      handL.quaternion.copy(parentInvQ.multiply(nextWorldQ))
    },
  })
}