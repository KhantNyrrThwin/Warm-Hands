import type { Object3D } from 'three'
import { REST_LEFT, REST_RIGHT, createSignAnimation, type ArmPose, type SignAnimation, type SignPose } from './armPlayback'
import { HAND_SHAPES } from './handArticulation'
import { MINGALARBAR_DURATION, createMingalarbarAnimation } from './mingalarbar'

export const ANIMATED_SIGN_IDS = ['hello', 'thank_you', 'please', 'help', 'medicine'] as const
export type SignId = (typeof ANIMATED_SIGN_IDS)[number]

const L = REST_LEFT
const R = REST_RIGHT

const thankYouRight: ArmPose = {
  wrist: [-.18, 3.68, .46],
  direction: [.04, .96, .26],
  palm: [.72, .04, .69],
  gather: .88,
}

const thankYouForward: ArmPose = {
  wrist: [-.06, 3.38, .78],
  direction: [.08, .42, .90],
  palm: [.28, .22, .93],
  gather: .7,
}

const pleasePalm: ArmPose = {
  wrist: [-.06, 3.00, .36],
  direction: [.58, .68, .22],
  palm: [.10, .16, -.97],
  gather: .08,
  handShape: HAND_SHAPES.open,
}

const medicineCup: ArmPose = {
  wrist: [.28, 3.16, .58],
  direction: [-.88, .08, .28],
  palm: [.04, .98, .18],
  gather: .18,
}

const medicinePoint: ArmPose = {
  wrist: [-.08, 3.44, .58],
  direction: [.22, -.94, .16],
  palm: [.08, -.18, .98],
  gather: .2,
  fingers: { thumb: .45, index: .22, middle: 1, ring: .18, pinky: .12 },
}

const medicineTap: ArmPose = {
  ...medicinePoint,
  wrist: [-.08, 3.30, .58],
}

const helpLeft: ArmPose = {
  wrist: [.12, 3.08, .52],
  direction: [-.90, .06, .22],
  palm: [.04, .98, .16],
  gather: .08,
  handShape: HAND_SHAPES.open,
}

const helpRight: ArmPose = {
  wrist: [.02, 3.24, .52],
  direction: [0, .316, .949],
  palm: [.514, -.514, .686],
  gather: 0,
  handShape: HAND_SHAPES.thumbsUp,
}

const helpRightUp: ArmPose = {
  ...helpRight,
  wrist: [.02, 3.44, .56],
}

export const THANK_YOU_DURATION = 2.55
export const PLEASE_DURATION = 5.20
export const HELP_DURATION = 3.25
export const MEDICINE_DURATION = 3.15

const thankYou: SignPose[] = [
  { time: 0, left: L, right: R },
  { time: .18, left: L, right: R },
  { time: .48, left: L, right: { wrist: [-.55, 3.18, .22], direction: [-.08, .55, .42], palm: [.55, .05, .72], gather: .45 } },
  { time: .82, left: L, right: thankYouRight },
  { time: 1.28, left: L, right: thankYouRight },
  { time: 1.62, left: L, right: thankYouForward },
  { time: 2.05, left: L, right: { wrist: [-.62, 2.92, .28], direction: [-.04, -.05, .55], palm: [.2, .1, -.9], gather: .25 } },
  { time: THANK_YOU_DURATION, left: L, right: R },
]

function pleaseCircle(): SignPose[] {
  const start = 1.52
  const span = 2.90
  const steps = 16
  const poses: SignPose[] = []
  for (let i = 0; i <= steps; i += 1) {
    const theta = Math.PI + (i / steps) * Math.PI * 2
    poses.push({
      time: start + (i / steps) * span,
      left: L,
      right: {
        ...pleasePalm,
        wrist: [-.06 + .09 * Math.sin(theta), 3.00 + .055 * Math.cos(theta), .36],
      },
    })
  }
  return poses
}

const please: SignPose[] = [
  { time: 0, left: L, right: R },
  { time: .30, left: L, right: R },
  { time: .65, left: L, right: { wrist: [-1.06, 2.66, .06], direction: [-.04, -.12, .08], palm: [0, .06, -.98], gather: 0, handShape: HAND_SHAPES.fist } },
  { time: .98, left: L, right: { wrist: [-.88, 2.78, .16], direction: [.08, .22, .12], palm: [.04, .10, -.96], gather: .04, handShape: HAND_SHAPES.fist } },
  { time: 1.22, left: L, right: { wrist: [-.48, 2.90, .28], direction: [.38, .55, .18], palm: [.08, .14, -.96], gather: .06, handShape: HAND_SHAPES.open } },
  { time: 1.42, left: L, right: { ...pleasePalm, wrist: [-.06, 2.94, .34] } },
  ...pleaseCircle(),
  { time: 4.58, left: L, right: { wrist: [-.42, 2.88, .24], direction: [.28, .42, .14], palm: [.06, .12, -.96], gather: .04, handShape: HAND_SHAPES.open } },
  { time: 4.88, left: L, right: { wrist: [-.96, 2.68, .08], direction: [-.04, -.08, .06], palm: [0, .04, -.98], gather: 0, handShape: HAND_SHAPES.fist } },
  { time: PLEASE_DURATION, left: L, right: R },
]

const help: SignPose[] = [
  { time: 0, left: L, right: R },
  { time: .25, left: L, right: R },
  { time: .55, left: { ...L, wrist: [.92, 2.70, .10] }, right: { ...R, wrist: [-.92, 2.72, .10] } },
  { time: .90, left: { ...helpLeft, wrist: [.48, 2.92, .32], handShape: HAND_SHAPES.open }, right: { ...helpRight, wrist: [-.42, 3.02, .34] } },
  { time: 1.20, left: helpLeft, right: helpRight },
  { time: 1.45, left: helpLeft, right: helpRight },
  { time: 1.75, left: helpLeft, right: helpRightUp },
  { time: 1.95, left: helpLeft, right: helpRightUp },
  { time: 2.25, left: helpLeft, right: helpRight },
  { time: 2.50, left: helpLeft, right: helpRight },
  { time: 2.85, left: { ...helpLeft, wrist: [.50, 2.88, .26] }, right: { ...helpRight, wrist: [-.46, 2.94, .26] } },
  { time: HELP_DURATION, left: L, right: R },
]

const medicine: SignPose[] = [
  { time: 0, left: L, right: R },
  { time: .18, left: L, right: R },
  { time: .48, left: { ...medicineCup, wrist: [.55, 2.92, .32] }, right: { ...medicinePoint, wrist: [-.55, 3.08, .32] } },
  { time: .82, left: medicineCup, right: medicinePoint },
  { time: 1.12, left: medicineCup, right: medicineTap },
  { time: 1.38, left: medicineCup, right: medicinePoint },
  { time: 1.64, left: medicineCup, right: medicineTap },
  { time: 1.90, left: medicineCup, right: medicinePoint },
  { time: 2.22, left: medicineCup, right: medicineTap },
  { time: 2.48, left: medicineCup, right: medicinePoint },
  { time: 2.82, left: { ...medicineCup, wrist: [.58, 2.90, .28] }, right: { ...medicinePoint, wrist: [-.58, 2.98, .28], gather: .1 } },
  { time: MEDICINE_DURATION, left: L, right: R },
]

export function createSignLibrary(model: Object3D): Record<SignId, SignAnimation> {
  return {
    hello: createMingalarbarAnimation(model),
    thank_you: createSignAnimation(model, thankYou, THANK_YOU_DURATION),
    please: createSignAnimation(model, please, PLEASE_DURATION),
    help: createSignAnimation(model, help, HELP_DURATION),
    medicine: createSignAnimation(model, medicine, MEDICINE_DURATION),
  }
}

export const SIGN_DURATIONS: Record<SignId, number> = {
  hello: MINGALARBAR_DURATION,
  thank_you: THANK_YOU_DURATION,
  please: PLEASE_DURATION,
  help: HELP_DURATION,
  medicine: MEDICINE_DURATION,
}
