import { mirror } from './shared';
const flipX = (v) => [-v[0], v[1], v[2]];
/** The same arm pose on the other side of the body (x flipped); finger bends stay the same. */
export const mirrorArm = (a) => ({ ...a, w: flipX(a.w), d: flipX(a.d), p: flipX(a.p), e: flipX(a.e) });
/** Recorded keys with the sign mirrored: each hand's movement is made by the other hand. */
export const mirrorKeys = (keys) => keys.map(([time, right, left]) => [time, left ? mirrorArm(left) : 0, right ? mirrorArm(right) : 0]);
/** Demo-clip poses with the sign mirrored (rest poses map to the other rest pose). */
export const mirrorPoses = (poses) => poses.map((p) => ({ ...p, left: mirror(p.right), right: mirror(p.left) }));
