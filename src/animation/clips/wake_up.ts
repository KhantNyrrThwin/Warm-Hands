import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, at, createDemoClip, one, rest, type BodyKey } from './shared'
import { FLAT } from './shapes'

/**
 * အိပ်ရာထ / wake up
 * 1. Sleep: the head tilts 20° and the flat palm is pressed against the left
 *    cheek. Hold for a moment.
 * 2. The hand comes straight off the cheek in the same shape, and the head
 *    comes upright again.
 * Signed with the LEFT hand, like the book picture.
 */
export const WAKE_UP_DURATION = 3.0

/**
 * Palm flat against the left cheek of the head tilted 20°; the fingers follow
 * the tilted head (pointing up and slightly out).
 */
const PILLOW = arm([-.92, 4.35, .43], [-.33, .94, .05], [.9, .32, -.3], FLAT, [-1.6, 3.6, .2])
/** The same hand, unchanged, pulled straight off the cheek. */
const AWAKE = at(PILLOW, [-1.3, 4.3, .5])

const wakeUp: SignPose[] = [
  rest(0), rest(.15),
  one(.65, PILLOW),
  one(1.6, PILLOW),
  one(2.05, AWAKE),
  one(2.4, AWAKE),
  rest(WAKE_UP_DURATION),
]

/** Head leans onto the hand while asleep, then comes upright. */
const WAKE_UP_BODY: BodyKey[] = [
  { time: 0 }, { time: .35 },
  { time: .7, tilt: .345, nod: .04 },
  { time: 1.6, tilt: .345, nod: .04 },
  { time: 2.1, tilt: 0, nod: 0 },
  { time: WAKE_UP_DURATION },
]

export function createWakeUpAnimation(model: Object3D) {
  return createDemoClip(model, wakeUp, WAKE_UP_DURATION, WAKE_UP_BODY, 0, 'left')
}
