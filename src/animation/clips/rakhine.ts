/**
 * Animator: hand-written from signer pmt's 30 recorded takes (data/msl77/raw/pmt/rakhine)
 * (build_clips.py leaves this file alone).
 * Sign id:  rakhine
 * Myanmar:  ရခိုင်
 * English:  Rakhine
 *
 * Right hand only; the left arm stays at rest; the head stays still.
 * As recorded (medians over the takes), the hand rises up the outside and comes, like Chin,
 * to the centre of the forehead (the arm in front of the face), upright, and:
 *   A. palm toward the head (the back of the hand to the viewer), fingers up and a little
 *      inward; index finger half bent (~115°), middle/ring/little finger closed, thumb folded
 *      across;
 *   then the hand turns outward until the palm faces forward (as recorded, mid-turn the palm
 *   faces outward) and holds:
 *   B. palm toward the viewer, index finger extended straight up (~49°), the other fingers
 *      closed, thumb up alongside them;
 * then it goes back down.
 * The character's head is large and its arm short, so the right arm is 1.25× as long while the
 * hand is up (normal at rest) and the right shoulder lifts and comes forward a little; the clip
 * solves the longer arm itself on every frame. The arm path was searched on the real meshes
 * (tools/avatar/_armsearch.mjs). Not mirrored: poses are for bone side L, the character's
 * anatomical right hand. Everything is restored by reset()/idle(); nothing outside this file
 * changes.
 */
import { Bone, PropertyBinding, Quaternion, Vector3, type Object3D } from 'three'
import { createSignAnimation, REST_LEFT, REST_RIGHT, type ArmPose, type SignAnimation, type SignPose } from '../armPlayback'
import type { HandShape } from '../handArticulation'

export const RAKHINE_DURATION = 4.8

/** A: index half bent (recorded ~115°), middle/ring/little closed (~180°), thumb folded across. */
const HOOK: HandShape = {
  curl: { thumb: [.5, .4, .25], index: [.7, .8, .5], middle: [1.6, 1.7, 1.1], ring: [1.6, 1.7, 1.1], pinky: [1.6, 1.7, 1.1] },
  spread: { thumb: .2, index: 0, middle: 0, ring: 0, pinky: 0 },
  thumbOpposition: .9,
}
/** B: index extended straight up (recorded ~49°), the others closed, thumb up alongside. */
const INDEX_UP: HandShape = {
  curl: { thumb: [.3, .3, .2], index: [.35, .3, .15], middle: [1.55, 1.65, 1.05], ring: [1.6, 1.7, 1.1], pinky: [1.6, 1.7, 1.1] },
  spread: { thumb: .1, index: 0, middle: 0, ring: 0, pinky: 0 },
  thumbOpposition: .6,
}

// Model space: +y up, +z toward the viewer; the right hand works on -x (centre of the body is +x).
// Raw `palm` field is the normal of the BACK of the hand (minus the recorded palm normal).
const pose = (wrist: number[], direction: number[], palm: number[], handShape: HandShape, elbow: number[]): ArmPose =>
  ({ wrist, direction, palm, gather: 0, handShape, elbow })

const HOLD_STRETCH = 1.25
/** Upright in front of the centre of the forehead, like Chin (searched clean path; the arm comes up in front of the face). */
const CENTRE = [-.15, 5.45, 1.0]
const ELBOW = [-.31, 4.65, .89]
/** A: recorded fingers (.31, .95, .06), palm toward the head (.3, -.05, -.95). */
const handA = pose(CENTRE, [.31, .95, .06], [-.3, .05, .95], HOOK, ELBOW)
/** Mid-turn: palm facing outward (recorded about (-.71, .56, .43) at this moment). */
const turning = pose(CENTRE, [.2, .98, 0], [.71, -.56, -.43], INDEX_UP, ELBOW)
/** B: recorded fingers (.13, .99, -.04), palm toward the viewer (.09, .03, .99). */
const handB = pose(CENTRE, [.13, .99, -.04], [-.09, -.03, -.99], INDEX_UP, ELBOW)
/** Up the outside, as recorded, then in toward the face. */
const outside = pose([-1.5, 3.9, .45], [-.2, .9, .35], [-.6, -.3, -.75], HOOK, [-1.9, 3.1, -.1])
const approach = pose([-.7, 4.85, 1.05], [.3, .9, .2], [-.3, .1, .95], HOOK, [-.9, 4.2, .9])

const keys: [number, ArmPose][] = [
  [0, REST_LEFT], [.15, REST_LEFT],
  [.5, outside],
  [.75, approach],
  [.95, handA],
  [1.9, handA], // A: palm toward the head
  [2.07, turning], // turning outward
  [2.25, handB],
  [3.9, handB], // B: palm forward, index up
  [4.1, approach],
  [4.35, outside],
  [4.65, REST_LEFT],
  [RAKHINE_DURATION, REST_LEFT],
]
// `left` drives bone side L = the character's right arm; the left arm (bone side R) always rests.
const poses: SignPose[] = keys.map(([time, arm]) => ({ time, left: arm, right: REST_RIGHT }))

/** Body help (radians; stretch = right-arm length factor): 0 at rest. */
type Body = { time: number, shrug: number, forward: number, stretch: number }
const still = (time: number): Body => ({ time, shrug: 0, forward: 0, stretch: 1 })
const body: Body[] = [
  still(0), still(.15),
  { time: .5, shrug: .06, forward: .2, stretch: 1.08 },
  { time: .75, shrug: .15, forward: .55, stretch: 1.15 },
  { time: .95, shrug: .2, forward: .75, stretch: HOLD_STRETCH },
  { time: 3.9, shrug: .2, forward: .75, stretch: HOLD_STRETCH },
  { time: 4.1, shrug: .15, forward: .55, stretch: 1.15 },
  { time: 4.35, shrug: .06, forward: .2, stretch: 1.08 },
  still(4.65), still(RAKHINE_DURATION),
]
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
function bodyAt(seconds: number): Body {
  const i = body.findIndex((key) => key.time >= seconds)
  if (i <= 0) return body[0]
  const a = body[i - 1], b = body[i]
  const k = smoother((seconds - a.time) / (b.time - a.time))
  const mix = (field: 'shrug' | 'forward' | 'stretch') => a[field] + (b[field] - a[field]) * k
  return { time: seconds, shrug: mix('shrug'), forward: mix('forward'), stretch: mix('stretch') }
}

/** Wrist target and elbow pole of the right arm at `seconds`, interpolated like the playback does. */
function pathAt(seconds: number) {
  const right = Math.max(1, poses.findIndex((p) => p.time >= seconds))
  const a = poses[right - 1], b = poses[right]
  const t = Math.min(1, Math.max(0, (seconds - a.time) / (b.time - a.time))), span = b.time - a.time
  const tangent = (index: number, axis: number) => {
    if (index <= 0 || index >= poses.length - 1) return 0
    const before = (poses[index].left.wrist[axis] - poses[index - 1].left.wrist[axis]) / (poses[index].time - poses[index - 1].time)
    const after = (poses[index + 1].left.wrist[axis] - poses[index].left.wrist[axis]) / (poses[index + 1].time - poses[index].time)
    return before * after <= 0 ? 0 : 2 * before * after / (before + after)
  }
  const wrist = new Vector3(...[0, 1, 2].map((axis) =>
    (2 * t ** 3 - 3 * t ** 2 + 1) * a.left.wrist[axis] + (t ** 3 - 2 * t ** 2 + t) * span * tangent(right - 1, axis)
    + (-2 * t ** 3 + 3 * t ** 2) * b.left.wrist[axis] + (t ** 3 - t ** 2) * span * tangent(right, axis)))
  const fallback = [-1.15, 3.05, .04] // the playback's default pole when a key has none
  const pole = new Vector3(...(a.left.elbow ?? fallback)).lerp(new Vector3(...(b.left.elbow ?? a.left.elbow ?? fallback)), t)
  return { wrist, pole }
}

export function createRakhineAnimation(model: Object3D): SignAnimation {
  const bones = new Map<string, Bone>()
  model.traverse((object) => { if (object instanceof Bone) bones.set(object.name, object) })
  const bone = (name: string) => {
    const found = bones.get(name) ?? bones.get(PropertyBinding.sanitizeNodeName(name))
    if (!found) throw new Error(`Missing rakhine bone: ${name}`)
    return found
  }
  const clavicle = bone('clavicle.L')
  const upper = bone('upper_arm.L'), forearm = bone('forearm.L'), hand = bone('hand.L')
  const restForearm = forearm.position.clone(), restHand = hand.position.clone()
  const setStretch = (k: number) => {
    forearm.position.copy(restForearm).multiplyScalar(k)
    hand.position.copy(restHand).multiplyScalar(k)
  }
  const local = (b: Bone) => model.worldToLocal(b.getWorldPosition(new Vector3()))
  model.updateMatrixWorld(true)
  const upperLength = local(upper).distanceTo(local(forearm)), foreLength = local(forearm).distanceTo(local(hand))
  const Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1)
  /** Rotate a bone about a model-space axis through its own origin. */
  const rotateWorld = (target: Bone, axis: Vector3, angle: number) => {
    if (!target.parent || Math.abs(angle) < 1e-5) return
    const parent = target.parent.getWorldQuaternion(new Quaternion()).invert()
    const turn = new Quaternion().setFromAxisAngle(axis.clone().applyQuaternion(model.getWorldQuaternion(new Quaternion())), angle)
    target.quaternion.copy(parent.multiply(turn.multiply(target.getWorldQuaternion(new Quaternion()))))
    target.updateWorldMatrix(false, true)
  }
  const setWorldRotation = (target: Bone, rotation: Quaternion) => {
    target.quaternion.copy(target.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(rotation))
    target.updateWorldMatrix(false, true)
  }
  /** Turn `target` so that `child` points at `point` (model space). */
  const aim = (target: Bone, child: Bone, point: Vector3) => {
    const origin = target.getWorldPosition(new Vector3())
    const from = child.getWorldPosition(new Vector3()).sub(origin).normalize()
    const to = model.localToWorld(point.clone()).sub(origin).normalize()
    setWorldRotation(target, new Quaternion().setFromUnitVectors(from, to).multiply(target.getWorldQuaternion(new Quaternion())))
  }

  const clip = createSignAnimation(model, poses, RAKHINE_DURATION, {
    continuous: true,
    before: (seconds) => {
      const b = bodyAt(seconds)
      setStretch(b.stretch)
      rotateWorld(clavicle, Z, -b.shrug) // lift the right shoulder (its outer end is on -x)
      rotateWorld(clavicle, Y, b.forward) // and bring it a little forward
    },
    // While the arm is longer than the playback assumes, solve it again at its real length.
    after: (seconds) => {
      const k = bodyAt(seconds).stretch
      if (Math.abs(k - 1) < 1e-4) return
      const { wrist, pole } = pathAt(seconds)
      const S = local(upper), a = upperLength * k, b = foreLength * k
      const axis = wrist.clone().sub(S)
      const d = Math.min(axis.length(), (a + b) * .999)
      axis.normalize()
      const along = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - along * along))
      const bend = pole.clone().sub(S); bend.addScaledVector(axis, -bend.dot(axis)).normalize()
      const handRotation = hand.getWorldQuaternion(new Quaternion())
      aim(upper, forearm, S.clone().addScaledVector(axis, along).addScaledVector(bend, h))
      aim(forearm, hand, S.clone().addScaledVector(axis, d))
      setWorldRotation(hand, handRotation) // keep the hand's orientation (the fingers follow)
    },
  })
  const restore = () => setStretch(1)
  return {
    duration: RAKHINE_DURATION,
    apply: (seconds) => { restore(); clip.apply(seconds) },
    reset: () => { restore(); clip.reset() },
    idle: () => { restore(); clip.idle() },
  }
}
