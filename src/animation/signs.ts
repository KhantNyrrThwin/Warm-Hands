import type { Object3D } from 'three'
import { REST_LEFT, REST_RIGHT, createSignAnimation, type ArmPose, type SignAnimation, type SignPose } from './armPlayback'
import { HAND_SHAPES } from './handArticulation'
import { MINGALARBAR_DURATION, createMingalarbarAnimation } from './mingalarbar'
import { createSickAnimation, SICK_DURATION } from './sick'
import { createIAnimation, I_DURATION } from './i'
import { createHeadacheAnimation, HEADACHE_DURATION } from './clips/headache'
import { createDemoSignLibrary, DEMO_DURATIONS, DEMO_SIGN_IDS } from './demoSigns'
import { createRecordedSignLibrary, RECORDED_DURATIONS, RECORDED_SIGN_IDS } from './clips/recorded.generated'
import { ALLERGIES_DURATION, createAllergiesAnimation } from './clips/allergies'
import { AIDS_DURATION, createAidsAnimation } from './clips/aids'
import { ASTHMA_DURATION, createAsthmaAnimation } from './clips/asthma'
import { AVOID_DURATION, createAvoidAnimation } from './clips/avoid'
import { BITTER_DURATION, createBitterAnimation } from './clips/bitter'
import { BRAIN_DURATION, createBrainAnimation } from './clips/brain'
import { CHOLERA_DURATION, createCholeraAnimation } from './clips/cholera'
import { createDiseaseAnimation, DISEASE_DURATION } from './clips/disease'
import { createHaveAnimation, HAVE_DURATION } from './clips/have'
import { createHaveQuestionAnimation, HAVE_QUESTION_DURATION } from './clips/have_question'
import { createHeartAnimation, HEART_DURATION } from './clips/heart'
import { createKyatAnimation, KYAT_DURATION } from './clips/kyat'
import { createLargeIntestineAnimation, LARGE_INTESTINE_DURATION } from './clips/large_intestine'
import { createLiverAnimation, LIVER_DURATION } from './clips/liver'
import { createLungsAnimation, LUNGS_DURATION } from './clips/lungs'
import { createManyAnimation, MANY_DURATION } from './clips/many'
import { createMuscleAnimation, MUSCLE_DURATION } from './clips/muscle'
import { createNotHaveAnimation, NOT_HAVE_DURATION } from './clips/not_have'
import { createOilyAnimation, OILY_DURATION } from './clips/oily'
import { createSaltyAnimation, SALTY_DURATION } from './clips/salty'
import { createSmallIntestineAnimation, SMALL_INTESTINE_DURATION } from './clips/small_intestine'
import { createSpicyAnimation, SPICY_DURATION } from './clips/spicy'
import { createSweetAnimation, SWEET_DURATION } from './clips/sweet'
import { createThroatAnimation, THROAT_DURATION } from './clips/throat'
import { createWeightAnimation, WEIGHT_DURATION } from './clips/weight'
import { createWhoAnimation, WHO_DURATION } from './clips/who'

export const ANIMATED_SIGN_IDS = ['hello', 'thank_you', 'please', 'help', 'medicine', 'sick', 'i', 'headache', 'allergies', 'have_question', 'have', 'not_have', 'avoid', 'oily', 'many', 'salty', 'bitter', 'sweet', 'spicy', 'disease', 'lungs', 'heart', 'aids', 'cholera', 'asthma', 'brain', 'throat', 'muscle', 'liver', 'small_intestine', 'large_intestine', 'weight', 'who', 'kyat', ...DEMO_SIGN_IDS, ...RECORDED_SIGN_IDS] as const
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

export function createSignLibrary(model: Object3D): Record<SignId, SignAnimation> {
  // Demo clips (and the book's ဆေး medicine sign) override the older ones.
  const demo = createDemoSignLibrary(model)
  // Clips retargeted from the recorded MSL samples (tools/avatar/build_clips.py).
  const recorded = createRecordedSignLibrary(model)
  return {
    ...recorded,
    hello: createMingalarbarAnimation(model),
    thank_you: createSignAnimation(model, thankYou, THANK_YOU_DURATION),
    please: createSignAnimation(model, please, PLEASE_DURATION),
    help: createSignAnimation(model, help, HELP_DURATION),
    sick: createSickAnimation(model),
    i: createIAnimation(model),
    headache: createHeadacheAnimation(model),
    allergies: createAllergiesAnimation(model),
    have_question: createHaveQuestionAnimation(model),
    have: createHaveAnimation(model),
    not_have: createNotHaveAnimation(model),
    avoid: createAvoidAnimation(model),
    oily: createOilyAnimation(model),
    many: createManyAnimation(model),
    salty: createSaltyAnimation(model),
    bitter: createBitterAnimation(model),
    sweet: createSweetAnimation(model),
    spicy: createSpicyAnimation(model),
    disease: createDiseaseAnimation(model),
    lungs: createLungsAnimation(model),
    heart: createHeartAnimation(model),
    aids: createAidsAnimation(model),
    cholera: createCholeraAnimation(model),
    asthma: createAsthmaAnimation(model),
    brain: createBrainAnimation(model),
    throat: createThroatAnimation(model),
    muscle: createMuscleAnimation(model),
    liver: createLiverAnimation(model),
    small_intestine: createSmallIntestineAnimation(model),
    large_intestine: createLargeIntestineAnimation(model),
    weight: createWeightAnimation(model),
    who: createWhoAnimation(model),
    kyat: createKyatAnimation(model),
    ...demo,
  }
}

export const SIGN_DURATIONS: Record<SignId, number> = {
  hello: MINGALARBAR_DURATION,
  thank_you: THANK_YOU_DURATION,
  please: PLEASE_DURATION,
  help: HELP_DURATION,
  sick: SICK_DURATION,
  i: I_DURATION,
  headache: HEADACHE_DURATION,
  allergies: ALLERGIES_DURATION,
  have_question: HAVE_QUESTION_DURATION,
  have: HAVE_DURATION,
  not_have: NOT_HAVE_DURATION,
  avoid: AVOID_DURATION,
  oily: OILY_DURATION,
  many: MANY_DURATION,
  salty: SALTY_DURATION,
  bitter: BITTER_DURATION,
  sweet: SWEET_DURATION,
  spicy: SPICY_DURATION,
  disease: DISEASE_DURATION,
  lungs: LUNGS_DURATION,
  heart: HEART_DURATION,
  aids: AIDS_DURATION,
  cholera: CHOLERA_DURATION,
  asthma: ASTHMA_DURATION,
  brain: BRAIN_DURATION,
  throat: THROAT_DURATION,
  muscle: MUSCLE_DURATION,
  liver: LIVER_DURATION,
  small_intestine: SMALL_INTESTINE_DURATION,
  large_intestine: LARGE_INTESTINE_DURATION,
  weight: WEIGHT_DURATION,
  who: WHO_DURATION,
  kyat: KYAT_DURATION,
  ...RECORDED_DURATIONS,
  ...DEMO_DURATIONS,
}
