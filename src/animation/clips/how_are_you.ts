/**
 * Animator: hand-made from the reference picture (no recordings; build_clips.py leaves this file
 * alone and lists it in the index through HAND_MADE_WORDS).
 * Sign id:  how_are_you
 * Myanmar:  နေကောင်းလား
 * English:  How are you?
 *
 * Right hand only; the left arm stays at rest.
 * 1. The flat right hand on the forehead: palm on the forehead, fingers together pointing
 *    across to the left; the head upright.
 * 2. Thumbs-up in front of the right shoulder (the approved "fine" pose, on the right hand),
 *    the head tilted to the side and the eyebrows raised (the face drawing in the picture).
 * The character's head is large and its arms short, so while the hand is on the forehead the
 * right arm is HOLD_STRETCH× as long and the right shoulder lifts and comes forward a little,
 * the arm coming up in front of the face (as in Chin); the clip solves the longer arm itself on
 * every frame. Not mirrored: poses are for bone side L, the character's anatomical right hand.
 * Everything (arm length, head, eyebrows) is restored by reset()/idle(); nothing outside this
 * file changes.
 */
import { Bone, PropertyBinding, Quaternion, Vector3, type Mesh, type Object3D } from 'three'
import { createSignAnimation, REST_LEFT, REST_RIGHT, type ArmPose, type SignAnimation, type SignPose } from '../armPlayback'
import { HAND_SHAPES, type HandShape } from '../handArticulation'

export const HOW_ARE_YOU_DURATION = 4.3

/** 1: flat hand, fingers together and gently curved to lie on the round forehead, thumb alongside. */
const FLAT: HandShape = {
  curl: { thumb: [.15, .1, .05], index: [.3, .2, .1], middle: [.3, .2, .1], ring: [.3, .2, .1], pinky: [.3, .2, .1] },
  spread: { thumb: .2, index: -.03, middle: 0, ring: .02, pinky: .04 },
  thumbOpposition: .1,
}

// Model space: +y up, +z toward the viewer; the right hand works on -x (centre of the body is +x).
// Raw `palm` field is the normal of the BACK of the hand.
const pose = (wrist: number[], direction: number[], palm: number[], handShape: HandShape, elbow: number[]): ArmPose =>
  ({ wrist, direction, palm, gather: 0, handShape, elbow })

const HOLD_STRETCH = 1.4
/** 1. On the forehead: palm on it, fingers across to the left. */
const forehead = pose([-.44, 5.64, .68], [.98, 0, .05], [0, .1, .99], FLAT, [-.66, 4.84, .88])
/** 2. Thumbs-up in front of the right shoulder (the approved "fine" pose). */
const thumbsUp = pose([-.62, 3.75, .9], [.12, .35, .93], [-1, 0, .1], HAND_SHAPES.thumbsUp, [-1.25, 2.8, -.3])
/** Up the outside, then in front of the face; and down from the forehead to the thumbs-up. */
const outside = pose([-1.45, 3.9, .45], [-.2, .9, .35], [-.6, -.3, -.75], FLAT, [-1.9, 3.1, -.1])
const approach = pose([-.8, 4.9, 1.05], [.6, .75, .2], [-.3, .3, .9], FLAT, [-1.0, 4.2, .9])
const descending = pose([-.8, 4.55, 1.0], [.2, .5, .85], [-.9, .2, .3], HAND_SHAPES.thumbsUp, [-1.15, 3.6, .3])
const lowering = pose([-.85, 3.15, .8], [.12, .35, .93], [-1, 0, .1], HAND_SHAPES.thumbsUp, [-1.25, 2.8, -.3])

const keys: [number, ArmPose][] = [
  [0, REST_LEFT], [.15, REST_LEFT],
  [.45, outside],
  [.7, approach],
  [.95, forehead],
  [1.75, forehead], // 1. held on the forehead
  [2.05, descending],
  [2.35, thumbsUp],
  [3.5, thumbsUp], // 2. thumbs-up held, head tilted, eyebrows raised
  [3.85, lowering],
  [4.15, REST_LEFT],
  [HOW_ARE_YOU_DURATION, REST_LEFT],
]
// `left` drives bone side L = the character's right arm; the left arm (bone side R) always rests.
const poses: SignPose[] = keys.map(([time, arm]) => ({ time, left: arm, right: REST_RIGHT }))

/** Body and face (radians; stretch = right-arm length factor; brow = eyebrows raised 0..1). */
type Body = { time: number, shrug: number, forward: number, stretch: number, tilt: number, brow: number }
const still = (time: number): Body => ({ time, shrug: 0, forward: 0, stretch: 1, tilt: 0, brow: 0 })
const body: Body[] = [
  still(0), still(.15),
  { time: .45, shrug: .1, forward: .2, stretch: 1.1, tilt: 0, brow: 0 },
  { time: .7, shrug: .25, forward: .55, stretch: 1.28, tilt: 0, brow: 0 },
  { time: .95, shrug: .35, forward: .75, stretch: HOLD_STRETCH, tilt: 0, brow: 0 },
  { time: 1.75, shrug: .35, forward: .75, stretch: HOLD_STRETCH, tilt: 0, brow: 0 },
  { time: 2.05, shrug: .12, forward: .25, stretch: 1.1, tilt: .08, brow: .4 },
  { time: 2.4, shrug: 0, forward: 0, stretch: 1, tilt: .22, brow: 1 },
  { time: 3.5, shrug: 0, forward: 0, stretch: 1, tilt: .22, brow: 1 },
  { time: 3.85, shrug: 0, forward: 0, stretch: 1, tilt: .06, brow: .2 },
  still(4.15), still(HOW_ARE_YOU_DURATION),
]
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
function bodyAt(seconds: number): Body {
  const i = body.findIndex((key) => key.time >= seconds)
  if (i <= 0) return body[0]
  const a = body[i - 1], b = body[i]
  const k = smoother((seconds - a.time) / (b.time - a.time))
  const mix = (field: 'shrug' | 'forward' | 'stretch' | 'tilt' | 'brow') => a[field] + (b[field] - a[field]) * k
  return { time: seconds, shrug: mix('shrug'), forward: mix('forward'), stretch: mix('stretch'), tilt: mix('tilt'), brow: mix('brow') }
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

export function createHowAreYouAnimation(model: Object3D): SignAnimation {
  const bones = new Map<string, Bone>()
  model.traverse((object) => { if (object instanceof Bone) bones.set(object.name, object) })
  const bone = (name: string) => {
    const found = bones.get(name) ?? bones.get(PropertyBinding.sanitizeNodeName(name))
    if (!found) throw new Error(`Missing how_are_you bone: ${name}`)
    return found
  }
  const clavicle = bone('clavicle.L'), neck = bone('neck'), head = bone('head')
  const upper = bone('upper_arm.L'), forearm = bone('forearm.L'), hand = bone('hand.L')
  const restForearm = forearm.position.clone(), restHand = hand.position.clone()
  const setStretch = (k: number) => {
    forearm.position.copy(restForearm).multiplyScalar(k)
    hand.position.copy(restHand).multiplyScalar(k)
  }
  // Raised eyebrows. The model's own browRaise shapes lift the brows straight up, which sinks them
  // under the forehead (it bulges forward just above them), so here they are lifted up and a little
  // forward, following the forehead. The eyebrows move rigidly with the head bone, so the offset is
  // applied to their points directly (head frame) and put back exactly by setBrows(0).
  const BROW_UP = .028, BROW_FORWARD = .045
  const brows: { mesh: Mesh, rest: Float32Array }[] = []
  model.traverse((object) => {
    const mesh = object as Mesh
    if (mesh.isMesh && /^Eyebrow[LR]$/.test(mesh.name)) brows.push({ mesh, rest: (mesh.geometry.attributes.position.array as Float32Array).slice() })
  })
  let browNow = 0
  const setBrows = (v: number) => {
    if (Math.abs(v - browNow) < 1e-4) return
    browNow = v
    for (const { mesh, rest } of brows) {
      const pos = mesh.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] = rest[i]; pos[i + 1] = rest[i + 1] + BROW_UP * v; pos[i + 2] = rest[i + 2] + BROW_FORWARD * v
      }
      mesh.geometry.attributes.position.needsUpdate = true
    }
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

  const clip = createSignAnimation(model, poses, HOW_ARE_YOU_DURATION, {
    continuous: true,
    before: (seconds) => {
      const b = bodyAt(seconds)
      setStretch(b.stretch)
      rotateWorld(clavicle, Z, -b.shrug) // lift the right shoulder (its outer end is on -x)
      rotateWorld(clavicle, Y, b.forward) // and bring it forward, so the arm passes in front of the face
      // tilt the head to the signer's left (+x): -Z turns the top of the head toward +x
      rotateWorld(neck, Z, -b.tilt * .4)
      rotateWorld(head, Z, -b.tilt * .6)
      setBrows(b.brow)
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
  const restore = () => { setStretch(1); setBrows(0) }
  return {
    duration: HOW_ARE_YOU_DURATION,
    apply: (seconds) => { restore(); clip.apply(seconds) },
    reset: () => { restore(); clip.reset() },
    idle: () => { restore(); clip.idle() },
  }
}
