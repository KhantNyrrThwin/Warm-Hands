import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, createDemoClip, one, POINT, rest } from './shared'
import { turnedBody } from './turn'

/**
 * အဖေ / father : the upright index finger is held against the lips, then
 * moves straight forward away from the mouth. The body first turns about
 * 30° to the right.
 * Signed with the LEFT hand, like the book picture.
 */
export const FATHER_DURATION = 2.8

/** Index finger up, its side against the lips. */
const LIPS = arm([-.06, 4.32, .88], [.05, .99, -.08], [1, 0, 0], POINT, [-1.2, 3.5, .5])
/** Moved forward, away from the mouth. */
const FORWARD = arm([-.1, 4.28, 1.2], [.05, .99, -.08], [1, 0, 0], POINT, [-1.2, 3.5, .6])

const father: SignPose[] = [
  rest(0), rest(.5),
  one(.95, LIPS),
  one(1.3, LIPS),
  one(1.7, FORWARD),
  one(2.05, FORWARD),
  rest(FATHER_DURATION),
]

/** Turn about 30° to the right first, then sign. */
const FATHER_BODY = turnedBody(30, .5, 2.15, FATHER_DURATION)

export function createFatherAnimation(model: Object3D) {
  return createDemoClip(model, father, FATHER_DURATION, FATHER_BODY, 0, 'left')
}
