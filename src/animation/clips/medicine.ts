import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import { arm, at, createDemoClip, one, PILL, rest } from './shared'

/** ဆေး / medicine : pinched hand rises from chin to the mouth. */
export const MEDICINE_DURATION = 2.9

const pillLow = arm([-.2, 4.0, 1.0], [.25, .95, .15], [.25, .1, -.96], PILL, [-1.2, 3.0, .3])
const pillHigh = at(pillLow, [-.16, 4.3, 1.0])

const medicine: SignPose[] = [
  rest(0), rest(.15),
  one(.75, pillLow),
  one(1.1, pillHigh),
  one(1.4, pillLow),
  one(1.75, pillHigh),
  one(2.1, pillHigh),
  rest(MEDICINE_DURATION),
]

export function createMedicineAnimation(model: Object3D) {
  return createDemoClip(model, medicine, MEDICINE_DURATION)
}
