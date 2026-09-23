import { Bone, Matrix4, Object3D, PropertyBinding, Quaternion, Vector3 } from 'three'
import { createHandArticulation, HAND_SHAPES, type HandShape } from './handArticulation'

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'

export type ArmPose = {
  wrist: number[]
  direction: number[]
  palm: number[]
  gather: number
  fingers?: Partial<Record<FingerName, number>>
  handShape?: HandShape
}

export type SignPose = {
  time: number
  left: ArmPose
  right: ArmPose
}

export type SignAnimation = {
  apply: (seconds: number) => void
  reset: () => void
  idle: () => void
  duration: number
}

const smoothstep = (x: number) => x * x * (3 - 2 * x)

function basis(direction: Vector3, palm: Vector3) {
  const y = direction.clone().normalize()
  const x = y.clone().cross(palm).normalize()
  const z = x.clone().cross(y).normalize()
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z))
}

export const REST_LEFT: ArmPose = { wrist: [1.10, 2.54, 0], direction: [.045, -.27, 0], palm: [0, 0, -1], gather: 0, handShape: HAND_SHAPES.fist }
export const REST_RIGHT: ArmPose = { wrist: [-1.10, 2.54, 0], direction: [-.045, -.27, 0], palm: [0, 0, -1], gather: 0, handShape: HAND_SHAPES.fist }

export function mirrorArm(pose: ArmPose): ArmPose {
  return {
    wrist: [-pose.wrist[0], pose.wrist[1], pose.wrist[2]],
    direction: [-pose.direction[0], pose.direction[1], pose.direction[2]],
    palm: [-pose.palm[0], pose.palm[1], pose.palm[2]],
    gather: pose.gather,
    fingers: pose.fingers,
    handShape: pose.handShape,
  }
}

export function createSignAnimation(model: Object3D, poses: SignPose[], duration: number): SignAnimation {
  const bones = new Map<string, Bone>()
  model.traverse((object) => { if (object instanceof Bone) bones.set(object.name, object) })
  const getBone = (name: string) => {
    const bone = bones.get(name) ?? bones.get(PropertyBinding.sanitizeNodeName(name))
    if (!bone) throw new Error(`Missing greeting bone: ${name}`)
    return bone
  }
  const rest = new Map([...bones.values()].map((bone) => [bone, bone.quaternion.clone()]))
  model.updateMatrixWorld(true)
  const modelRotation = model.getWorldQuaternion(new Quaternion())
  const articulation = createHandArticulation(model)
  const arms = [1, -1].map((sign) => {
    const side = sign === 1 ? 'L' : 'R'
    const upper = getBone(`upper_arm.${side}`)
    const forearm = getBone(`forearm.${side}`)
    const hand = getBone(`hand.${side}`)
    const a = upper.getWorldPosition(new Vector3())
    const b = forearm.getWorldPosition(new Vector3())
    const c = hand.getWorldPosition(new Vector3())
    const restPose = sign === 1 ? REST_LEFT : REST_RIGHT
    const restDirection = new Vector3(...restPose.direction).normalize().applyQuaternion(modelRotation)
    const restPalm = new Vector3(...restPose.palm).applyQuaternion(modelRotation)
    const handBasisOffset = basis(restDirection, restPalm).invert().multiply(hand.getWorldQuaternion(new Quaternion()))
    const fingers = (['index', 'middle', 'ring', 'pinky', 'thumb'] as FingerName[]).map((name) => ({
      name,
      root: getBone(`${name}.01.${side}`),
      next: getBone(`${name}.02.${side}`),
      amount: name === 'thumb' ? .55 : .9,
    }))
    return { sign, upper, forearm, hand, fingers, upperLength: a.distanceTo(b), lowerLength: b.distanceTo(c), handBasisOffset }
  })
  const reset = () => {
    for (const [bone, quaternion] of rest) bone.quaternion.copy(quaternion)
    model.updateMatrixWorld(true)
  }
  const setWorldRotation = (bone: Bone, rotation: Quaternion) => {
    const parent = bone.parent!.getWorldQuaternion(new Quaternion()).invert()
    bone.quaternion.copy(parent.multiply(rotation))
    bone.updateWorldMatrix(false, true)
  }
  const aim = (bone: Bone, child: Bone, target: Vector3) => {
    const origin = bone.getWorldPosition(new Vector3())
    const from = child.getWorldPosition(new Vector3()).sub(origin).normalize()
    const to = target.clone().sub(origin).normalize()
    const world = bone.getWorldQuaternion(new Quaternion())
    setWorldRotation(bone, new Quaternion().setFromUnitVectors(from, to).multiply(world))
  }
  const idle = () => {
    reset()
    articulation.apply('L', HAND_SHAPES.fist)
    articulation.apply('R', HAND_SHAPES.fist)
  }
  const apply = (seconds: number) => {
    reset()
    if (seconds <= 0) {
      idle()
      return
    }
    if (seconds >= duration) {
      idle()
      return
    }
    const right = poses.findIndex((pose) => pose.time >= seconds)
    const a = poses[Math.max(0, right - 1)]
    const b = poses[right]
    const t = smoothstep((seconds - a.time) / (b.time - a.time))
    for (const arm of arms) {
      const poseA = arm.sign === 1 ? a.left : a.right
      const poseB = arm.sign === 1 ? b.left : b.right
      const vec = (v: number[]) => new Vector3(v[0], v[1], v[2])
      const wrist = model.localToWorld(vec(poseA.wrist).lerp(vec(poseB.wrist), t))
      const shoulder = arm.upper.getWorldPosition(new Vector3())
      const axis = wrist.clone().sub(shoulder)
      const distance = Math.min(axis.length(), arm.upperLength + arm.lowerLength - .0001)
      axis.normalize()
      const along = (arm.upperLength ** 2 - arm.lowerLength ** 2 + distance ** 2) / (2 * distance)
      const height = Math.sqrt(Math.max(0, arm.upperLength ** 2 - along ** 2))
      const pole = model.localToWorld(new Vector3(arm.sign * 1.15, 3.05, .04)).sub(shoulder)
      pole.addScaledVector(axis, -pole.dot(axis)).normalize()
      const elbow = shoulder.clone().addScaledVector(axis, along).addScaledVector(pole, height)
      aim(arm.upper, arm.forearm, elbow)
      aim(arm.forearm, arm.hand, wrist)
      const qa = basis(vec(poseA.direction), vec(poseA.palm))
      const qb = basis(vec(poseB.direction), vec(poseB.palm))
      setWorldRotation(arm.hand, modelRotation.clone().multiply(qa.slerp(qb, t)).multiply(arm.handBasisOffset))
      const handDirection = new Vector3(0, 1, 0).applyQuaternion(arm.hand.getWorldQuaternion(new Quaternion()))
      const aUp = poseA.handShape === HAND_SHAPES.thumbsUp
      const bUp = poseB.handShape === HAND_SHAPES.thumbsUp
      const thumbsUp = aUp || bUp
      for (const finger of arm.fingers) {
        if (thumbsUp && finger.name === 'thumb') continue
        const amountA = poseA.fingers?.[finger.name] ?? poseA.gather
        const amountB = poseB.fingers?.[finger.name] ?? poseB.gather
        const fingerGather = amountA + (amountB - amountA) * t
        const direction = finger.next.getWorldPosition(new Vector3()).sub(finger.root.getWorldPosition(new Vector3())).normalize()
        const current = finger.root.getWorldQuaternion(new Quaternion())
        const aligned = new Quaternion().setFromUnitVectors(direction, handDirection).multiply(current)
        setWorldRotation(finger.root, current.slerp(aligned, fingerGather * finger.amount))
      }
      const side = arm.sign === 1 ? 'L' : 'R'
      articulation.apply(side, poseA.handShape ?? {}, poseB.handShape ?? {}, t)
      const rollAmount = (aUp ? 1 - t : 0) + (bUp ? t : 0)
      if (rollAmount > .01) {
        const thumbRoot = getBone(`thumb.01.${side}`)
        const thumbTip = getBone(`thumb.03.${side}`)
        const thumbDir = thumbTip.getWorldPosition(new Vector3()).sub(thumbRoot.getWorldPosition(new Vector3()))
        if (thumbDir.lengthSq() > 1e-6) {
          thumbDir.normalize()
          const handAxis = new Vector3(0, 1, 0).applyQuaternion(arm.hand.getWorldQuaternion(new Quaternion()))
          const thumbPerp = thumbDir.clone().addScaledVector(handAxis, -thumbDir.dot(handAxis))
          const upPerp = new Vector3(0, 1, 0).addScaledVector(handAxis, -handAxis.y)
          if (thumbPerp.length() > .12 && upPerp.length() > .12) {
            const roll = new Quaternion().setFromUnitVectors(thumbPerp.normalize(), upPerp.normalize())
            const handQ = arm.hand.getWorldQuaternion(new Quaternion())
            setWorldRotation(arm.hand, new Quaternion().slerpQuaternions(handQ, roll.multiply(handQ.clone()), rollAmount))
          }
        }
      }
    }
    model.updateMatrixWorld(true)
  }
  return { apply, reset, idle, duration }
}
