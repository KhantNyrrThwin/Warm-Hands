/**
 * Animator: hand-written from the reference picture (build_clips.py leaves this file alone).
 * Sign id:  kachin
 * Myanmar:  ကချင်
 * English:  Kachin
 *
 * Right hand only; the left arm stays at rest for the whole sign.
 * 1. The bunched fingertips touch the top of the forehead.
 * 2. The hand opens upward: five fingers spread above the forehead, palm forward.
 * 3. "OK" hand (thumb and index finger touching, other fingers up) at the centre
 *    of the chest, then it moves out to the right hand's own side.
 *
 * Unlike the other demo clips this one is not mirrored: poses are written for
 * bone side L, which is the character's anatomical right hand (viewer's left).
 * The character's head is large and its arms short, so while the hand is at the
 * head the clip also lifts the right shoulder, tilts the head toward the hand and
 * lengthens the right arm a little. All of this is restored by reset()/idle().
 * Nothing outside this file changes.
 */
import { Bone, PropertyBinding, Quaternion, Vector3, type Object3D } from 'three'
import { createSignAnimation, REST_LEFT, REST_RIGHT, type ArmPose, type SignAnimation, type SignPose } from '../armPlayback'
import type { HandShape } from '../handArticulation'
import { BUNCH, SPREAD } from './shared'

export const KACHIN_DURATION = 4.9

/** Thumb tip meets the curled index finger; middle, ring and little finger up. */
const OK_SHAPE: HandShape = {
  // thumb values fitted on the rig so the thumb tip meets the index fingertip
  curl: { thumb: [.8, .3, .21], index: [.9, 1, .7], middle: [.08, .05, .03], ring: [.1, .06, .04], pinky: [.14, .08, .05] },
  spread: { thumb: -.3, middle: .02, ring: .1, pinky: .2 },
  thumbOpposition: .2,
}

// Model space: +y up, +z toward the viewer; the right hand works on -x.
// Raw `palm` field: [0, 0, 1] turns the palm toward the body, [0, 0, -1] toward the viewer.
const pose = (wrist: number[], direction: number[], palm: number[], handShape: HandShape, elbow: number[]): ArmPose =>
  ({ wrist, direction, palm, gather: 0, handShape, elbow })

/** Elbow pole for the head part: elbow high and out to the side, the arm arching up. */
const HIGH = [-1.75, 4.7, .1]
/** Rising from rest, beside the body. */
const rising = pose([-1.05, 3.2, .5], [.05, .6, .4], [0, 0, 1], BUNCH, [-1.5, 3.0, -.2])
/** Still rising, out in front of the shoulder. */
const lift = pose([-.85, 4.35, .85], [.2, .95, .1], [0, .1, 1], BUNCH, [-1.6, 4.0, 0])
/** 1. Bunched fingertips on the top of the forehead. */
const forehead = pose([-.5, 5.17, 1.0], [.08, .95, -.3], [0, .3, .95], BUNCH, HIGH)
/** 2. Opened upward: spread fingers above the forehead, palm toward the viewer. */
const opened = pose([-.6, 5.45, .98], [0, 1, .08], [0, 0, -1], SPREAD, HIGH)
/** On the way down, outside the face, in front of the right shoulder. */
const passing = pose([-.85, 4.2, 1.0], [.15, .95, .2], [-.3, 0, -.95], OK_SHAPE, [-1.5, 3.2, -.1])
/** 3. OK hand at the centre of the chest, reaching slightly across to the left side. */
const centre = pose([.1, 3.38, .88], [.05, 1, .12], [-.2, 0, -.98], OK_SHAPE, [-1.1, 2.5, .3])
/** ...then moved out to the right hand's own side (the red arrow). */
const out = pose([-.95, 3.38, .88], [-.05, 1, .12], [-.2, 0, -.98], OK_SHAPE, [-1.6, 2.7, -.1])
const lowering = pose([-1.05, 2.95, .55], [-.1, -.3, .3], [0, 0, -1], OK_SHAPE, [-1.5, 2.9, -.2])

const keys: [number, ArmPose][] = [
  [0, REST_LEFT], [.15, REST_LEFT],
  [.42, rising],
  [.7, lift],
  [1.0, forehead],
  [1.35, forehead], // hold on the forehead
  [1.7, opened],
  [2.0, opened], // hold, opened upward
  [2.4, passing],
  [2.75, centre],
  [3.0, centre], // hold at the centre of the chest
  [3.5, out], // moves out to the right
  [3.75, out],
  [4.15, lowering],
  [4.65, REST_LEFT],
  [KACHIN_DURATION, REST_LEFT],
]
// `left` drives bone side L = the character's right arm; the left arm (bone side R) always rests.
const poses: SignPose[] = keys.map(([time, arm]) => ({ time, left: arm, right: REST_RIGHT }))

/** Body help while the hand is at the head (radians; stretch = right-arm length factor). */
type Body = { time: number, shrug: number, tilt: number, nod: number, stretch: number }
const body: Body[] = [
  { time: 0, shrug: 0, tilt: 0, nod: 0, stretch: 1 },
  { time: .15, shrug: 0, tilt: 0, nod: 0, stretch: 1 },
  { time: .7, shrug: .18, tilt: .08, nod: 0, stretch: 1.08 },
  { time: 1.0, shrug: .35, tilt: .2, nod: .03, stretch: 1.2 },
  { time: 1.35, shrug: .35, tilt: .2, nod: .03, stretch: 1.2 },
  { time: 1.7, shrug: .38, tilt: .16, nod: 0, stretch: 1.22 },
  { time: 2.0, shrug: .38, tilt: .16, nod: 0, stretch: 1.22 },
  { time: 2.4, shrug: .08, tilt: .03, nod: 0, stretch: 1.03 },
  { time: 2.75, shrug: 0, tilt: 0, nod: 0, stretch: 1 },
  { time: KACHIN_DURATION, shrug: 0, tilt: 0, nod: 0, stretch: 1 },
]
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
function bodyAt(seconds: number): Body {
  const i = body.findIndex((key) => key.time >= seconds)
  if (i <= 0) return body[0]
  const a = body[i - 1], b = body[i]
  const k = smoother((seconds - a.time) / (b.time - a.time))
  const mix = (field: 'shrug' | 'tilt' | 'nod' | 'stretch') => a[field] + (b[field] - a[field]) * k
  return { time: seconds, shrug: mix('shrug'), tilt: mix('tilt'), nod: mix('nod'), stretch: mix('stretch') }
}

export function createKachinAnimation(model: Object3D): SignAnimation {
  const bones = new Map<string, Bone>()
  model.traverse((object) => { if (object instanceof Bone) bones.set(object.name, object) })
  const bone = (name: string) => {
    const found = bones.get(name) ?? bones.get(PropertyBinding.sanitizeNodeName(name))
    if (!found) throw new Error(`Missing kachin bone: ${name}`)
    return found
  }
  const clavicle = bone('clavicle.L'), neck = bone('neck'), head = bone('head')
  const forearm = bone('forearm.L'), hand = bone('hand.L')
  const restForearm = forearm.position.clone(), restHand = hand.position.clone()
  const setStretch = (s: number) => {
    forearm.position.copy(restForearm).multiplyScalar(s)
    hand.position.copy(restHand).multiplyScalar(s)
  }
  const q = new Quaternion(), parent = new Quaternion(), world = new Quaternion()
  const X = new Vector3(1, 0, 0), Z = new Vector3(0, 0, 1)
  /** Rotate a bone about a model-space axis through its own origin. */
  const rotateWorld = (target: Bone, axis: Vector3, angle: number) => {
    if (!target.parent || Math.abs(angle) < 1e-5) return
    target.parent.getWorldQuaternion(parent)
    target.getWorldQuaternion(world)
    const turn = q.setFromAxisAngle(axis.clone().applyQuaternion(model.getWorldQuaternion(new Quaternion())), angle)
    target.quaternion.copy(parent.invert().multiply(turn.multiply(world)))
    target.updateWorldMatrix(false, true)
  }

  const clip = createSignAnimation(model, poses, KACHIN_DURATION, {
    continuous: true,
    // Before the arm is solved, so the hand still lands on its target.
    before: (seconds) => {
      const b = bodyAt(seconds)
      setStretch(b.stretch)
      rotateWorld(clavicle, Z, -b.shrug) // raise the right shoulder (its outer end is on -x)
      // +Z turns the top of the head toward -x, toward the right hand; +X nods the chin down.
      rotateWorld(neck, Z, b.tilt * .4)
      rotateWorld(neck, X, b.nod * .4)
      rotateWorld(head, Z, b.tilt * .6)
      rotateWorld(head, X, b.nod * .6)
    },
  })
  const restore = () => setStretch(1)
  return {
    duration: KACHIN_DURATION,
    apply: (seconds) => { restore(); clip.apply(seconds) },
    reset: () => { restore(); clip.reset() },
    idle: () => { restore(); clip.idle() },
  }
}
