import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, createDemoClip, CUP, one, rest, type BodyKey } from './shared'

/** သောက် / drink : lift a cup to the mouth, turn and tip it like drinking. */
export const DRINK_DURATION = 3.2

const cupLow = arm([-.42, 3.35, 1.0], [.5, .3, .8], [.8, 0, .55], CUP, [-1.3, 2.75, .1])
const cup = arm([-.2, 4.2, 1.15], [.6, .3, .75], [.75, 0, .6], CUP, [-1.3, 2.9, .25])
const cupTip = arm([-.18, 4.34, 1.08], [.55, .65, .5], [.75, -.1, .65], CUP, [-1.3, 3.0, .3])

const drink: SignPose[] = [
  rest(0), rest(.15),
  one(.6, cupLow),
  one(1.0, cup),
  one(1.55, cupTip),
  one(2.2, cupTip),
  one(2.55, cup),
  rest(DRINK_DURATION),
]

const DRINK_BODY: BodyKey[] = [
  { time: 0 }, { time: .55 },
  { time: 1.0, turn: .16, headTurn: .1 },
  { time: 1.55, turn: .34, headTurn: .22, nod: -.3, lean: -.04 },
  { time: 2.2, turn: .36, headTurn: .24, nod: -.34, lean: -.05 },
  { time: 2.6, turn: .18, headTurn: .1, nod: -.05 },
  { time: DRINK_DURATION },
]

export function createDrinkAnimation(model: Object3D) {
  return createDemoClip(model, drink, DRINK_DURATION, DRINK_BODY)
}
