import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, at, createDemoClip, one, rest, SPREAD } from './shared'

/** ၅ / five : spread hand raised, palm to the viewer. */
export const FIVE_DURATION = 2.3

const fiveHand = arm([-.62, 3.75, .78], [.05, .99, .05], [0, 0, 1], SPREAD, [-1.3, 3.0, .2])

const five: SignPose[] = [
  rest(0), rest(.15),
  one(.7, fiveHand),
  one(.95, at(fiveHand, [-.62, 3.82, .8])),
  one(1.2, fiveHand),
  one(1.6, fiveHand),
  rest(FIVE_DURATION),
]

export function createFiveAnimation(model: Object3D) {
  return createDemoClip(model, five, FIVE_DURATION)
}
