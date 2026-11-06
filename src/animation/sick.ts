import type { Object3D } from 'three'
import { createSignAnimation, REST_LEFT, REST_RIGHT, type ArmPose, type SignPose } from './armPlayback'

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
  wrist: [-1.35, 5.8, 1.35], 
  direction: [-.35, .92, .18], 
  palm: [-.15, -.15, .97], 
  gather: .5, 
  handShape: open,
  elbow: [2.0, 3.8, .35],
}

const pose = (time: number, left: ArmPose): SignPose => ({ time, left, right: REST_RIGHT })

export const SICK_POSES: SignPose[] = [
  pose(0, REST_LEFT),
  pose(.2, REST_LEFT),
  pose(.72, { 
    wrist: [-1.2, 3.06, .65], 
    direction: [-.3, .4, .8],
    palm: [0, .85, -.4], 
    gather: .12, 
    handShape: relaxed,
    elbow: [1.6, 3.0, .2] 
  }),
  pose(1.34, { 
    wrist: [-1.75, 4.20, 1.25], 
    direction: [.65, .65, -.35], 
    palm: [-.2, -.1, .95], 
    gather: .4, 
    handShape: open,
    elbow: [2.3, 3.5, .4] 
  }),
  pose(2.05, forehead),
  pose(3.05, forehead),
  pose(3.67, { 
    ...forehead, 
    wrist: [-1.75, 4.40, 1.30],
    direction: [-.62, .68, .38], 
    elbow: [2.3, 3.5, .4] 
  }),
  pose(4.4, { 
    wrist: [-1.2, 3.06, .65], 
    direction: [-.2, .5, .8],
    palm: [0, .75, .6], 
    gather: .12, 
    handShape: relaxed,
    elbow: [1.6, 3.0, .2] 
  }),
  pose(SICK_DURATION, REST_LEFT),
]

export function createSickAnimation(model: Object3D) {
  return createSignAnimation(model, SICK_POSES, SICK_DURATION, { 
    continuous: true, 
    elbowPole: [2.2, 3.0, -.6] 
  })
}