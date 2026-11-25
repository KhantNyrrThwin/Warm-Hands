import type { Object3D } from 'three'
import type { SignPose } from './armPlayback'
import { arm, createDemoClip, one, rest, type BodyKey } from './clips/shared'
import { FLAT } from './clips/shapes'

/**
 * နေမကောင်း / sick, အဖျား / fever : the back of the flat hand is laid on the
 * forehead, slanted 45°, palm facing forward, held, then taken away.
 * Signed with the LEFT hand.
 *
 * This character's head is large for its arms, so as the hand comes up the
 * shoulder lifts and the head leans slightly into the hand to meet it.
 */
export const SICK_DURATION = 3.2

/** Back of the hand on the forehead, fingers slanting up 45° across it, palm facing forward. */
const FOREHEAD = arm([-.8, 5.4, .8], [.707, .707, 0], [0, 0, 1], FLAT, [-1.75, 4.4, .1])
const FOREHEAD_IN = arm([-1.05, 4.75, .75], [.6, .8, 0], [0, 0, 1], FLAT, [-1.7, 4.0, .2])

export const SICK_POSES: SignPose[] = [
  rest(0), rest(.15),
  one(.8, FOREHEAD_IN),
  one(1.1, FOREHEAD),
  one(2.1, FOREHEAD),
  one(2.45, FOREHEAD_IN),
  rest(SICK_DURATION),
]

/**
 * The shoulder lifts (shrug) and the head leans about 17° into the hand while
 * it rests on the forehead: without that, this character's arm cannot reach
 * above the eyebrows.
 */
const SICK_BODY: BodyKey[] = [
  { time: 0 }, { time: .35 },
  { time: 1.05, shrug: .6, tilt: .3, nod: .1 },
  { time: 2.15, shrug: .6, tilt: .3, nod: .1 },
  { time: 2.7 },
  { time: SICK_DURATION },
]

export function createSickAnimation(model: Object3D) {
  return createDemoClip(model, SICK_POSES, SICK_DURATION, SICK_BODY, 0, 'left')
}
