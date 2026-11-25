/**
 * Copy this file to `src/animation/clips/headache.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  headache
 * Myanmar:  ခေါင်းကိုက်ခြင်း
 * English:  Headache
 */
import { Bone, PropertyBinding, Quaternion, Vector3, type Object3D } from 'three'
import {
  createSignAnimation,
  REST_LEFT,
  REST_RIGHT,
  type ArmPose,
  type SignPose,
} from '../armPlayback'

export const HEADACHE_DURATION = 4.6

// Stronger right tilt (~14 deg) with matching hand shift and angle
const HEAD_TILT_RIGHT = -0.24
const HAND_SHIFT_X = 0.18
const HAND_DIR_TILT_X = 0.22

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

// Both hands hover outside the temples, tilted right with the head. Fingers flex in
// short scratching strokes; the wrists remain steady and never move inward to touch the head.
function temple(side: -1 | 1, curl: number): ArmPose {
  const baseY = side < 0 ? 5.03 : 4.70
  return {
    wrist: [side * 1.42 + HAND_SHIFT_X, baseY, 0.52],
    direction: [side * 0.12 + HAND_DIR_TILT_X, 0.99, 0.03],
    palm: [side, 0.12, 0],
    gather: 0.05,
    elbow: [side * 1.6 + HAND_SHIFT_X, 4.02, 0.18],
    handShape: {
      curl: { thumb: 0.28, index: curl, middle: curl + 0.04, ring: curl + 0.06, pinky: curl + 0.08 },
      spread: { index: -0.07, middle: 0, ring: 0.06, pinky: 0.12 },
      thumbOpposition: 0.22,
    },
  }
}

const raised = (time: number, curl: number): SignPose => ({
  time,
  left: temple(-1, curl),
  right: temple(1, curl),
})

const poses: SignPose[] = [
  { time: 0, left: REST_LEFT, right: REST_RIGHT },
  { time: 0.2, left: REST_LEFT, right: REST_RIGHT },
  raised(1.25, 0.32),
  raised(1.6, 0.64),
  raised(1.95, 0.32),
  raised(2.3, 0.64),
  raised(2.65, 0.32),
  raised(3.0, 0.64),
  raised(3.35, 0.32),
  raised(3.55, 0.32),
  { time: HEADACHE_DURATION, left: REST_LEFT, right: REST_RIGHT },
]

function tiltWeight(seconds: number): number {
  if (seconds <= 0.2 || seconds >= HEADACHE_DURATION - 0.2) return 0
  if (seconds < 1.25) {
    const u = (seconds - 0.2) / (1.25 - 0.2)
    return u * u * (3 - 2 * u)
  }
  if (seconds > 3.55) {
    const u = (HEADACHE_DURATION - 0.2 - seconds) / (HEADACHE_DURATION - 0.2 - 3.55)
    return Math.max(0, Math.min(1, u * u * (3 - 2 * u)))
  }
  return 1
}

export function createHeadacheAnimation(model: Object3D) {
  const headNode = findRigNode(model, ['head', 'Head', 'mixamorigHead'])
  const restHeadQuat = headNode ? headNode.quaternion.clone() : null
  const zAxis = new Vector3(0, 0, 1)

  const clip = createSignAnimation(model, poses, HEADACHE_DURATION, {
    continuous: true,
    elbowPole: [2.0, 3.3, -0.8],
    after(seconds: number) {
      if (!headNode || !restHeadQuat) return
      const w = tiltWeight(seconds)
      if (w <= 0) {
        headNode.quaternion.copy(restHeadQuat)
        return
      }
      const tiltQuat = new Quaternion().setFromAxisAngle(zAxis, HEAD_TILT_RIGHT * w)
      headNode.quaternion.copy(restHeadQuat).premultiply(tiltQuat)
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
    apply(seconds: number) {
      if (seconds >= 1.25 && seconds <= 3.35) {
        const phase = (seconds - 1.25) / 0.35
        const step = Math.min(5, Math.floor(phase))
        const fraction = phase - step
        const eased = fraction * fraction * (3 - 2 * fraction)
        clip.apply(1.25 + (step + eased) * 0.35)
      } else {
        clip.apply(seconds)
      }
    },
  }
}