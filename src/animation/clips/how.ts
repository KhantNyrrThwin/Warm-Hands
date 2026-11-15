import type { Object3D } from 'three'
import { at, both, createDemoClip, flipIn, flipOut, questionBody, rest, type BodyKey } from './shared'
import type { SignPose } from '../armPlayback'

/** ဘယ်လို / how : backs of the hands out, then open outward to palms up. */
export const HOW_DURATION = 3.1

function flips(start: number, count: number, beat = .45): SignPose[] {
  const poses: SignPose[] = []
  for (let i = 0; i < count; i++) {
    poses.push(both(start + i * beat * 2, flipIn))
    poses.push(both(start + i * beat * 2 + beat, flipOut))
  }
  return poses
}

const how: SignPose[] = [
  rest(0), rest(.15),
  both(.65, at(flipIn, [-.55, 3.05, .6])),
  ...flips(.9, 2),
  both(2.6, at(flipOut, [-1.05, 2.85, .6])),
  rest(HOW_DURATION),
]

const HOW_BODY: BodyKey[] = questionBody(.9, 2.6, HOW_DURATION)

export function createHowAnimation(model: Object3D) {
  return createDemoClip(model, how, HOW_DURATION, HOW_BODY)
}
