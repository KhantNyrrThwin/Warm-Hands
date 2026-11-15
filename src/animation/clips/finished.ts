import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, both, createDemoClip, OPEN, rest } from './shared'

/** ပြီး / finished : open hands at the chest sweep down and out. */
export const FINISHED_DURATION = 2.4

const doneStart = arm([-.4, 3.32, .62], [.55, .8, .15], [.1, .1, -.99], OPEN, [-1.3, 2.9, .1])
const doneEnd = arm([-1.0, 2.88, .82], [-.25, .3, .92], [-.05, -.98, .15], OPEN, [-1.35, 2.7, .1])

const finished: SignPose[] = [
  rest(0), rest(.15),
  both(.7, doneStart),
  both(1.0, doneStart),
  both(1.45, doneEnd),
  both(1.75, doneEnd),
  rest(FINISHED_DURATION),
]

export function createFinishedAnimation(model: Object3D) {
  return createDemoClip(model, finished, FINISHED_DURATION)
}
