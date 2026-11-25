/**
 * Mirror a whole sign left ↔ right, at the clip level (the shared playback is unchanged).
 *
 * The shared playback (createDemoClip, createRecordedClip) shows a clip's signer's-right hand on
 * the character's left hand. Passing a clip's keys through here once mirrors the sign, so it
 * plays on the character's right hand instead; in a two-handed sign the hands swap. Only the
 * sign is reflected (positions, finger and palm directions, elbows across the body's centre);
 * handshapes and timing stay exactly the same. A head lean follows its hand to the other side.
 */
import type { SignPose } from '../armPlayback'
import type { RecordedArm, RecordedKey } from './recorded'
import { mirror } from './shared'

const flipX = (v: number[]) => [-v[0], v[1], v[2]]

/** The same arm pose on the other side of the body (x flipped); finger bends stay the same. */
export const mirrorArm = (a: RecordedArm): RecordedArm => ({ ...a, w: flipX(a.w), d: flipX(a.d), p: flipX(a.p), e: flipX(a.e) })

/** Recorded keys with the sign mirrored: each hand's movement is made by the other hand. */
export const mirrorKeys = (keys: RecordedKey[]): RecordedKey[] =>
  keys.map(([time, right, left]) => [time, left ? mirrorArm(left) : 0, right ? mirrorArm(right) : 0])

/** Demo-clip poses with the sign mirrored (rest poses map to the other rest pose). */
export const mirrorPoses = (poses: SignPose[]): SignPose[] =>
  poses.map((p) => ({ ...p, left: mirror(p.right), right: mirror(p.left) }))
