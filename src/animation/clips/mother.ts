import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, at, createDemoClip, one, POINT, rest } from './shared'

/**
 * အမေ / mother : the index finger points at the earlobe (an earring) and
 * draws small circles there. Signed with the LEFT hand, like the book picture.
 */
export const MOTHER_DURATION = 2.8

/** Index finger pointing in at the earlobe. */
const EARLOBE = arm([-1.5, 4.78, .3], [1, .15, 0], [0, -1, .15], POINT, [-1.9, 3.8, .1])
/** Radius of the circles the hand draws around the earlobe. */
const RADIUS = .13

function circles(start: number, span: number, turns: number): SignPose[] {
  const steps = 12 * turns
  const [x, y, z] = EARLOBE.wrist
  return Array.from({ length: steps + 1 }, (_, i) => {
    const theta = (i / steps) * Math.PI * 2 * turns
    return one(start + (i / steps) * span, at(EARLOBE, [x, y + RADIUS * Math.sin(theta), z + RADIUS * (Math.cos(theta) - 1)]))
  })
}

const mother: SignPose[] = [
  rest(0), rest(.15),
  one(.6, EARLOBE),
  ...circles(.75, 1.2, 2),
  one(2.1, EARLOBE),
  rest(MOTHER_DURATION),
]

export function createMotherAnimation(model: Object3D) {
  return createDemoClip(model, mother, MOTHER_DURATION, [], 0, 'left')
}
