import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, at, createDemoClip, one, rest, type BodyKey } from './shared'
import { FLAT } from './shapes'

/**
 * ချောင်းဆိုး / cough : the flat hand lies on the upper chest, fingers pointing
 * across, and moves in a zigzag (up, diagonally down, up again) while the
 * chest jerks forward with each cough and the mouth is a little open.
 * Signed with the LEFT hand, like the book picture.
 */
export const COUGH_DURATION = 3.0

/** Palm on the upper chest, fingers pointing across and slightly up. */
const CHEST = arm([-.36, 3.32, .4], [.95, .25, 0], [0, 0, -1], FLAT, [-1.2, 2.8, .3])
const [x, y, z] = CHEST.wrist
/** The zigzag (an N): up, diagonally down and across, up. */
const zig = (dx: number, dy: number) => at(CHEST, [x + dx, y + dy, z])

const cough: SignPose[] = [
  rest(0), rest(.15),
  one(.6, zig(0, 0)),
  one(.8, zig(0, 0)),
  one(1.05, zig(0, .16)),
  one(1.35, zig(.13, 0)),
  one(1.6, zig(.13, .16)),
  one(1.9, zig(.13, .16)),
  rest(COUGH_DURATION),
]

/** Mouth a little open while coughing. */
const OPEN = .35
/** A small forward jerk of the chest and head with each cough; the mouth opens a bit more. */
const jerk = (time: number): BodyKey[] => [
  { time: time - .08, mouth: OPEN },
  { time, lean: .07, nod: .1, mouth: .55 },
  { time: time + .12, mouth: OPEN },
]
const COUGH_BODY: BodyKey[] = [
  { time: 0 },
  { time: .6 },
  { time: .85, mouth: OPEN },
  ...jerk(1.05),
  ...jerk(1.35),
  ...jerk(1.6),
  { time: 1.95, mouth: OPEN },
  { time: 2.3 },
  { time: COUGH_DURATION },
]

export function createCoughAnimation(model: Object3D) {
  return createDemoClip(model, cough, COUGH_DURATION, COUGH_BODY, 0, 'left')
}
