import type { Object3D } from 'three'
import { createSignAnimation, REST_LEFT, REST_RIGHT, type ArmPose, type SignPose } from './armPlayback'

// Eight references, in filename order: 01, 02, 3, 4, 5, 6, 7, 8.
// The newer stills show the active hand on the viewer's left (avatar right).
// Positions are fitted to the avatar's shoulder/arm reach, not image pixels.
export const SICK_DURATION = 5.2

const relaxed: ArmPose['handShape'] = {
  curl: { thumb: .2, index: .25, middle: .3, ring: .35, pinky: .4 },
  thumbOpposition: .15,
}
const open: ArmPose['handShape'] = {
  curl: { thumb: .08, index: .02, middle: .02, ring: .03, pinky: .04 },
  spread: { index: -.04, middle: 0, ring: .025, pinky: .05 },
  thumbOpposition: .08,
}
const forehead: ArmPose = {
  // Reach up to the forehead, with forward clearance rather than covering the eyes.
  // The rig's short arms clamp the wrist reach; upright fingers carry the pose above the brows.
  wrist: [-.60, 6.0, 1.20], direction: [.12, .992, .03],
  palm: [0, -.02, 1], gather: .5, handShape: open,
  elbow: [-1.55, 4.05, .22],
}
const pose = (time: number, right: ArmPose): SignPose => ({ time, left: REST_LEFT, right })

export const SICK_POSES: SignPose[] = [
  pose(0, REST_RIGHT),                                                // 01: rest
  pose(.2, REST_RIGHT),
  pose(.72, { wrist: [-.98, 3.06, .55], direction: [.2, .4, .85],
    palm: [0, .92, -.35], gather: .12, handShape: relaxed,
    elbow: [-1.25, 3.05, .12] }),                                    // 02: release fingers
  pose(1.34, { wrist: [-1.0, 4.12, .86], direction: [.63, .76, .12],
    palm: [.02, -.12, .99], gather: .4, handShape: open,
    elbow: [-1.55, 3.75, .22] }),                                    // 3: open, raise
  pose(2.05, forehead),                                              // 4: reach forehead
  pose(3.05, forehead),                                              // 5: brief hold
  pose(3.67, { ...forehead, wrist: [-1.02, 4.40, .94],
    direction: [.58, .77, .25], elbow: [-1.5, 3.7, .22] }),           // 6: withdraw
  pose(4.4, { wrist: [-1.04, 3.06, .58], direction: [.1, .55, .82],
    palm: [0, .8, .6], gather: .12, handShape: relaxed,
    elbow: [-1.3, 3.05, .12] }),                                    // 7: lower, relax
  pose(SICK_DURATION, REST_RIGHT),                                   // 8: rest
]

export function createSickAnimation(model: Object3D) {
  return createSignAnimation(model, SICK_POSES, SICK_DURATION, { continuous: true })
}
