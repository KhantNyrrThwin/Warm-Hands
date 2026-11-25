/**
 * Copy this file to `src/animation/clips/who.ts`.
 * Replace every PLACEHOLDER. Do not rename the sign id after you start.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  who
 * Myanmar:  ဘယ်သူ
 * English:  Who
 */
import {
  Bone,
  Mesh,
  PropertyBinding,
  Quaternion,
  Vector3,
  type Object3D,
} from 'three'
import {
  createSignAnimation,
  REST_LEFT,
  REST_RIGHT,
  type ArmPose,
  type SignPose,
} from '../armPlayback'
import { HAND_SHAPES, type HandShape } from '../handArticulation'

export const WHO_DURATION = 2.6

const L = REST_LEFT
const R = REST_RIGHT

interface BrowBoneEntry {
  node: Bone
  restPos: Vector3
  restQuat: Quaternion
}

interface BrowMorphEntry {
  influences: number[]
  index: number
  base: number
}

interface ExpressionSample {
  pitch: number
  brow: number
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

function collectEyebrowControllers(model: Object3D): {
  browBones: BrowBoneEntry[]
  browMorphs: BrowMorphEntry[]
} {
  const browBones: BrowBoneEntry[] = []
  const browMorphs: BrowMorphEntry[] = []

  model.traverse((obj) => {
    const norm = normalizeKey(obj.name || '')

    if (
      obj instanceof Bone &&
      (norm.includes('brow') || norm.includes('eyebrow'))
    ) {
      browBones.push({
        node: obj,
        restPos: obj.position.clone(),
        restQuat: obj.quaternion.clone(),
      })
    }

    if (obj instanceof Mesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
      for (const [key, index] of Object.entries(obj.morphTargetDictionary)) {
        const keyNorm = normalizeKey(key)
        if (
          (keyNorm.includes('brow') || keyNorm.includes('eyebrow')) &&
          (keyNorm.includes('up') ||
            keyNorm.includes('raise') ||
            keyNorm.includes('outer') ||
            keyNorm.includes('inner')) &&
          !keyNorm.includes('down')
        ) {
          browMorphs.push({
            influences: obj.morphTargetInfluences,
            index,
            base: obj.morphTargetInfluences[index] ?? 0,
          })
        }
      }
    }
  })

  return { browBones, browMorphs }
}

// Keyframe milestones for upward head tilt (negative pitch = chin up) & eyebrow raise
const EXPRESSION_KEYFRAMES: ExpressionSample[] extends never
  ? never
  : Array<{ time: number; pitch: number; brow: number }> = [
  { time: 0.0, pitch: 0, brow: 0 },
  { time: 0.20, pitch: 0, brow: 0 },
  { time: 0.65, pitch: -0.06, brow: 0.25 },
  { time: 0.95, pitch: -0.20, brow: 0.75 },
  { time: 1.25, pitch: -0.25, brow: 0.90 },
  { time: 1.55, pitch: -0.26, brow: 1.0 },
  { time: 2.05, pitch: -0.24, brow: 0.95 },
  { time: WHO_DURATION, pitch: 0, brow: 0 },
]

function sampleExpression(seconds: number): ExpressionSample {
  if (seconds <= EXPRESSION_KEYFRAMES[0].time) {
    return { pitch: EXPRESSION_KEYFRAMES[0].pitch, brow: EXPRESSION_KEYFRAMES[0].brow }
  }
  const last = EXPRESSION_KEYFRAMES[EXPRESSION_KEYFRAMES.length - 1]
  if (seconds >= last.time) {
    return { pitch: last.pitch, brow: last.brow }
  }

  for (let i = 0; i < EXPRESSION_KEYFRAMES.length - 1; i++) {
    const a = EXPRESSION_KEYFRAMES[i]
    const b = EXPRESSION_KEYFRAMES[i + 1]
    if (seconds >= a.time && seconds <= b.time) {
      const span = b.time - a.time || 1
      const u = Math.max(0, Math.min(1, (seconds - a.time) / span))
      const eased = u * u * (3 - 2 * u)
      return {
        pitch: a.pitch + (b.pitch - a.pitch) * eased,
        brow: a.brow + (b.brow - a.brow) * eased,
      }
    }
  }
  return { pitch: 0, brow: 0 }
}

const FLAT_HAND: HandShape = HAND_SHAPES.open ?? {
  curl: { thumb: 0.15, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.05 },
  spread: { thumb: 0.15, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.05 },
  thumbOpposition: 0.25,
}

const OPEN_SPREAD_HAND: HandShape = {
  curl: { thumb: 0.10, index: 0.08, middle: 0.08, ring: 0.08, pinky: 0.08 },
  spread: { thumb: 0.28, index: 0.18, middle: 0.14, ring: 0.18, pinky: 0.22 },
  thumbOpposition: 0.20,
}

// Phase 1: Both flat hands spaced apart on the chest with palms facing INWARD
const rightChestTouch: ArmPose = {
  wrist: [0.56, 3.44, 0.56],
  direction: [-0.76, 0.36, 0.54],
  palm: [0, 0, 1],
  elbow: [1.24, 2.76, 0.16],
  gather: 0.20,
  handShape: FLAT_HAND,
}

const leftChestTouch: ArmPose = {
  wrist: [-0.56, 3.44, 0.56],
  direction: [0.76, 0.36, 0.54],
  palm: [0, 0, 1],
  elbow: [-1.24, 2.76, 0.16],
  gather: 0.20,
  handShape: FLAT_HAND,
}

// Mid-transition: Hands sweeping higher and wider outward as palms rotate UPWARD
const rightSpreadMid: ArmPose = {
  wrist: [0.78, 3.42, 0.76],
  direction: [0.42, 0.26, 0.87],
  palm: [0.25, -0.72, 0.65],
  elbow: [1.28, 2.74, 0.18],
  gather: 0.22,
  handShape: OPEN_SPREAD_HAND,
}

const leftSpreadMid: ArmPose = {
  wrist: [-0.78, 3.42, 0.76],
  direction: [-0.42, 0.26, 0.87],
  palm: [-0.25, -0.72, 0.65],
  elbow: [-1.28, 2.74, 0.18],
  gather: 0.22,
  handShape: OPEN_SPREAD_HAND,
}

// Phase 2: Higher and wider open spread with palms facing UPWARD
const rightSpreadUp: ArmPose = {
  wrist: [1.14, 3.40, 0.84],
  direction: [0.68, 0.18, 0.71],
  palm: [0, -1, 0],
  elbow: [1.38, 2.72, 0.18],
  gather: 0.25,
  handShape: OPEN_SPREAD_HAND,
}

const leftSpreadUp: ArmPose = {
  wrist: [-1.14, 3.40, 0.84],
  direction: [-0.68, 0.18, 0.71],
  palm: [0, -1, 0],
  elbow: [-1.38, 2.72, 0.18],
  gather: 0.25,
  handShape: OPEN_SPREAD_HAND,
}

const poses: SignPose[] = [
  { time: 0.0, left: L, right: R },
  { time: 0.20, left: L, right: R },
  { time: 0.65, left: leftChestTouch, right: rightChestTouch },
  { time: 0.95, left: leftChestTouch, right: rightChestTouch },
  { time: 1.25, left: leftSpreadMid, right: rightSpreadMid },
  { time: 1.55, left: leftSpreadUp, right: rightSpreadUp },
  { time: 2.05, left: leftSpreadUp, right: rightSpreadUp },
  { time: WHO_DURATION, left: L, right: R },
]

export function createWhoAnimation(model: Object3D) {
  const headNode = findRigNode(model, ['head', 'Head', 'mixamorigHead'])
  const restHeadQuat = headNode ? headNode.quaternion.clone() : null
  const { browBones, browMorphs } = collectEyebrowControllers(model)
  const xAxis = new Vector3(1, 0, 0)

  const applyExpression = (pitch: number, brow: number): void => {
    if (headNode && restHeadQuat) {
      if (Math.abs(pitch) < 1e-5) {
        headNode.quaternion.copy(restHeadQuat)
      } else {
        const tiltQuat = new Quaternion().setFromAxisAngle(xAxis, pitch)
        headNode.quaternion.copy(restHeadQuat).premultiply(tiltQuat)
      }
    }

    for (const entry of browMorphs) {
      entry.influences[entry.index] = Math.min(1, entry.base + brow)
    }

    for (const entry of browBones) {
      entry.node.position.y = entry.restPos.y + brow * 0.015
    }
  }

  const clip = createSignAnimation(model, poses, WHO_DURATION, {
    continuous: true,
    after(seconds: number) {
      const { pitch, brow } = sampleExpression(seconds)
      applyExpression(pitch, brow)
    },
  })

  const applyExpressionReset = (): void => {
    applyExpression(0, 0)
    model.updateMatrixWorld(true)
  }

  return {
    ...clip,
    reset() {
      clip.reset()
      applyExpressionReset()
    },
    idle() {
      clip.idle()
      applyExpressionReset()
    },
  }
}