import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import type { HandShape } from '../handArticulation'
import { arm, both, createDemoClip, POINT, rest } from './shared'

/**
 * ဆရာဝန် / doctor
 * 1. In front of the chest, the right index finger crosses the middle of
 *    the left hand's upright index finger (a +).
 * 2. Both hands go up to the ears, index fingers hooked in like the ear
 *    pieces of a stethoscope.
 * Signed with the LEFT hand leading, like the book picture.
 */
export const DOCTOR_DURATION = 3.2

/** Index hooked, thumb against it, other fingers closed: holding an ear piece. */
const EARPIECE: HandShape = {
  curl: { thumb: [.35, .3, .2], index: [.35, .7, .4], middle: 1, ring: 1, pinky: 1 },
  thumbOpposition: .7,
}

/** Left hand: index straight up in front of the chest, palm toward the chest. */
const UPRIGHT = arm([-.04, 3.14, .74], [0, 1, .05], [0, 0, -1], POINT, [-1.2, 2.7, .2])
/** Right hand: index pointing across the body, crossing in front of the middle of the upright finger, palm down. */
const ACROSS = arm([.2, 3.56, 1.1], [-1, 0, -.05], [0, -1, 0], POINT, [1.2, 2.9, .3])
const UPRIGHT_IN = arm([-.1, 3.0, .6], [0, 1, .05], [0, 0, -1], POINT, [-1.2, 2.7, .2])
const ACROSS_IN = arm([.6, 3.5, .6], [-1, 0, .05], [0, -1, 0], POINT, [1.2, 3.0, .2])

/** Beside the ear, finger hooked in toward it. */
const EAR = arm([-1.12, 4.72, .3], [.22, .97, -.05], [1, 0, 0], EARPIECE, [-1.65, 3.7, .0])
const EAR_IN = arm([-1.05, 4.45, .45], [.22, .97, -.05], [1, 0, 0], EARPIECE, [-1.65, 3.7, .0])

const doctor: SignPose[] = [
  rest(0), rest(.15),
  { time: .55, left: UPRIGHT_IN, right: ACROSS_IN },
  { time: .8, left: UPRIGHT, right: ACROSS },
  { time: 1.3, left: UPRIGHT, right: ACROSS },
  both(1.75, EAR_IN),
  both(2.0, EAR),
  both(2.55, EAR),
  rest(DOCTOR_DURATION),
]

export function createDoctorAnimation(model: Object3D) {
  return createDemoClip(model, doctor, DOCTOR_DURATION, [], 0, 'left')
}
