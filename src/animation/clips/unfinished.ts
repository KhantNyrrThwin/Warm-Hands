import type { Object3D } from 'three'
import type { ArmPose, SignPose } from '../armPlayback'
import type { HandShape } from '../handArticulation'
import { arm, createDemoClip, R, rest, type BodyKey } from './shared'

/**
 * မပြီးသေး / unfinished : brush down from the shoulder with a small head shake.
 * Signed with the LEFT hand.
 */
export const UNFINISHED_DURATION = 2.7

const SHOULDER_SHAPE: HandShape = {
  curl: { thumb: [.05, .08, .04], index: [Math.PI / 2, .08, .04], middle: [Math.PI / 2, .08, .04], ring: [Math.PI / 2, .08, .04], pinky: [Math.PI / 2, .08, .04] },
  spread: { index: -.01, middle: 0, ring: .01, pinky: .02 },
  thumbOpposition: .05,
}
const SHOULDER_L: ArmPose = arm(
  [-.82, 3.62, .48],
  [.05, .98, .12],
  [0, -1, 0],
  SHOULDER_SHAPE,
  [-1.25, 2.95, .18],
)
const BRUSH_L: ArmPose = arm(
  [-.76, 3.44, .54],
  [.05, .98, .12],
  [0, -1, 0],
  SHOULDER_SHAPE,
  [-1.25, 2.85, .18],
)

const unfinished: SignPose[] = [
  rest(0), rest(.15),
  { time: .55, left: SHOULDER_L, right: R },
  { time: .8, left: BRUSH_L, right: R },
  { time: 1.0, left: SHOULDER_L, right: R },
  { time: 1.2, left: BRUSH_L, right: R },
  { time: 1.55, left: BRUSH_L, right: R },
  rest(UNFINISHED_DURATION),
]

const UNFINISHED_BODY: BodyKey[] = [
  { time: 0 }, { time: .45 },
  { time: .7, headTurn: -.18, tilt: .02 },
  { time: .95, headTurn: .18, tilt: -.02 },
  { time: 1.2, headTurn: -.16, tilt: .02 },
  { time: 1.45, headTurn: .14, tilt: -.02 },
  { time: 1.8, headTurn: 0, tilt: 0 },
  { time: UNFINISHED_DURATION },
]

export function createUnfinishedAnimation(model: Object3D) {
  return createDemoClip(model, unfinished, UNFINISHED_DURATION, UNFINISHED_BODY, 0, 'left')
}
