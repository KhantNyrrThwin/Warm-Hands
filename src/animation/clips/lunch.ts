import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { EAT_ONCE_SPAN, eatOnce, eatOnceBody } from './eat'
import { arm, createDemoClip, OPEN, rest } from './shared'

/**
 * နေ့လည်စာ / lunch : "noon" then "eat" (once).
 * 1. The signing forearm stands straight up like a clock hand at twelve, its
 *    elbow resting on the other hand, which lies flat and palm up across the body.
 * 2. One eat stroke (scoop from the plate, push into the mouth), as in eat.ts.
 * Signed with the LEFT hand, like eat.
 */
const EAT_START = 1.7
export const LUNCH_DURATION = EAT_START + EAT_ONCE_SPAN + .7

/** Forearm upright, fingers up, palm facing the middle of the body. */
const NOON = arm([-.66, 3.86, .42], [0, 1, 0], [1, 0, 0], OPEN, [-.95, 2.6, .55])
/** Flat palm-up hand under the upright elbow, fingers pointing at it. */
const SUPPORT = arm([.18, 3.1, .5], [-1, 0, .08], [0, 1, 0], OPEN, [1.25, 2.75, .2])
const NOON_IN = arm([-.62, 3.6, .4], [0, 1, 0], [1, 0, 0], OPEN, [-.95, 2.6, .55])
const SUPPORT_IN = arm([.4, 3.0, .4], [-1, 0, .08], [0, 1, 0], OPEN, [1.25, 2.75, .2])

const lunch: SignPose[] = [
  rest(0), rest(.15),
  { time: .55, left: NOON_IN, right: SUPPORT_IN },
  { time: .8, left: NOON, right: SUPPORT },
  { time: 1.3, left: NOON, right: SUPPORT },
  ...eatOnce(EAT_START),
  rest(LUNCH_DURATION),
]

export function createLunchAnimation(model: Object3D) {
  return createDemoClip(model, lunch, LUNCH_DURATION, eatOnceBody(EAT_START, LUNCH_DURATION), 0, 'left')
}
