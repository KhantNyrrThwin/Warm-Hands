import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, createDemoClip, one, OPEN, POINT, rest } from './shared'

/** မိနစ် / minute : index sweeps across the upright palm like a clock hand. */
export const MINUTE_DURATION = 2.8

const clockFace = arm([.28, 3.22, .66], [-.05, .99, .05], [-.98, 0, .15], OPEN, [1.3, 2.9, .2])
const handUp = arm([-.22, 3.28, .78], [.3, .95, 0], [0, 0, -1], POINT, [-1.3, 2.9, .2])
const handAcross = arm([-.2, 3.2, .78], [.95, -.3, 0], [0, 0, -1], POINT, [-1.3, 2.9, .2])

const minute: SignPose[] = [
  rest(0), rest(.15),
  one(.75, handUp, clockFace),
  one(1.05, handUp, clockFace),
  one(1.55, handAcross, clockFace),
  one(1.75, handUp, clockFace),
  one(2.15, handAcross, clockFace),
  rest(MINUTE_DURATION),
]

export function createMinuteAnimation(model: Object3D) {
  return createDemoClip(model, minute, MINUTE_DURATION)
}
