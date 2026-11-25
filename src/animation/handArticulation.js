import { Bone, Object3D, PropertyBinding, Quaternion, Vector3 } from 'three';
const digits = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const limits = [Math.PI / 2, 1.65, 1.2];
const clamp = (x, min, max) => Math.max(min, Math.min(max, Number.isFinite(x) ? x : 0));
const angles = (curl) => typeof curl === 'number' ? [1.25, 1.45, .9].map((x) => x * clamp(curl, 0, 1)) : curl ?? [0, 0, 0];
export const HAND_SHAPES = {
    open: {},
    fist: { curl: { index: 1, middle: 1, ring: 1, pinky: 1, thumb: [.5, .48, .25] }, thumbOpposition: .75 },
    thumbsUp: { curl: { index: 1, middle: 1, ring: 1, pinky: 1 } },
    point: { curl: { middle: 1, ring: 1, pinky: 1, thumb: [.4, .4, .2] }, thumbOpposition: .6 },
};
/** Applies offsets AFTER the arm solver has restored its base pose. */
export function createHandArticulation(model) {
    const joints = ['R', 'L'].map((side) => ({
        side,
        fingers: digits.map((digit) => ({
            digit,
            bones: [1, 2, 3].map((joint) => {
                const name = `${digit}.0${joint}.${side}`;
                const bone = model.getObjectByName(name) ?? model.getObjectByName(PropertyBinding.sanitizeNodeName(name));
                if (!(bone instanceof Bone))
                    throw new Error(`Missing finger joint: ${name}`);
                return bone;
            }),
        })),
    }));
    const x = new Vector3(1, 0, 0), y = new Vector3(0, 1, 0), z = new Vector3(0, 0, 1);
    return {
        apply(side, a = {}, b = a, blend = 0) {
            const hand = joints.find((h) => h.side === side);
            const t = clamp(blend, 0, 1);
            const lerp = (start, end) => start + (end - start) * t;
            for (const { digit, bones } of hand.fingers) {
                const ca = angles(a.curl?.[digit]), cb = angles(b.curl?.[digit]);
                const spread = lerp(clamp(a.spread?.[digit] ?? 0, -.6, .6), clamp(b.spread?.[digit] ?? 0, -.6, .6));
                bones[0].quaternion.multiply(new Quaternion().setFromAxisAngle(z, spread * (side === 'L' ? 1 : -1)));
                if (digit === 'thumb') {
                    const opposition = lerp(clamp(a.thumbOpposition ?? 0, 0, 1), clamp(b.thumbOpposition ?? 0, 0, 1));
                    bones[0].quaternion.multiply(new Quaternion().setFromAxisAngle(y, opposition * (side === 'L' ? -.8 : .8)));
                }
                bones.forEach((bone, i) => bone.quaternion.multiply(new Quaternion().setFromAxisAngle(x, -lerp(clamp(ca[i], 0, limits[i]), clamp(cb[i], 0, limits[i])))));
            }
            model.updateMatrixWorld(true);
        },
    };
}
