import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, createDemoClip, one, OPEN, rest } from './shared'

/**
 * သွား / go : the open hand, palm up, sweeps from in front of the body out
 * to the side and up, ending at shoulder height with the fingers pointing
 * away. Signed with the LEFT hand, like the book picture.
 */
export const GO_DURATION = 2.3

const START = arm([-.22, 3.2, .75], [-.9, .15, .4], [.13, .98, -.06], OPEN, [-1.2, 2.7, .2])
const MID = arm([-.75, 3.4, .75], [-.9, .25, .4], [.2, .97, -.05], OPEN, [-1.4, 2.8, .1])
const END = arm([-1.2, 3.75, .55], [-.8, .45, .4], [.36, .8, -.18], OPEN, [-1.6, 3.0, 0])

const go: SignPose[] = [
  rest(0), rest(.15),
  one(.55, START),
  one(.75, START),
  one(1.0, MID),
  one(1.3, END),
  one(1.7, END),
  rest(GO_DURATION),
]

export function createGoAnimation(model: Object3D) {
  return createDemoClip(model, go, GO_DURATION, [], 0, 'left')
}
