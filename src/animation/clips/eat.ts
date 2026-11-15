import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, BUNCH, createDemoClip, one, PUSH, rest, SCOOP, type BodyKey } from './shared'

/**
 * စား / eat : eating rice with the fingers — scoop from the plate, lift,
 * thumb pushes the food into the mouth.
 */
export const EAT_DURATION = 3.6

const plate = arm([-.42, 3.0, 1.0], [.15, -.1, .98], [.2, .9, .3], SCOOP, [-1.3, 2.75, .1])
const gather = arm([-.38, 3.05, .95], [.15, .1, .98], [.2, .9, .3], BUNCH, [-1.3, 2.75, .1])
const lift = arm([-.28, 4.26, 1.12], [.2, .5, -.85], [.35, -.7, -.6], BUNCH, [-1.35, 3.0, .35])
const mouth = arm([-.22, 4.42, 1.08], [.2, .45, -.88], [.35, -.7, -.55], PUSH, [-1.35, 3.05, .35])

const eat: SignPose[] = [
  rest(0), rest(.15),
  one(.55, plate),
  one(.8, gather),
  one(1.2, lift),
  one(1.45, mouth),
  one(1.75, plate),
  one(2.0, gather),
  one(2.4, lift),
  one(2.65, mouth),
  one(2.9, lift),
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
  return createDemoClip(model, eat, EAT_DURATION, EAT_BODY)
}
