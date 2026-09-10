import { Bone, Matrix4, Object3D, PropertyBinding, Quaternion, Vector3 } from 'three'

export const MINGALARBAR_DURATION = 6.4

// Pose references: src/assets/Mingalarpar/1.png through 5.png.
// The supplied GLB is Y-up, facing +Z. This is a reference-based demo, not a validated MSL dataset.
const poses = [
  { time: 0, wrist: [1.10, 2.54, 0], direction: [.045, -.27, 0], palm: [0, 0, 1], nod: 0 },
  { time: .35, wrist: [1.10, 2.54, 0], direction: [.045, -.27, 0], palm: [0, 0, 1], nod: 0 },
  { time: 1.15, wrist: [.76, 2.96, .43], direction: [-.65, -.76, .02], palm: [0, 0, 1], nod: 0 },
  { time: 1.95, wrist: [.44, 3.29, .60], direction: [-.96, .28, 0], palm: [0, 0, 1], nod: 0 },
  { time: 2.8, wrist: [.13, 3.46, .69], direction: [-.13, .99, 0], palm: [-1, 0, .04], nod: 0 },
  { time: 3.35, wrist: [.108, 3.46, .69], direction: [-.10, .995, 0], palm: [-1, 0, 0], nod: .065 },
  { time: 4.25, wrist: [.108, 3.46, .69], direction: [-.10, .995, 0], palm: [-1, 0, 0], nod: .065 },
  { time: 4.8, wrist: [.44, 3.29, .60], direction: [-.96, .28, 0], palm: [0, 0, 1], nod: 0 },
  { time: 5.55, wrist: [.76, 2.96, .43], direction: [-.65, -.76, .02], palm: [0, 0, 1], nod: 0 },
  { time: MINGALARBAR_DURATION, wrist: [1.10, 2.54, 0], direction: [.045, -.27, 0], palm: [0, 0, 1], nod: 0 },
]

const smoothstep = (x: number) => x * x * (3 - 2 * x)
function basis(direction: Vector3, palm: Vector3) {
  const y = direction.clone().normalize()
  const x = y.clone().cross(palm).normalize()
  const z = x.clone().cross(y).normalize()
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z))
}

export function createMingalarbarAnimation(model: Object3D) {
  const bones = new Map<string, Bone>()
  model.traverse((object) => { if (object instanceof Bone) bones.set(object.name, object) })
  const getBone = (name: string) => {
    // Use the same sanitization as GLTFLoader (e.g. upper_arm.L -> upper_armL).
    const bone = bones.get(name) ?? bones.get(PropertyBinding.sanitizeNodeName(name))
    if (!bone) throw new Error(`Missing greeting bone: ${name}`)
    return bone
  }
  const rest = new Map([...bones.values()].map((bone) => [bone, bone.quaternion.clone()]))
  model.updateMatrixWorld(true)
  const modelRotation = model.getWorldQuaternion(new Quaternion())
  const arms = [1, -1].map((sign) => {
    const side = sign === 1 ? 'L' : 'R'
    const upper = getBone(`upper_arm.${side}`)
    const forearm = getBone(`forearm.${side}`)
    const hand = getBone(`hand.${side}`)
    const a = upper.getWorldPosition(new Vector3())
    const b = forearm.getWorldPosition(new Vector3())
    const c = hand.getWorldPosition(new Vector3())
    const restDirection = new Vector3(sign * .045, -.27, 0).normalize().applyQuaternion(modelRotation)
    const restPalm = new Vector3(0, 0, 1).applyQuaternion(modelRotation)
    const handBasisOffset = basis(restDirection, restPalm).invert().multiply(hand.getWorldQuaternion(new Quaternion()))
    return { sign, upper, forearm, hand, upperLength: a.distanceTo(b), lowerLength: b.distanceTo(c), handBasisOffset }
  })
  const head = getBone('head')
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
  const apply = (seconds: number) => {
    reset()
    if (seconds <= 0 || seconds >= MINGALARBAR_DURATION) return
    const right = poses.findIndex((pose) => pose.time >= seconds)
    const a = poses[Math.max(0, right - 1)]
    const b = poses[right]
    const t = smoothstep((seconds - a.time) / (b.time - a.time))
    for (const arm of arms) {
      const vector = (v: number[]) => new Vector3(v[0] * arm.sign, v[1], v[2])
      const wrist = model.localToWorld(vector(a.wrist).lerp(vector(b.wrist), t))
      const shoulder = arm.upper.getWorldPosition(new Vector3())
      const axis = wrist.clone().sub(shoulder)
      const distance = Math.min(axis.length(), arm.upperLength + arm.lowerLength - .0001)
      axis.normalize()
      const along = (arm.upperLength ** 2 - arm.lowerLength ** 2 + distance ** 2) / (2 * distance)
      const height = Math.sqrt(Math.max(0, arm.upperLength ** 2 - along ** 2))
      // Keep the elbows outside the torso as the wrists meet in front of the chest.
      const pole = model.localToWorld(new Vector3(arm.sign * 1.15, 3.05, .04)).sub(shoulder)
      pole.addScaledVector(axis, -pole.dot(axis)).normalize()
      const elbow = shoulder.clone().addScaledVector(axis, along).addScaledVector(pole, height)
      aim(arm.upper, arm.forearm, elbow)
      aim(arm.forearm, arm.hand, wrist)
      const qa = basis(vector(a.direction), vector(a.palm))
      const qb = basis(vector(b.direction), vector(b.palm))
      setWorldRotation(arm.hand, modelRotation.clone().multiply(qa.slerp(qb, t)).multiply(arm.handBasisOffset))
    }
    head.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), a.nod + (b.nod - a.nod) * t))
    model.updateMatrixWorld(true)
  }
  return { apply, reset, duration: MINGALARBAR_DURATION }
}
