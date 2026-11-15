import { Bone, Quaternion, Vector3, type Object3D } from 'three'
import { createSignAnimation, REST_LEFT, REST_RIGHT, type ArmPose, type SignAnimation, type SignPose } from './armPlayback'
import type { HandShape } from './handArticulation'

/**
 * Clinic demo vocabulary, posed from the MSL book reference pages
 * (ဘာဖြစ်လို့လဲ, အစာအိမ်နာ, ဆေး, သောက်, ဘယ်လို, စား, ပြီး, မိနစ်, ၅).
 *
 * Model space: +y up, +z toward the viewer, -x on the viewer's left.
 * Poses below are authored like the book pages (dominant hand on the
 * viewer's left, the `left` arm) and then mirrored so the character signs
 * with the hand on the viewer's RIGHT, as the user asked.
 *
 * Note: in this rig the `palm` vector is the normal of the BACK of the hand.
 * palm [0, 0, 1] shows the back of the hand to the viewer; [0, -1, 0] is a
 * palm-up hand.
 */

const L = REST_LEFT
const R = REST_RIGHT

// ---- Hand shapes -------------------------------------------------------------
const OPEN: HandShape = {
  curl: { thumb: .06, index: .02, middle: .02, ring: .03, pinky: .04 },
  spread: { index: -.08, middle: 0, ring: .07, pinky: .14 },
  thumbOpposition: .1,
}
const SPREAD: HandShape = {
  curl: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
  spread: { index: -.22, middle: -.04, ring: .14, pinky: .32, thumb: -.3 },
}
const POINT: HandShape = { curl: { middle: 1, ring: 1, pinky: 1, thumb: [.45, .45, .2] }, thumbOpposition: .6 }
/** Index finger up, hooked at the middle and tip joints, other fingers closed. */
const HOOK: HandShape = {
  curl: { index: [.08, 1.35, .95], middle: 1, ring: 1, pinky: 1, thumb: [.45, .5, .25] },
  thumbOpposition: .7,
}
/** Fingertips gathered with the thumb, holding a little rice. */
const BUNCH: HandShape = {
  curl: { 
    thumb: [.12, .18, .12], 
    index: [.18, .28, .22], 
    middle: [.18, .28, .22], 
    ring: [.21, .28, .22], 
    pinky: [.24, .28, .22] 
  },
  spread: { index: -.05, ring: .04, pinky: .09 },
  thumbOpposition: .65,
}

/** Bunched fingers with the thumb pushed forward into the mouth. */
const PUSH: HandShape = {
  curl: { 
    thumb: [.04, .06, 0], 
    index: [.14, .22, .18], 
    middle: [.14, .22, .18], 
    ring: [.17, .22, .18], 
    pinky: [.2, .22, .18] 
  },
  spread: { index: -.05, ring: .04, pinky: .09 },
  thumbOpposition: .35,
}

/** Soft flat scoop shape for taking from the plate. */
const SCOOP: HandShape = {
  curl: { 
    thumb: [.05, .05, 0], 
    index: [.12, .18, .12], 
    middle: [.12, .18, .12], 
    ring: [.14, .18, .12], 
    pinky: [.16, .18, .12] 
  },
  spread: { index: .02, ring: -.02, pinky: -.04 },
  thumbOpposition: .4,
}
/** C-shaped grip around a cup of water. */
const CUP: HandShape = {
  curl: { thumb: [.2, .25, .1], index: [.55, .55, .3], middle: [.6, .55, .3], ring: [.65, .55, .3], pinky: [.7, .55, .3] },
  spread: { index: -.04, ring: .04, pinky: .08 },
  thumbOpposition: .8,
}
const PILL: HandShape = {
  curl: { 
    thumb: [.35, .35, .2], 
    index: [.15, .85, .05], 
    middle: [.85, .9, .6], 
    ring: [.85, .9, .6], 
    pinky: [.85, .9, .6] 
  },
  spread: { index: -.05, ring: .05, pinky: .1 },
  thumbOpposition: .7,
}
const CLASP: HandShape = {
  curl: { thumb: [.3, .3, .2], index: [.85, .8, .5], middle: [.85, .8, .5], ring: [.85, .8, .5], pinky: [.85, .8, .5] },
  spread: { index: -.15, middle: -.05, ring: .05, pinky: .15 },
  thumbOpposition: .4,
}

// Negate palm coordinates so back-of-hand becomes palm-side normal (and vice versa)
const arm = (
  wrist: number[], 
  direction: number[], 
  palm: number[], 
  handShape: HandShape, 
  elbow?: number[]
): ArmPose => ({
  wrist,
  direction,
  palm: [-palm[0], -palm[1], -palm[2]], // <-- Inverted here
  gather: 0,
  handShape,
  ...(elbow ? { elbow } : {})
})

/** Mirror a pose onto the other arm (rest poses map to the other rest pose). */
const mirror = (pose: ArmPose): ArmPose => pose === L ? R : pose === R ? L : ({
  ...pose,
  wrist: [-pose.wrist[0], pose.wrist[1], pose.wrist[2]],
  direction: [-pose.direction[0], pose.direction[1], pose.direction[2]],
  palm: [-pose.palm[0], pose.palm[1], pose.palm[2]],
  ...(pose.elbow ? { elbow: [-pose.elbow[0], pose.elbow[1], pose.elbow[2]] } : {}),
})

const both = (time: number, left: ArmPose): SignPose => ({ time, left, right: mirror(left) })
const one = (time: number, left: ArmPose, right: ArmPose = R): SignPose => ({ time, left, right })
const rest = (time: number): SignPose => ({ time, left: L, right: R })
const at = (pose: ArmPose, wrist: number[]): ArmPose => ({ ...pose, wrist })

// ---- ဘယ်လို / how : backs of the hands out, then open outward to palms up ------
const flipIn = arm([-.42, 3.2, .7], [.15, .97, .12], [-.05, -.08, -.99], OPEN, [-1.3, 2.9, .1])
const flipOut = arm([-1.0, 3.0, .85], [-.8, .2, .55], [.05, .97, .2], OPEN, [-1.35, 2.75, .1])

function flips(start: number, count: number, beat = .45): SignPose[] {
  const poses: SignPose[] = []
  for (let i = 0; i < count; i++) {
    poses.push(both(start + i * beat * 2, flipIn))
    poses.push(both(start + i * beat * 2 + beat, flipOut))
  }
  return poses
}

export const HOW_DURATION = 3.1
const how: SignPose[] = [
  rest(0), rest(.15),
  both(.65, at(flipIn, [-.55, 3.05, .6])),
  ...flips(.9, 2),
  both(2.6, at(flipOut, [-1.05, 2.85, .6])),
  rest(HOW_DURATION),
]

// ---- ဘာဖြစ်လို့လဲ / what happened : hooked index under the chin, then the flip --
const chin = arm([-.16, 3.92, 1.02], [.12, .98, .1], [.1, .05, .99], HOOK, [-1.25, 3.0, .35])
const chinTap = at(chin, [-.16, 3.86, 1.04])
export const WHAT_HAPPENED_DURATION = 4.3
const whatHappened: SignPose[] = [
  rest(0), rest(.15),
  one(.75, chin),
  one(1.05, chinTap),
  one(1.35, chin),
  one(1.65, chinTap),
  one(1.85, chin),
  both(2.3, flipIn),
  both(2.75, flipOut),
  both(3.15, flipIn),
  both(3.6, flipOut),
  rest(WHAT_HAPPENED_DURATION),
]

// ---- အစာအိမ်နာ / stomach ache : clasped hands shake at the belly ------------
const belly = arm([-.36, 2.82, .62], [.95, .05, .25], [.1, .45, -.88], CLASP, [-1.25, 2.75, .05])
const bellyUp = at(belly, [belly.wrist[0], belly.wrist[1] + .07, belly.wrist[2]])
const bellyDown = at(belly, [belly.wrist[0], belly.wrist[1] - .07, belly.wrist[2]])
export const STOMACH_ACHE_DURATION = 3.6
const stomachAche: SignPose[] = [
  rest(0), rest(.15),
  both(.85, belly),
  ...[0, 1, 2, 3, 4, 5].map((i) => both(1.1 + i * .27, i % 2 ? bellyDown : bellyUp)),
  both(2.85, belly),
  rest(STOMACH_ACHE_DURATION),
]

// ---- ဆေး / medicine : pinched hand rises from chin to the mouth -----------------
const pillLow = arm([-.2, 4.0, 1.0], [.25, .95, .15], [.25, .1, -.96], PILL, [-1.2, 3.0, .3])
const pillHigh = at(pillLow, [-.16, 4.3, 1.0])
export const MEDICINE_DURATION = 2.9
const medicine: SignPose[] = [
  rest(0), rest(.15),
  one(.75, pillLow),
  one(1.1, pillHigh),
  one(1.4, pillLow),
  one(1.75, pillHigh),
  one(2.1, pillHigh),
  rest(MEDICINE_DURATION),
]

// ---- သောက် / drink : lift a cup to the mouth, turn and tip it like drinking ----
const cupLow = arm([-.42, 3.35, 1.0], [.5, .3, .8], [.8, 0, .55], CUP, [-1.3, 2.75, .1])
const cup = arm([-.2, 4.2, 1.15], [.6, .3, .75], [.75, 0, .6], CUP, [-1.3, 2.9, .25])
const cupTip = arm([-.18, 4.34, 1.08], [.55, .65, .5], [.75, -.1, .65], CUP, [-1.3, 3.0, .3])
export const DRINK_DURATION = 3.2
const drink: SignPose[] = [
  rest(0), rest(.15),
  one(.6, cupLow),
  one(1.0, cup),
  one(1.55, cupTip),
  one(2.2, cupTip),
  one(2.55, cup),
  rest(DRINK_DURATION),
]

// ---- စား / eat : eating rice with the fingers -- scoop from the plate, lift,
// thumb pushes the food into the mouth --------------------------------------------
const plate = arm([-.42, 3.0, 1.0], [.15, -.1, .98], [.2, .9, .3], SCOOP, [-1.3, 2.75, .1])
const gather = arm([-.38, 3.05, .95], [.15, .1, .98], [.2, .9, .3], BUNCH, [-1.3, 2.75, .1])
const lift = arm([-.28, 4.26, 1.12], [.2, .5, -.85], [.35, -.7, -.6], BUNCH, [-1.35, 3.0, .35])
const mouth = arm([-.22, 4.42, 1.08], [.2, .45, -.88], [.35, -.7, -.55], PUSH, [-1.35, 3.05, .35])

export const EAT_DURATION = 3.6
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

// ---- ပြီး / finished : open hands at the chest sweep down and out ---------------
const doneStart = arm([-.4, 3.32, .62], [.55, .8, .15], [.1, .1, -.99], OPEN, [-1.3, 2.9, .1])
const doneEnd = arm([-1.0, 2.88, .82], [-.25, .3, .92], [-.05, -.98, .15], OPEN, [-1.35, 2.7, .1])
export const FINISHED_DURATION = 2.4
const finished: SignPose[] = [
  rest(0), rest(.15),
  both(.7, doneStart),
  both(1.0, doneStart),
  both(1.45, doneEnd),
  both(1.75, doneEnd),
  rest(FINISHED_DURATION),
]

// ---- ၅ / five : spread hand raised, palm to the viewer -----------------------------
const fiveHand = arm([-.62, 3.75, .78], [.05, .99, .05], [0, 0, 1], SPREAD, [-1.3, 3.0, .2])
export const FIVE_DURATION = 2.3
const five: SignPose[] = [
  rest(0), rest(.15),
  one(.7, fiveHand),
  one(.95, at(fiveHand, [-.62, 3.82, .8])),
  one(1.2, fiveHand),
  one(1.6, fiveHand),
  rest(FIVE_DURATION),
]

// ---- မိနစ် / minute : index sweeps across the upright palm like a clock hand -----
const clockFace = arm([.28, 3.22, .66], [-.05, .99, .05], [-.98, 0, .15], OPEN, [1.3, 2.9, .2])
const handUp = arm([-.22, 3.28, .78], [.3, .95, 0], [0, 0, -1], POINT, [-1.3, 2.9, .2])
const handAcross = arm([-.2, 3.2, .78], [.95, -.3, 0], [0, 0, -1], POINT, [-1.3, 2.9, .2])
export const MINUTE_DURATION = 2.8
const minute: SignPose[] = [
  rest(0), rest(.15),
  one(.75, handUp, clockFace),
  one(1.05, handUp, clockFace),
  one(1.55, handAcross, clockFace),
  one(1.75, handUp, clockFace),
  one(2.15, handAcross, clockFace),
  rest(MINUTE_DURATION),
]

// ---- Body ---------------------------------------------------------------------
/**
 * Torso and head keys, in radians, in the final (right-handed) frame.
 * turn: whole upper body twists toward the viewer's right (+) or left (-).
 * lean: chest leans forward (+). headTurn / nod (+ = chin down) / tilt (+ = ear to the right).
 */
type BodyKey = { time: number; turn?: number; lean?: number; headTurn?: number; nod?: number; tilt?: number }

const DRINK_BODY: BodyKey[] = [
  { time: 0 }, { time: .55 },
  { time: 1.0, turn: .16, headTurn: .1 },
  { time: 1.55, turn: .34, headTurn: .22, nod: -.3, lean: -.04 },
  { time: 2.2, turn: .36, headTurn: .24, nod: -.34, lean: -.05 },
  { time: 2.6, turn: .18, headTurn: .1, nod: -.05 },
  { time: DRINK_DURATION },
]
const STOMACH_BODY: BodyKey[] = [
  { time: 0 }, { time: .4 },
  { time: 1.0, lean: .09, nod: .14, tilt: -.05 },
  { time: 2.8, lean: .1, nod: .16, tilt: -.06 },
  { time: STOMACH_ACHE_DURATION },
]
const QUESTION_BODY = (start: number, end: number, duration: number): BodyKey[] => [
  { time: 0 }, { time: start - .4 },
  { time: start, nod: -.06, lean: .04, tilt: .06 },
  { time: end, nod: -.06, lean: .04, tilt: .06 },
  { time: duration },
]
const EAT_BODY: BodyKey[] = [
  { time: 0 }, { time: .5 },
  { time: .8, lean: .05, nod: .12 },
  { time: 1.45, lean: .02, nod: -.04, headTurn: .04 },
  { time: 2.0, lean: .05, nod: .12 },
  { time: 2.65, lean: .02, nod: -.04, headTurn: .04 },
  { time: EAT_DURATION },
]

const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

function sampleBody(keys: BodyKey[], seconds: number) {
  const fields = ['turn', 'lean', 'headTurn', 'nod', 'tilt'] as const
  const i = keys.findIndex((key) => key.time >= seconds)
  const out = { turn: 0, lean: 0, headTurn: 0, nod: 0, tilt: 0 }
  if (i <= 0) return out
  const a = keys[i - 1], b = keys[i]
  const k = smoother((seconds - a.time) / (b.time - a.time))
  for (const field of fields) out[field] = (a[field] ?? 0) + ((b[field] ?? 0) - (a[field] ?? 0)) * k
  return out
}

/** Wrist position of one arm at `seconds`, eased between keys. */
function wristAt(poses: SignPose[], side: 'left' | 'right', seconds: number): number[] {
  const i = poses.findIndex((pose) => pose.time >= seconds)
  if (i <= 0) return poses[0][side].wrist
  const a = poses[i - 1][side].wrist, b = poses[i][side].wrist
  const k = smoother((seconds - poses[i - 1].time) / (poses[i].time - poses[i - 1].time))
  return a.map((value, axis) => value + (b[axis] - value) * k)
}

/**
 * Whole-body engagement, like a real signer: the shoulder rises with a raised
 * hand, the torso turns and leans a little toward the signing hand, and the
 * head follows. Applied before the arms are solved so hand contacts stay exact.
 * The optional body keys (turning to drink, bending over a sore stomach) are
 * applied afterwards, carrying the arms with the body.
 */
function createBody(model: Object3D, poses: SignPose[], keys: BodyKey[] = []) {
  const bones = new Map<string, Bone>()
  model.traverse((object) => { if (object instanceof Bone) bones.set(object.name, object) })
  const spine = bones.get('spine'), chest = bones.get('chest'), neck = bones.get('neck'), head = bones.get('head')
  const clavicles = { left: bones.get('clavicle.L'), right: bones.get('clavicle.R') }
  const q = new Quaternion(), parent = new Quaternion(), world = new Quaternion()
  const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1)
  const rotate = (bone: Bone | undefined, x: number, y: number, z: number) => {
    if (!bone) return
    bone.quaternion.multiply(q.setFromAxisAngle(Y, y)).multiply(q.setFromAxisAngle(X, x)).multiply(q.setFromAxisAngle(Z, z))
  }
  /** Rotate a bone about a model-space axis through its own origin. */
  const rotateWorld = (bone: Bone | undefined, axis: Vector3, angle: number) => {
    if (!bone?.parent) return
    bone.parent.getWorldQuaternion(parent)
    bone.getWorldQuaternion(world)
    const turn = q.setFromAxisAngle(axis.clone().applyQuaternion(model.getWorldQuaternion(new Quaternion())), angle)
    bone.quaternion.copy(parent.invert().multiply(turn.multiply(world)))
  }
  const activity = (wrist: number[], restWrist: number[]) =>
    smoother(clamp(Math.hypot(wrist[0] - restWrist[0], wrist[1] - restWrist[1], wrist[2] - restWrist[2]) / 1.1, 0, 1))

  const before = (seconds: number) => {
    const wr = wristAt(poses, 'right', seconds), wl = wristAt(poses, 'left', seconds)
    const ar = activity(wr, R.wrist), al = activity(wl, L.wrist)
    const active = Math.max(ar, al)
    const x = (wr[0] * ar + wl[0] * al) / (ar + al + 1e-6)
    const y = (wr[1] * ar + wl[1] * al) / (ar + al + 1e-6)
    // Shoulders lift as the hands rise toward the face.
    rotateWorld(clavicles.right, Z, .16 * smoother(clamp((wr[1] - 3.2) / 1.0, 0, 1)))
    rotateWorld(clavicles.left, Z, -.16 * smoother(clamp((wl[1] - 3.2) / 1.0, 0, 1)))
    // Torso leans in and turns slightly toward the hand that is signing.
    const across = clamp(x / .9, -1, 1)
    rotate(spine, .02 * active, .05 * active * across, 0)
    rotate(chest, .035 * active, .05 * active * across, -.02 * active * across)
    // Head follows the hands a little and drops its chin when they are low.
    rotate(neck, .02 * active, .04 * active * across, 0)
    rotate(head, .05 * active * clamp((3.6 - y) / 1.0, -1, 1), .05 * active * across, .02 * active * across)
  }
  const after = (seconds: number) => {
    if (!keys.length) return
    const body = sampleBody(keys, seconds)
    rotate(spine, body.lean * .4, body.turn * .45, 0)
    rotate(chest, body.lean * .6, body.turn * .55, 0)
    rotate(neck, body.nod * .4, body.headTurn * .4, -body.tilt * .4)
    rotate(head, body.nod * .6, body.headTurn * .6, -body.tilt * .6)
  }
  return { before, after }
}

// ---- Library -------------------------------------------------------------------

/** Move the book-style (left-handed on screen) poses onto the right hand. */
const toRightHand = (poses: SignPose[]): SignPose[] =>
  poses.map(({ time, left, right }) => ({ time, left: mirror(right), right: mirror(left) }))

/** Slide every non-rest wrist sideways (viewer's left is negative). */
const shiftX = (poses: SignPose[], dx: number): SignPose[] => poses.map(({ time, left, right }) => ({
  time,
  left: left === L ? L : at(left, [left.wrist[0] + dx, left.wrist[1], left.wrist[2]]),
  right: right === R ? R : at(right, [right.wrist[0] + dx, right.wrist[1], right.wrist[2]]),
}))

export const DEMO_SIGN_IDS = ['what_happened', 'stomach_ache', 'how', 'drink', 'eat', 'finished', 'five', 'minute'] as const
export type DemoSignId = (typeof DEMO_SIGN_IDS)[number]

export const DEMO_DURATIONS: Record<DemoSignId | 'medicine', number> = {
  what_happened: WHAT_HAPPENED_DURATION,
  stomach_ache: STOMACH_ACHE_DURATION,
  how: HOW_DURATION,
  drink: DRINK_DURATION,
  eat: EAT_DURATION,
  finished: FINISHED_DURATION,
  five: FIVE_DURATION,
  minute: MINUTE_DURATION,
  medicine: MEDICINE_DURATION,
}

export function createDemoSignLibrary(model: Object3D): Record<DemoSignId | 'medicine', SignAnimation> {
  // Continuous (monotone cubic) paths: the wrist keeps its velocity through
  // passing keys instead of stopping at every pose, like a real signer.
  const make = (authored: SignPose[], duration: number, keys?: BodyKey[], dx = 0) => {
    const poses = shiftX(toRightHand(authored), dx)
    const body = createBody(model, poses, keys)
    return createSignAnimation(model, poses, duration, { continuous: true, ...body })
  }
  return {
    what_happened: make(whatHappened, WHAT_HAPPENED_DURATION, QUESTION_BODY(2.3, 3.7, WHAT_HAPPENED_DURATION)),
    // The stomach sits a little to the viewer's left.
    stomach_ache: make(stomachAche, STOMACH_ACHE_DURATION, STOMACH_BODY, -.16),
    how: make(how, HOW_DURATION, QUESTION_BODY(.9, 2.6, HOW_DURATION)),
    drink: make(drink, DRINK_DURATION, DRINK_BODY),
    eat: make(eat, EAT_DURATION, EAT_BODY),
    finished: make(finished, FINISHED_DURATION),
    five: make(five, FIVE_DURATION),
    minute: make(minute, MINUTE_DURATION),
    medicine: make(medicine, MEDICINE_DURATION),
  }
}
