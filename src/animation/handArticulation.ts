import { Bone, Object3D, PropertyBinding, Quaternion, Vector3 } from 'three'

export type Digit = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'
export type JointCurl = number | readonly [number, number, number]
export type HandShape = {
  /** Radians at each joint, or 0..1 for a proportional curl. */
  curl?: Partial<Record<Digit, JointCurl>>
  /** Signed radians of sideways motion at the finger base. */
  spread?: Partial<Record<Digit, number>>
  /** 0..1 rotation of the thumb pad toward the fingers. */
  thumbOpposition?: number
}

const digits: Digit[] = ['thumb', 'index', 'middle', 'ring', 'pinky']
const limits = [1.4, 1.65, 1.2] as const
const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(x) ? x : 0))
const angles = (curl: JointCurl | undefined): readonly number[] =>
  typeof curl === 'number' ? [1.25, 1.45, .9].map((x) => x * clamp(curl, 0, 1)) : curl ?? [0, 0, 0]

export const HAND_SHAPES = {
  open: {} as HandShape,
  fist: { curl: { index: 1, middle: 1, ring: 1, pinky: 1, thumb: [.5, .48, .25] }, thumbOpposition: .75 } as HandShape,
  thumbsUp: { curl: { index: 1, middle: 1, ring: 1, pinky: 1 } } as HandShape,
  point: { curl: { middle: 1, ring: 1, pinky: 1, thumb: [.4, .4, .2] }, thumbOpposition: .6 } as HandShape,
}

/** Applies offsets AFTER the arm solver has restored its base pose. */
export function createHandArticulation(model: Object3D) {
  const joints = (['L', 'R'] as const).map((side) => ({
    side,
    fingers: digits.map((digit) => ({
      digit,
      bones: [1, 2, 3].map((joint) => {
        const name = `${digit}.0${joint}.${side}`
        const bone = model.getObjectByName(name) ?? model.getObjectByName(PropertyBinding.sanitizeNodeName(name))
        if (!(bone instanceof Bone)) throw new Error(`Missing finger joint: ${name}`)
        return bone
      }),
    })),
  }))
  const x = new Vector3(1, 0, 0), y = new Vector3(0, 1, 0), z = new Vector3(0, 0, 1)
  return {
    apply(side: 'L' | 'R', a: HandShape = {}, b: HandShape = a, blend = 0) {
      const hand = joints.find((h) => h.side === side)!
      const t = clamp(blend, 0, 1)
      const lerp = (start: number, end: number) => start + (end - start) * t
      for (const { digit, bones } of hand.fingers) {
        const ca = angles(a.curl?.[digit]), cb = angles(b.curl?.[digit])
        const spread = lerp(clamp(a.spread?.[digit] ?? 0, -.6, .6), clamp(b.spread?.[digit] ?? 0, -.6, .6))
        bones[0].quaternion.multiply(new Quaternion().setFromAxisAngle(z, spread * (side === 'L' ? 1 : -1)))
        if (digit === 'thumb') {
          const opposition = lerp(clamp(a.thumbOpposition ?? 0, 0, 1), clamp(b.thumbOpposition ?? 0, 0, 1))
          bones[0].quaternion.multiply(new Quaternion().setFromAxisAngle(y, opposition * (side === 'L' ? -.8 : .8)))
        }
        bones.forEach((bone, i) => bone.quaternion.multiply(new Quaternion().setFromAxisAngle(x, lerp(clamp(ca[i], 0, limits[i]), clamp(cb[i], 0, limits[i])))))
      }
      model.updateMatrixWorld(true)
    },
  }
}
