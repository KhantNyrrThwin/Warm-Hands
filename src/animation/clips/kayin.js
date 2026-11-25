/**
 * Animator: hand-written from signer pmt's 30 recorded takes (data/msl77/raw/pmt/kayin)
 * and the reference picture (build_clips.py leaves this file alone).
 * Sign id:  kayin
 * Myanmar:  ကရင်
 * English:  Kayin
 *
 * Right hand only; the left arm stays at rest (as in the recordings).
 * 1. Flat hand on the forehead: palm down onto the head, fingers pointing across
 *    toward the centre, elbow out to the side. Held about 1 s.
 * 2. The hand comes down beside the right shoulder: forearm upright (elbow straight
 *    below the wrist), closed hand with the index finger up and curled forward like a
 *    hook, thumb folded over the other fingers (not showing). The hand moves round in
 *    a horizontal circle, the index fingertip drawing the loop of the circular arrow
 *    (front of the loop moving to the viewer's right), 3 circles of 0.54 s, without
 *    twisting the hand; then it holds still.
 *
 * Values are the medians over the takes, scaled from the signer's arm length to the
 * character's. The character's head is large and its arms short, so for part 1 the
 * clip also lifts the right shoulder, bows the head a little into the hand and
 * lengthens the right arm while the hand is at the head (restored by reset()/idle()).
 * Not mirrored: poses are written for bone side L, the character's anatomical right hand.
 * Nothing outside this file changes.
 */
import { Bone, PropertyBinding, Quaternion, Vector3 } from 'three';
import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
export const KAYIN_DURATION = 5.4;
/** Part 1: flat hand, fingers together, about 20° of bend at the knuckles (recorded 21°/9°). */
const FLAT = {
    curl: { thumb: [.1, .1, .05], index: [.3, .12, .06], middle: [.33, .12, .06], ring: [.33, .12, .06], pinky: [.35, .12, .06] },
    spread: { thumb: .3, index: -.03, middle: 0, ring: .02, pinky: .05 },
    thumbOpposition: .1,
};
/**
 * Part 2: index finger up, curled forward like a hook (recorded total bend 108°); middle,
 * ring and little finger closed (recorded 162–177°); thumb folded over them.
 */
const HOOK_INDEX = {
    curl: { thumb: [.55, .45, .25], index: [.45, .9, .5], middle: [1.4, 1.5, .9], ring: [1.4, 1.5, .9], pinky: [1.4, 1.5, .9] },
    spread: { thumb: .2, index: 0, middle: 0, ring: 0, pinky: 0 },
    thumbOpposition: .9,
};
// Model space: +y up, +z toward the viewer; the right hand works on -x (centre of the body is +x).
// Shoulder (bone side L) at [-.6, 3.83, 0]; character arm length 1.39.
// Raw `palm` field is the normal of the BACK of the hand (minus the palm normal).
const pose = (wrist, direction, palm, handShape, elbow) => ({ wrist, direction, palm, gather: 0, handShape, elbow });
/** Elbow pole for part 1: out to the side and up. */
const OUT_HIGH = [-1.9, 4.6, .1];
/** Rising from rest, flat hand. */
const rising = pose([-1.05, 4.25, .75], [.5, .8, .1], [-.2, .3, .9], FLAT, [-1.6, 3.6, -.1]);
/** 1. Flat hand on the forehead: palm down onto the head, fingers across toward the centre. */
const forehead = pose([-.96, 5.6, .98], [.97, -.08, .24], [.01, -.08, 1], FLAT, OUT_HIGH);
/** 2. Hand beside the shoulder (recorded: wrist .22 out, .14 up, .5 forward arm lengths; elbow below). */
const HAND_AT = [-.91, 4.02, .69];
const HAND_DIR = [-.43, .88, .04]; // wrist → knuckles: up, tilted a little outward (recorded)
const HAND_ELBOW = [-1.05, 2.9, .45];
/** Back of the hand (minus the recorded median palm direction: toward the centre and the viewer). Kept fixed: no twisting. */
const HAND_BACK = [-.67, -.31, -.68];
const CIRCLE_TIME = .54; // seconds per circle (recorded)
const WRIST_RADIUS = .05; // the wrist draws a small circle (recorded about 0.066 shoulder widths)
const TILT = .18; // and the hand leans with it, so the index fingertip draws a wider one (recorded about 0.14 model units)
/** The hand at angle `a` round the circle; a = 0 is the front. The front of the loop moves toward +x (the viewer's right). */
function around(a, amount = 1) {
    const ox = Math.sin(a) * amount, oz = Math.cos(a) * amount;
    return pose([HAND_AT[0] + ox * WRIST_RADIUS, HAND_AT[1], HAND_AT[2] + oz * WRIST_RADIUS], [HAND_DIR[0] + ox * TILT, HAND_DIR[1], HAND_DIR[2] + oz * TILT], HAND_BACK, HOOK_INDEX, HAND_ELBOW);
}
const centred = around(0, 0);
/** On the way down from the forehead, beside the face, closing the hand. */
const descending = pose([-1.08, 4.65, .95], [-.1, .95, .3], [-.6, -.2, -.75], HOOK_INDEX, [-1.3, 3.5, .2]);
const lowering = pose([-1.2, 3.1, .45], [-.3, -.6, .3], [0, 0, -1], HOOK_INDEX, [-1.3, 2.8, -.1]);
const CIRCLES = 3, STEPS = 8; // keys per circle
const CIRCLE_START = 2.6;
const circling = Array.from({ length: CIRCLES * STEPS + 1 }, (_, k) => {
    const ease = Math.min(1, k / 2, (CIRCLES * STEPS - k) / 2); // grow into the circle and out of it
    return [CIRCLE_START + CIRCLE_TIME * k / STEPS, around(2 * Math.PI * k / STEPS, ease)];
});
const keys = [
    [0, REST_LEFT], [.15, REST_LEFT],
    [.55, rising],
    [1.0, forehead],
    [2.0, forehead], // 1. held on the forehead
    [2.3, descending],
    ...circling, // 2. index hand beside the shoulder, three circles
    [4.6, centred], // hold still
    [4.95, lowering],
    [5.25, REST_LEFT],
    [KAYIN_DURATION, REST_LEFT],
];
// `left` drives bone side L = the character's right arm; the left arm (bone side R) always rests.
const poses = keys.map(([time, arm]) => ({ time, left: arm, right: REST_RIGHT }));
const still = (time) => ({ time, shrug: 0, tilt: 0, nod: 0, stretch: 1 });
const body = [
    still(0), still(.15),
    { time: .55, shrug: .2, tilt: .05, nod: .08, stretch: 1.1 },
    { time: 1.0, shrug: .45, tilt: .12, nod: .3, stretch: 1.36 },
    { time: 2.0, shrug: .45, tilt: .12, nod: .3, stretch: 1.36 },
    { time: 2.6, shrug: .05, tilt: 0, nod: 0, stretch: 1.02 },
    still(2.85), still(KAYIN_DURATION),
];
const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
function bodyAt(seconds) {
    const i = body.findIndex((key) => key.time >= seconds);
    if (i <= 0)
        return body[0];
    const a = body[i - 1], b = body[i];
    const k = smoother((seconds - a.time) / (b.time - a.time));
    const mix = (field) => a[field] + (b[field] - a[field]) * k;
    return { time: seconds, shrug: mix('shrug'), tilt: mix('tilt'), nod: mix('nod'), stretch: mix('stretch') };
}
export function createKayinAnimation(model) {
    const bones = new Map();
    model.traverse((object) => { if (object instanceof Bone)
        bones.set(object.name, object); });
    const bone = (name) => {
        const found = bones.get(name) ?? bones.get(PropertyBinding.sanitizeNodeName(name));
        if (!found)
            throw new Error(`Missing kayin bone: ${name}`);
        return found;
    };
    const clavicle = bone('clavicle.L'), neck = bone('neck'), head = bone('head');
    const forearm = bone('forearm.L'), hand = bone('hand.L');
    const restForearm = forearm.position.clone(), restHand = hand.position.clone();
    const setStretch = (s) => {
        forearm.position.copy(restForearm).multiplyScalar(s);
        hand.position.copy(restHand).multiplyScalar(s);
    };
    const q = new Quaternion(), parent = new Quaternion(), world = new Quaternion();
    const X = new Vector3(1, 0, 0), Z = new Vector3(0, 0, 1);
    /** Rotate a bone about a model-space axis through its own origin. */
    const rotateWorld = (target, axis, angle) => {
        if (!target.parent || Math.abs(angle) < 1e-5)
            return;
        target.parent.getWorldQuaternion(parent);
        target.getWorldQuaternion(world);
        const turn = q.setFromAxisAngle(axis.clone().applyQuaternion(model.getWorldQuaternion(new Quaternion())), angle);
        target.quaternion.copy(parent.invert().multiply(turn.multiply(world)));
        target.updateWorldMatrix(false, true);
    };
    const clip = createSignAnimation(model, poses, KAYIN_DURATION, {
        continuous: true,
        // Before the arm is solved, so the hand still lands on its target.
        before: (seconds) => {
            const b = bodyAt(seconds);
            setStretch(b.stretch);
            rotateWorld(clavicle, Z, -b.shrug); // raise the right shoulder (its outer end is on -x)
            // +Z turns the top of the head toward -x, toward the right hand; +X nods the chin down.
            rotateWorld(neck, Z, b.tilt * .4);
            rotateWorld(neck, X, b.nod * .4);
            rotateWorld(head, Z, b.tilt * .6);
            rotateWorld(head, X, b.nod * .6);
        },
    });
    const restore = () => setStretch(1);
    return {
        duration: KAYIN_DURATION,
        apply: (seconds) => { restore(); clip.apply(seconds); },
        reset: () => { restore(); clip.reset(); },
        idle: () => { restore(); clip.idle(); },
    };
}
