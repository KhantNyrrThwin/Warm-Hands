import type { Object3D } from 'three'
import { createSignAnimation, REST_LEFT, REST_RIGHT, type ArmPose, type SignPose } from './armPlayback'

export const I_DURATION = 3.8
// A–E: rest, open hand rises, palm touches chest, withdraw, rest.
// Active hand is on the viewer's left, matching the supplied photos.
const open: ArmPose['handShape'] = {
  curl: { thumb: .08, index: .03, middle: .03, ring: .04, pinky: .06 },
  spread: { index: -.10, middle: 0, ring: .08, pinky: .16 },
  thumbOpposition: .12,
}
const raised: ArmPose = {
  wrist: [-.73, 3.03, .59], direction: [.35, .92, .08],
  palm: [.1, .05, -.99], gather: .05, handShape: open,
  elbow: [-1.03, 3.02, .2],
}
const chest: ArmPose = {
  wrist: [-.24, 3.04, .40], direction: [.66, .75, -.02],
  palm: [.08, -.05, -.99], gather: .05, handShape: open,
  elbow: [-.96, 3.03, .16],
}
const pose = (time: number, right: ArmPose): SignPose => ({ time, left: REST_LEFT, right })
const poses: SignPose[] = [
  pose(0, REST_RIGHT),
  pose(.18, REST_RIGHT),
  pose(.9, raised),
  pose(1.55, chest),
  pose(2.2, chest),
  pose(2.85, { ...raised, wrist: [-.74, 2.98, .60] }),
  pose(I_DURATION, REST_RIGHT),
]
export function createIAnimation(model: Object3D) {
  return createSignAnimation(model, poses, I_DURATION, { continuous: true })
}
