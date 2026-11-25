import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, at, createDemoClip, one, POINT, rest } from './shared'
import { THREE_HAND } from './shapes'

/**
 * ဟန်ဒြက် / hundred
 * 1. The index finger points in level and taps twice under the chin.
 * 2. A 3 hand (index, middle and ring fingers up) beside the shoulder, palm out.
 * Signed with the LEFT hand, like the book picture.
 */
export const HUNDRED_DURATION = 3.0

/** Index tip just under the chin. */
const CHIN = arm([-.62, 4.3, .6], [1, .05, -.12], [0, -1, 0], POINT, [-1.35, 3.6, .3])
const CHIN_OFF = at(CHIN, [-.72, 4.3, .62])
/** 3 hand beside the shoulder, palm out. */
const THREE = arm([-.75, 3.95, .62], [0, 1, .05], [0, 0, 1], THREE_HAND, [-1.4, 3.1, .2])

const hundred: SignPose[] = [
  rest(0), rest(.15),
  one(.6, CHIN_OFF),
  one(.8, CHIN),
  one(.95, CHIN_OFF),
  one(1.1, CHIN),
  one(1.3, CHIN),
  one(1.7, THREE),
  one(2.3, THREE),
  rest(HUNDRED_DURATION),
]

export function createHundredAnimation(model: Object3D) {
  return createDemoClip(model, hundred, HUNDRED_DURATION, [], 0, 'left')
}
