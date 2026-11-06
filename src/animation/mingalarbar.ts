import type { Object3D } from 'three'
import { HAND_SHAPES } from './handArticulation'
import { createSignAnimation, mirrorArm, type ArmPose, type SignPose } from './armPlayback'

export const MINGALARBAR_DURATION = 5.05

const rest: ArmPose = { 
  wrist: [1.10, 2.54, 0], 
  direction: [-.045, -.27, 0], 
  palm: [0, 0, -1], 
  gather: 0, 
  handShape: HAND_SHAPES.open
}

const mirrored: Array<ArmPose & { time: number }> = [
  { time: 0, ...rest },
  { time: .20, ...rest },
  { time: .48, wrist: [.65, 2.90, .32], direction: [-.45, .89, 0], palm: [-.85, 0, .53], gather: .5 },
  { time: .78, wrist: [.21, 3.32, .62], direction: [-.16, .988, 0], palm: [-1, 0, .04], gather: .95 },
  { time: 1.08, wrist: [.105, 3.46, .69], direction: [-.12, .993, 0], palm: [-1, 0, 0], gather: 1 },
  { time: 4.08, wrist: [.105, 3.46, .69], direction: [-.12, .993, 0], palm: [-1, 0, 0], gather: 1 },
  { time: 4.32, wrist: [.21, 3.28, .60], direction: [-.16, .988, 0], palm: [-1, 0, .04], gather: .95 },
  { time: 4.62, wrist: [.65, 2.87, .31], direction: [-.45, .89, 0], palm: [-.85, 0, .53], gather: .5 },
  { time: MINGALARBAR_DURATION, ...rest },
]

const poses: SignPose[] = mirrored.map(({ time, ...pose }) => ({
  time,
  right: pose,
  left: mirrorArm(pose),
}))

export function createMingalarbarAnimation(model: Object3D) {
  return createSignAnimation(model, poses, MINGALARBAR_DURATION)
}
