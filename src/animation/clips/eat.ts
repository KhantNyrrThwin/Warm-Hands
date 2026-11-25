import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, BUNCH, createDemoClip, one, PUSH, rest, SCOOP, type BodyKey } from './shared'

/**
 * စား / eat : eating rice with the fingers — scoop from the plate, lift,
 * thumb pushes the food into the mouth. Signed with the LEFT hand.
 */
export const EAT_DURATION = 3.6

export const EAT_PLATE = arm([-.42, 3.0, 1.0], [.15, -.1, .98], [.2, .9, .3], SCOOP, [-1.3, 2.75, .1])
export const EAT_GATHER = arm([-.38, 3.05, .95], [.15, .1, .98], [.2, .9, .3], BUNCH, [-1.3, 2.75, .1])
export const EAT_LIFT = arm([-.28, 4.26, 1.12], [.2, .5, -.85], [.35, -.7, -.6], BUNCH, [-1.35, 3.0, .35])
export const EAT_MOUTH = arm([-.22, 4.42, 1.08], [.2, .45, -.88], [.35, -.7, -.55], PUSH, [-1.35, 3.05, .35])

/**
 * One eat stroke (scoop, gather, lift, push into the mouth, hold) starting at
 * `start`, for compound signs like breakfast / lunch / dinner. Ends at the
 * mouth: add `rest(start + EAT_ONCE_SPAN + .7)` after it.
 */
export const EAT_ONCE_SPAN = 1.2
export const eatOnce = (start: number): SignPose[] => [
  one(start, EAT_PLATE),
  one(start + .25, EAT_GATHER),
  one(start + .65, EAT_LIFT),
  one(start + .9, EAT_MOUTH),
  one(start + EAT_ONCE_SPAN, EAT_MOUTH),
]
/** Head and chest follow the single eat stroke. */
export const eatOnceBody = (start: number, duration: number): BodyKey[] => [
  { time: 0 }, { time: start - .05 },
  { time: start + .25, lean: .05, nod: .12 },
  { time: start + .9, lean: .02, nod: -.04, headTurn: .04 },
  { time: start + EAT_ONCE_SPAN, lean: .02, nod: -.04, headTurn: .04 },
  { time: duration },
]

const eat: SignPose[] = [
  rest(0), rest(.15),
  one(.55, EAT_PLATE),
  one(.8, EAT_GATHER),
  one(1.2, EAT_LIFT),
  one(1.45, EAT_MOUTH),
  one(1.75, EAT_PLATE),
  one(2.0, EAT_GATHER),
  one(2.4, EAT_LIFT),
  one(2.65, EAT_MOUTH),
  one(2.9, EAT_LIFT),
  rest(EAT_DURATION),
]

const EAT_BODY: BodyKey[] = [
  { time: 0 }, { time: .5 },
  { time: .8, lean: .05, nod: .12 },
  { time: 1.45, lean: .02, nod: -.04, headTurn: .04 },
  { time: 2.0, lean: .05, nod: .12 },
  { time: 2.65, lean: .02, nod: -.04, headTurn: .04 },
  { time: EAT_DURATION },
]

export function createEatAnimation(model: Object3D) {
  return createDemoClip(model, eat, EAT_DURATION, EAT_BODY, 0, 'left')
}
