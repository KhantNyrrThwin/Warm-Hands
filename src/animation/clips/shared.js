import { Bone, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
/**
 * Shared authoring helpers for the clinic demo clips.
 *
 * Model space: +y up, +z toward the viewer, -x on the viewer's left.
 * Poses are authored like the book pages (dominant hand on the viewer's
 * left, the `left` arm) and then mirrored so the character signs with the
 * hand on the viewer's right.
 *
 * In this rig the `palm` vector is the normal of the BACK of the hand.
 * palm [0, 0, 1] shows the back of the hand to the viewer; [0, -1, 0] is a
 * palm-up hand. `arm()` negates the palm so callers can write the palm-side
 * normal they see in the book.
 */
export const L = REST_LEFT;
export const R = REST_RIGHT;
export const OPEN = {
    curl: { thumb: .06, index: .02, middle: .02, ring: .03, pinky: .04 },
    spread: { index: -.08, middle: 0, ring: .07, pinky: .14 },
    thumbOpposition: .1,
};
export const SPREAD = {
    curl: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
    spread: { index: -.22, middle: -.04, ring: .14, pinky: .32, thumb: -.3 },
};
export const POINT = { curl: { middle: 1, ring: 1, pinky: 1, thumb: [.45, .45, .2] }, thumbOpposition: .6 };
/** Index finger up, hooked at the middle and tip joints, other fingers closed. */
export const HOOK = {
    curl: { index: [.08, 1.35, .95], middle: 1, ring: 1, pinky: 1, thumb: [.45, .5, .25] },
    thumbOpposition: .7,
};
/** Fingertips gathered with the thumb, holding a little rice. */
export const BUNCH = {
    curl: {
        thumb: [.12, .18, .12],
        index: [.18, .28, .22],
        middle: [.18, .28, .22],
        ring: [.21, .28, .22],
        pinky: [.24, .28, .22],
    },
    spread: { index: -.05, ring: .04, pinky: .09 },
    thumbOpposition: .65,
};
/** Bunched fingers with the thumb pushed forward into the mouth. */
export const PUSH = {
    curl: {
        thumb: [.04, .06, 0],
        index: [.14, .22, .18],
        middle: [.14, .22, .18],
        ring: [.17, .22, .18],
        pinky: [.2, .22, .18],
    },
    spread: { index: -.05, ring: .04, pinky: .09 },
    thumbOpposition: .35,
};
/** Soft flat scoop shape for taking from the plate. */
export const SCOOP = {
    curl: {
        thumb: [.05, .05, 0],
        index: [.12, .18, .12],
        middle: [.12, .18, .12],
        ring: [.14, .18, .12],
        pinky: [.16, .18, .12],
    },
    spread: { index: .02, ring: -.02, pinky: -.04 },
    thumbOpposition: .4,
};
/** C-shaped grip around a cup of water. */
export const CUP = {
    curl: { thumb: [.2, .25, .1], index: [.55, .55, .3], middle: [.6, .55, .3], ring: [.65, .55, .3], pinky: [.7, .55, .3] },
    spread: { index: -.04, ring: .04, pinky: .08 },
    thumbOpposition: .8,
};
export const PILL = {
    curl: {
        thumb: [.35, .35, .2],
        index: [.15, .85, .05],
        middle: [.85, .9, .6],
        ring: [.85, .9, .6],
        pinky: [.85, .9, .6],
    },
    spread: { index: -.05, ring: .05, pinky: .1 },
    thumbOpposition: .7,
};
export const CLASP = {
    curl: { thumb: [.3, .3, .2], index: [.85, .8, .5], middle: [.85, .8, .5], ring: [.85, .8, .5], pinky: [.85, .8, .5] },
    spread: { index: -.15, middle: -.05, ring: .05, pinky: .15 },
    thumbOpposition: .4,
};
export const arm = (wrist, direction, palm, handShape, elbow) => ({
    wrist,
    direction,
    palm: [-palm[0], -palm[1], -palm[2]],
    gather: 0,
    handShape,
    ...(elbow ? { elbow } : {}),
});
/** Mirror a pose onto the other arm (rest poses map to the other rest pose). */
export const mirror = (pose) => pose === L ? R : pose === R ? L : ({
    ...pose,
    wrist: [-pose.wrist[0], pose.wrist[1], pose.wrist[2]],
    direction: [-pose.direction[0], pose.direction[1], pose.direction[2]],
    palm: [-pose.palm[0], pose.palm[1], pose.palm[2]],
    ...(pose.elbow ? { elbow: [-pose.elbow[0], pose.elbow[1], pose.elbow[2]] } : {}),
});
export const both = (time, left) => ({ time, left, right: mirror(left) });
export const one = (time, left, right = R) => ({ time, left, right });
export const rest = (time) => ({ time, left: L, right: R });
export const at = (pose, wrist) => ({ ...pose, wrist });
/** Backs of the hands out, then open outward to palms up. Shared by ဘယ်လို and ဘာဖြစ်လို့လဲ. */
export const flipIn = arm([-.42, 3.2, .7], [.15, .97, .12], [-.05, -.08, -.99], OPEN, [-1.3, 2.9, .1]);
export const flipOut = arm([-1.0, 3.0, .85], [-.8, .2, .55], [.05, .97, .2], OPEN, [-1.35, 2.75, .1]);
export const questionBody = (start, end, duration) => [
    { time: 0 }, { time: start - .4 },
    { time: start, nod: -.06, lean: .04, tilt: .06 },
    { time: end, nod: -.06, lean: .04, tilt: .06 },
    { time: duration },
];
const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
function sampleBody(keys, seconds) {
    const fields = ['turn', 'lean', 'headTurn', 'nod', 'tilt', 'shrug', 'mouth'];
    const i = keys.findIndex((key) => key.time >= seconds);
    const out = { turn: 0, lean: 0, headTurn: 0, nod: 0, tilt: 0, shrug: 0, mouth: 0 };
    if (i <= 0)
        return out;
    const a = keys[i - 1], b = keys[i];
    const k = smoother((seconds - a.time) / (b.time - a.time));
    for (const field of fields)
        out[field] = (a[field] ?? 0) + ((b[field] ?? 0) - (a[field] ?? 0)) * k;
    return out;
}
/** Name of the mouth-opening mesh added to the head (the model has no jaw bone or mouth shape). */
export const MOUTH_OPENING = 'mouthOpening';
/**
 * The character's mouth is a closed smile with no jaw bone, so an open mouth is
 * drawn as a dark, flattened ellipsoid set into the face over the lips and
 * attached to the head bone (it follows nods, tilts and turns). Its height
 * scales with how open the mouth is. Created once per model.
 */
function mouthOpening(model) {
    const head = model.getObjectByName('head');
    if (!head)
        return { set: () => { } };
    let mesh = head.getObjectByName(MOUTH_OPENING);
    if (!mesh) {
        // Built at the rest pose: centered on the lips, set back so only its front
        // pokes out of the face and follows the face's curve.
        mesh = new Mesh(new SphereGeometry(1, 24, 12), new MeshStandardMaterial({ color: 0x3b1616, roughness: 1 }));
        mesh.name = MOUTH_OPENING;
        mesh.scale.set(.15, .075, .1);
        model.updateMatrixWorld(true);
        mesh.position.copy(model.localToWorld(new Vector3(0, 4.79, .6)));
        head.attach(mesh);
        mesh.userData.height = mesh.scale.y;
        mesh.visible = false;
    }
    const target = mesh;
    return {
        set: (open) => {
            target.visible = open > .02;
            target.scale.y = target.userData.height * Math.max(open, .02);
        },
    };
}
/** Wrist position of one arm at `seconds`, eased between keys. */
function wristAt(poses, side, seconds) {
    const i = poses.findIndex((pose) => pose.time >= seconds);
    if (i <= 0)
        return poses[0][side].wrist;
    const a = poses[i - 1][side].wrist, b = poses[i][side].wrist;
    const k = smoother((seconds - poses[i - 1].time) / (poses[i].time - poses[i - 1].time));
    return a.map((value, axis) => value + (b[axis] - value) * k);
}
/**
 * Whole-body engagement, like a real signer: the shoulder rises with a raised
 * hand, the torso turns and leans a little toward the signing hand, and the
 * head follows. Applied before the arms are solved so hand contacts stay exact.
 * The optional body keys (turning to drink, bending over a sore stomach) are
 * applied afterwards, carrying the arms with the body.
 */
function createBody(model, poses, keys = []) {
    const bones = new Map();
    model.traverse((object) => { if (object instanceof Bone)
        bones.set(object.name, object); });
    const spine = bones.get('spine'), chest = bones.get('chest'), neck = bones.get('neck'), head = bones.get('head');
    // The loader strips dots from node names, so look up both spellings.
    const clavicles = { left: bones.get('clavicleL') ?? bones.get('clavicle.L'), right: bones.get('clavicleR') ?? bones.get('clavicle.R') };
    const q = new Quaternion(), parent = new Quaternion(), world = new Quaternion();
    const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);
    const rotate = (bone, x, y, z) => {
        if (!bone)
            return;
        bone.quaternion.multiply(q.setFromAxisAngle(Y, y)).multiply(q.setFromAxisAngle(X, x)).multiply(q.setFromAxisAngle(Z, z));
    };
    /** Rotate a bone about a model-space axis through its own origin. */
    const rotateWorld = (bone, axis, angle) => {
        if (!bone?.parent)
            return;
        bone.parent.getWorldQuaternion(parent);
        bone.getWorldQuaternion(world);
        const turn = q.setFromAxisAngle(axis.clone().applyQuaternion(model.getWorldQuaternion(new Quaternion())), angle);
        bone.quaternion.copy(parent.invert().multiply(turn.multiply(world)));
    };
    const activity = (wrist, restWrist) => smoother(clamp(Math.hypot(wrist[0] - restWrist[0], wrist[1] - restWrist[1], wrist[2] - restWrist[2]) / 1.1, 0, 1));
    const before = (seconds) => {
        const wr = wristAt(poses, 'right', seconds), wl = wristAt(poses, 'left', seconds);
        const ar = activity(wr, R.wrist), al = activity(wl, L.wrist);
        const active = Math.max(ar, al);
        const x = (wr[0] * ar + wl[0] * al) / (ar + al + 1e-6);
        const y = (wr[1] * ar + wl[1] * al) / (ar + al + 1e-6);
        const shrug = keys.length ? sampleBody(keys, seconds).shrug : 0;
        const shrugRight = wr[1] >= wl[1] ? shrug : 0, shrugLeft = wr[1] >= wl[1] ? 0 : shrug;
        // The automatic lift of a raised hand's shoulder never ran (the clavicle
        // lookup used dotted names the loader strips), and every clip was tuned
        // without it, so it stays off. Only an explicit `shrug` key lifts a shoulder.
        const AUTO_LIFT = 0;
        rotateWorld(clavicles.right, Z, AUTO_LIFT * smoother(clamp((wr[1] - 3.2) / 1.0, 0, 1)) + shrugRight);
        rotateWorld(clavicles.left, Z, -AUTO_LIFT * smoother(clamp((wl[1] - 3.2) / 1.0, 0, 1)) - shrugLeft);
        const across = clamp(x / .9, -1, 1);
        rotate(spine, .02 * active, .05 * active * across, 0);
        rotate(chest, .035 * active, .05 * active * across, -.02 * active * across);
        rotate(neck, .02 * active, .04 * active * across, 0);
        rotate(head, .05 * active * clamp((3.6 - y) / 1.0, -1, 1), .05 * active * across, .02 * active * across);
    };
    const mouth = mouthOpening(model);
    const after = (seconds) => {
        // Every frame of every clip sets the mouth, so it never stays open after a sign.
        if (!keys.length) {
            mouth.set(0);
            return;
        }
        const body = sampleBody(keys, seconds);
        mouth.set(body.mouth);
        rotate(spine, body.lean * .4, body.turn * .45, 0);
        rotate(chest, body.lean * .6, body.turn * .55, 0);
        rotate(neck, body.nod * .4, body.headTurn * .4, -body.tilt * .4);
        rotate(head, body.nod * .6, body.headTurn * .6, -body.tilt * .6);
    };
    return { before, after };
}
/** Move the book-style (left-handed on screen) poses onto the right hand. */
const toRightHand = (poses) => poses.map(({ time, left, right }) => ({ time, left: mirror(right), right: mirror(left) }));
/** Slide every non-rest wrist sideways (viewer's left is negative). */
const shiftX = (poses, dx) => poses.map(({ time, left, right }) => ({
    time,
    left: left === L ? L : at(left, [left.wrist[0] + dx, left.wrist[1], left.wrist[2]]),
    right: right === R ? R : at(right, [right.wrist[0] + dx, right.wrist[1], right.wrist[2]]),
}));
/** Flip body keys left/right (turns and tilts change sign). */
const mirrorBody = (keys) => keys.map((key) => ({
    ...key,
    ...(key.turn !== undefined ? { turn: -key.turn } : {}),
    ...(key.headTurn !== undefined ? { headTurn: -key.headTurn } : {}),
    ...(key.tilt !== undefined ? { tilt: -key.tilt } : {}),
}));
/**
 * Build one demo clip: mirror onto the right hand, then add body engagement.
 * `hand: 'left'` keeps the book-frame poses on the character's left hand
 * instead (the whole sign, both arms and body keys, mirrored).
 */
export function createDemoClip(model, authored, duration, keys = [], dx = 0, hand = 'right') {
    const left = hand === 'left';
    const poses = shiftX(left ? authored : toRightHand(authored), left ? -dx : dx);
    const body = createBody(model, poses, left ? mirrorBody(keys) : keys);
    return createSignAnimation(model, poses, duration, { continuous: true, ...body });
}
