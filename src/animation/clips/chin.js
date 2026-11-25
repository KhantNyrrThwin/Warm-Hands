/**
 * Animator: hand-written from signer pmt's 30 recorded takes (data/msl77/raw/pmt/chin)
 * and the reference picture (build_clips.py leaves this file alone).
 * Sign id:  chin
 * Myanmar:  ချင်း
 * English:  Chin
 *
 * Right hand only; the left arm stays at rest (as in the recordings).
 * A tight fist, thumb wrapped across the front of the curled fingers, is pressed with
 * the back of the hand against the top of the forehead, the knuckles near the middle
 * of the face; the curled fingers face the viewer; the elbow is raised out to the side.
 * It rises quickly, holds still, then lowers (the recordings show no tapping).
 *
 * Values are the medians over the takes (fist direction, palm direction, hand shape,
 * contact point on the face). The head does not move: the hand goes to the head. The
 * character's head is large and its arms short, so while the fist is at the head the
 * clip lifts the right shoulder and brings it forward, and lengthens the right arm, so the
 * arm comes up in front of the face instead of through it (restored by reset()/idle()).
 * Not mirrored: poses are written for bone side L, the character's anatomical right hand.
 * Nothing outside this file changes.
 */
import { Bone, PropertyBinding, Quaternion, Vector3 } from 'three';
import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
export const CHIN_DURATION = 3.9;
/** Tight fist (recorded total bend 184°), thumb wrapped across the front of the fingers. */
const FIST = {
    curl: { thumb: [.6, .5, .3], index: [1.5, 1.6, 1.0], middle: [1.55, 1.6, 1.0], ring: [1.55, 1.6, 1.0], pinky: [1.55, 1.6, 1.0] },
    spread: { thumb: .3, index: 0, middle: 0, ring: 0, pinky: 0 },
    thumbOpposition: 1,
};
// Model space: +y up, +z toward the viewer; the right hand works on -x (centre of the body is +x).
// Raw `palm` field is the normal of the BACK of the hand (minus the palm normal).
const pose = (wrist, direction, palm, handShape, elbow) => ({ wrist, direction, palm, gather: 0, handShape, elbow });
/** Rising from rest, closing the fist. */
const rising = pose([-1.05, 4.3, .8], [.5, .8, .1], [-.2, .1, -.95], FIST, [-1.6, 3.7, -.1]);
/*
 * On the forehead. The arm path was searched on the real meshes (tools/avatar/_armsearch.mjs):
 * with the shoulder lifted .2 and brought forward .75, and the arm 1.4× as long, the elbow sits
 * in front of the face and the whole arm (with its thickness) clears the face and hair.
 * The playback solves the arm with its normal bone lengths and aims the forearm from the
 * (lengthened) elbow at the wrist target, so it is given the point that makes the elbow land
 * on HOLD_ELBOW and the forearm point at HOLD_WRIST; once lengthened, the hand lands there.
 */
const HOLD_SHOULDER = [-.447, 3.933, .342];
const HOLD_STRETCH = 1.4;
/** Wrist so the back of the fist rests on the forehead, knuckles just right of the middle (recorded). */
const HOLD_WRIST = [-.4, 5.65, .7];
const HOLD_ELBOW = [-.53, 4.77, .93];
const UPPER_ARM = .7335, FOREARM = .6552; // rest bone lengths of the character's arm
function playbackWrist() {
    const S = HOLD_SHOULDER, E = HOLD_ELBOW, W = HOLD_WRIST;
    // elbow as the playback solves it (before lengthening): HOLD_ELBOW pulled back toward the shoulder
    const solved = S.map((v, i) => v + (E[i] - v) / HOLD_STRETCH);
    // the target lies on the line from HOLD_ELBOW toward HOLD_WRIST, one rest forearm length from `solved`
    const d = W.map((v, i) => v - E[i]), n = Math.hypot(...d), u = d.map((v) => v / n);
    const r = E.map((v, i) => v - solved[i]);
    const b = u.reduce((a, v, i) => a + v * r[i], 0), c = r.reduce((a, v) => a + v * v, 0) - FOREARM ** 2;
    const t = -b + Math.sqrt(b * b - c);
    return E.map((v, i) => v + t * u[i]);
}
void UPPER_ARM; // HOLD_ELBOW is UPPER_ARM × HOLD_STRETCH from HOLD_SHOULDER, HOLD_WRIST FOREARM × HOLD_STRETCH from HOLD_ELBOW
/** Recorded: wrist → knuckles (.92, .3, -.18), inward and a little up; palm toward the viewer (.21, -.02, .97). */
const forehead = pose(playbackWrist(), [.92, .3, -.18], [-.21, .02, -.97], FIST, HOLD_ELBOW);
/** Leaving the forehead: forward and out, away from the face, before going down. */
const away = pose([-.8, 5.0, 1.25], [.5, .7, .2], [-.21, .02, -.97], FIST, [-1.2, 4.3, 1.1]);
const lowering = pose([-1.2, 3.4, .55], [-.2, -.7, .3], [0, 0, -1], FIST, [-1.4, 3.0, -.1]);
const keys = [
    [0, REST_LEFT], [.15, REST_LEFT],
    [.55, rising],
    [1.0, forehead],
    [2.6, forehead], // held still on the forehead
    [2.95, away],
    [3.35, lowering],
    [3.7, REST_LEFT],
    [CHIN_DURATION, REST_LEFT],
];
// `left` drives bone side L = the character's right arm; the left arm (bone side R) always rests.
const poses = keys.map(([time, arm]) => ({ time, left: arm, right: REST_RIGHT }));
const still = (time) => ({ time, shrug: 0, forward: 0, tilt: 0, nod: 0, stretch: 1 });
const body = [
    still(0), still(.15),
    { time: .55, shrug: .1, forward: .38, tilt: 0, nod: 0, stretch: 1.15 },
    { time: 1.0, shrug: .2, forward: .75, tilt: 0, nod: 0, stretch: HOLD_STRETCH },
    { time: 2.6, shrug: .2, forward: .75, tilt: 0, nod: 0, stretch: HOLD_STRETCH },
    { time: 2.95, shrug: .12, forward: .45, tilt: 0, nod: 0, stretch: 1.2 },
    { time: 3.35, shrug: .03, forward: .08, tilt: 0, nod: 0, stretch: 1.03 },
    still(3.65), still(CHIN_DURATION),
];
const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
function bodyAt(seconds) {
    const i = body.findIndex((key) => key.time >= seconds);
    if (i <= 0)
        return body[0];
    const a = body[i - 1], b = body[i];
    const k = smoother((seconds - a.time) / (b.time - a.time));
    const mix = (field) => a[field] + (b[field] - a[field]) * k;
    return { time: seconds, shrug: mix('shrug'), forward: mix('forward'), tilt: mix('tilt'), nod: mix('nod'), stretch: mix('stretch') };
}
export function createChinAnimation(model) {
    const bones = new Map();
    model.traverse((object) => { if (object instanceof Bone)
        bones.set(object.name, object); });
    const bone = (name) => {
        const found = bones.get(name) ?? bones.get(PropertyBinding.sanitizeNodeName(name));
        if (!found)
            throw new Error(`Missing chin bone: ${name}`);
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
    const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);
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
    const clip = createSignAnimation(model, poses, CHIN_DURATION, {
        continuous: true,
        // Before the arm is solved, so the hand still lands on its target.
        before: (seconds) => {
            const b = bodyAt(seconds);
            setStretch(b.stretch);
            rotateWorld(clavicle, Z, -b.shrug); // raise the right shoulder (its outer end is on -x)
            rotateWorld(clavicle, Y, b.forward); // and bring it forward, so the arm comes up in front of the face
            // +Z turns the top of the head toward -x, toward the right hand; +X nods the chin down.
            rotateWorld(neck, Z, b.tilt * .4);
            rotateWorld(neck, X, b.nod * .4);
            rotateWorld(head, Z, b.tilt * .6);
            rotateWorld(head, X, b.nod * .6);
        },
    });
    const restore = () => setStretch(1);
    return {
        duration: CHIN_DURATION,
        apply: (seconds) => { restore(); clip.apply(seconds); },
        reset: () => { restore(); clip.reset(); },
        idle: () => { restore(); clip.idle(); },
    };
}
