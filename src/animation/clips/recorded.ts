import type { Object3D } from 'three'
import type { ArmPose, SignAnimation, SignPose } from '../armPlayback'
import type { Digit, HandShape } from '../handArticulation'
import { createDemoClip, L, R, rest, type BodyKey } from './shared'

/**
 * Runtime for clips generated from the recorded MSL samples
 * (tools/avatar/build_clips.py). Keys are authored in the camera view of the
 * recording: the signer's right hand is the `left` arm (viewer's left).
 *
 * Like the hand-authored demo clips, createDemoClip() mirrors them so the
 * character signs with the hand on the viewer's right. This constant records
 * that fact for the build tools (tools/avatar/fix_contacts.mjs).
 */
export const MIRROR_RECORDED = true

type Fingers<T> = Record<Digit, T>

/** One arm at one moment, in model space (see armPlayback.ts). */
export type RecordedArm = {
  /** wrist position */
  w: number[]
  /** raw `direction` (finger axis) */
  d: number[]
  /** raw `palm` field of armPlayback (not the palm normal itself) */
  p: number[]
  /** elbow pole */
  e: number[]
  /** joint bends in radians: [base, middle, tip] */
  c: Fingers<number[]>
  /** sideways spread at the finger base, radians */
  s: Fingers<number>
  /** thumb opposition 0..1 */
  o: number
  /** head lean toward this hand [sideways tilt, nod], radians, for signs at the head */
  h?: number[]
}

/** [time, signer's right hand, signer's left hand]; 0 = that arm rests. */
export type RecordedKey = [number, RecordedArm | 0, RecordedArm | 0]

const shape = (a: RecordedArm): HandShape => ({
  curl: Object.fromEntries(Object.entries(a.c).map(([k, v]) => [k, [v[0], v[1], v[2]] as const])),
  spread: a.s,
  thumbOpposition: a.o,
})

const pose = (a: RecordedArm): ArmPose => ({
  wrist: a.w, direction: a.d, palm: a.p, gather: 0, elbow: a.e, handShape: shape(a),
})

/** BodyKey.tilt > 0 tilts the head toward +x (the viewer's right). */
const TILT_TOWARD_PLUS_X = 1

/** Head keys: lean toward whichever hand needs to reach the head. */
function headKeys(keys: RecordedKey[], duration: number): BodyKey[] {
  // In the authored (camera) view the signer's right hand is on -x; mirroring moves it to +x.
  const sideOfRight = MIRROR_RECORDED ? 1 : -1
  const body: BodyKey[] = [{ time: 0 }, { time: 0.15 }]
  for (const [time, right, left] of keys) {
    const r = right && right.h ? right.h : [0, 0]
    const l = left && left.h ? left.h : [0, 0]
    const tilt = (r[0] * sideOfRight - l[0] * sideOfRight) * TILT_TOWARD_PLUS_X
    body.push({ time, tilt, nod: Math.max(r[1], l[1]) })
  }
  body.push({ time: duration })
  return body
}

export function createRecordedClip(model: Object3D, keys: RecordedKey[], duration: number): SignAnimation {
  const poses: SignPose[] = [
    rest(0), rest(0.15),
    ...keys.map(([time, right, left]) => ({ time, left: right ? pose(right) : L, right: left ? pose(left) : R })),
    rest(duration),
  ]
  const leans = keys.some(([, right, left]) => (right && right.h) || (left && left.h))
  return createDemoClip(model, poses, duration, leans ? headKeys(keys, duration) : [])
}
