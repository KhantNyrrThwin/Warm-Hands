import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, both, createDemoClip, OPEN, questionBody, rest, type BodyKey } from './shared'

/** ပြီး / finished : open hands at the chest sweep down and out. */
export const FINISHED_DURATION = 2.4
export const HAVE_YOU_FINISHED_DURATION = 2.8

const doneStart = arm([-.4, 3.32, .62], [.55, .8, .15], [.1, .1, -.99], OPEN, [-1.3, 2.9, .1])
const doneEnd = arm([-1.0, 2.88, .82], [0, .707, .707], [-.05, -.98, .15], OPEN, [-1.35, 2.7, .1])
/** ပြီးပြီလား: like ပြီး, but the hands end flat, palms straight down (ပြီး ends tilted 45° up). */
const haveYouFinishedEnd = arm([-1.0, 2.88, .82], [-.35, 0, .94], [0, -1, 0], OPEN, [-1.35, 2.7, .1])

const finished: SignPose[] = [
  rest(0), rest(.15),
  both(.7, doneStart),
  both(1.0, doneStart),
  both(1.45, doneEnd),
  both(1.75, doneEnd),
  rest(FINISHED_DURATION),
]

const haveYouFinished: SignPose[] = [
  rest(0), rest(.15),
  both(.7, doneStart),
  both(1.0, doneStart),
  both(1.55, haveYouFinishedEnd),
  both(2.15, haveYouFinishedEnd),
  rest(HAVE_YOU_FINISHED_DURATION),
]

const HAVE_YOU_FINISHED_BODY: BodyKey[] = questionBody(1.55, 2.2, HAVE_YOU_FINISHED_DURATION)

export function createFinishedAnimation(model: Object3D) {
  return createDemoClip(model, finished, FINISHED_DURATION)
}

export function createHaveYouFinishedAnimation(model: Object3D) {
  return createDemoClip(model, haveYouFinished, HAVE_YOU_FINISHED_DURATION, HAVE_YOU_FINISHED_BODY)
}
