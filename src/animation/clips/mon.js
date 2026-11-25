/**
 * Animator: hand-written from signer pmt's 30 recorded takes (data/msl77/raw/pmt/mon)
 * (build_clips.py leaves this file alone). Plan: Documentations/mon-sign-plan.md.
 * Sign id:  mon
 * Myanmar:  မွန်
 * English:  Mon
 *
 * Right hand only; the left arm stays at rest.
 * As recorded, the hand rises up the outside and rests on the head, gently cupped (knuckles
 * ~33°, finger joints ~17°), fingers together pointing across to the left, the palm on the head,
 * fingertips and thumb touching; held still, then back down.
 * The character's head top is ~2.8 above its shoulder and its arm 1.39 long, so the hand rests
 * on the centre of the forehead, below the front of the hair so that it stays in view (the
 * middle knuckle just right of the centre). The head bows a little toward the hand, the right shoulder lifts and comes
 * forward a little, and the right arm is up to HOLD_STRETCH× as long while the hand is up
 * (normal at rest); the clip solves the longer arm itself on every frame. With the longer arm the elbow is raised out to the side, as pmt's is. Not mirrored: poses are for bone side L, the
 * character's anatomical right hand. Everything is restored by reset()/idle(); nothing outside
 * this file changes.
 * While the hand is up, the whole character (feet to head) turns about 20° to its own left, as if
 * standing on a turntable, so the raised arm and the hand on the forehead are seen a little from the
 * side; it turns back to the front as the hand comes down.
 */
import { Bone, PropertyBinding, Quaternion, Vector3 } from 'three';
import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
export const MON_DURATION = 3.6;
/**
 * pmt's gently cupped hand: knuckles ~33°, finger joints ~17°. The thumb lies along the top of the
 * index finger, pointing across with the fingers, so it is in view below the hair (it would otherwise
 * be folded under the palm or hidden in the hair fringe).
 */
const CUPPED = {
    curl: { thumb: [.1, .1, .05], index: [.58, .16, .1], middle: [.56, .2, .12], ring: [.58, .18, .1], pinky: [.73, .17, .1] },
    spread: { thumb: -.6, index: -.03, middle: 0, ring: .02, pinky: .05 },
    thumbOpposition: 0,
};
// Model space: +y up, +z toward the viewer; the right hand works on -x (centre of the body is +x).
// Raw `palm` field is the normal of the BACK of the hand.
const pose = (wrist, direction, palm, elbow) => ({ wrist, direction, palm, gather: 0, handShape: CUPPED, elbow });
const HOLD_STRETCH = 1.5;
/**
 * On the centre of the forehead (head bowed), low enough that the top edge and thumb are below the hair:
 * fingers across to the left, palm on the forehead. With the arm 1.5x the elbow is raised out to the side,
 * like pmt's (a shorter arm can only reach by coming up in front of the face).
 */
const onHead = pose([-.45, 5.43, 1.075], [.99, -.03, .11], [0, .1, .99], [-1.3, 4.95, .5]);
/** Up the outside, as recorded, then in toward the face. */
const outside = pose([-1.45, 3.9, .5], [-.2, .9, .35], [-.6, -.3, -.75], [-1.9, 3.1, -.1]);
const approach = pose([-.95, 4.9, 1.05], [.6, .75, .2], [-.3, .3, .9], [-1.2, 4.2, .9]);
const keys = [
    [0, REST_LEFT], [.15, REST_LEFT],
    [.5, outside],
    [.75, approach],
    [.95, onHead],
    [2.6, onHead], // held still on the forehead
    [2.85, approach],
    [3.1, outside],
    [3.4, REST_LEFT],
    [MON_DURATION, REST_LEFT],
];
// `left` drives bone side L = the character's right arm; the left arm (bone side R) always rests.
const poses = keys.map(([time, arm]) => ({ time, left: arm, right: REST_RIGHT }));
/** The head bow while the hand is on the forehead; the body turn follows the same timing. */
const BOW = .26;
const still = (time) => ({ time, shrug: 0, forward: 0, nod: 0, stretch: 1 });
const body = [
    still(0), still(.15),
    { time: .5, shrug: .1, forward: .2, nod: .06, stretch: 1.12 },
    { time: .75, shrug: .25, forward: .55, nod: .18, stretch: 1.28 },
    { time: .95, shrug: .25, forward: .75, nod: .26, stretch: HOLD_STRETCH },
    { time: 2.6, shrug: .25, forward: .75, nod: .26, stretch: HOLD_STRETCH },
    { time: 2.85, shrug: .25, forward: .55, nod: .18, stretch: 1.28 },
    { time: 3.1, shrug: .1, forward: .2, nod: .06, stretch: 1.12 },
    still(3.4), still(MON_DURATION),
];
const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
function bodyAt(seconds) {
    const i = body.findIndex((key) => key.time >= seconds);
    if (i <= 0)
        return body[0];
    const a = body[i - 1], b = body[i];
    const k = smoother((seconds - a.time) / (b.time - a.time));
    const mix = (field) => a[field] + (b[field] - a[field]) * k;
    return { time: seconds, shrug: mix('shrug'), forward: mix('forward'), nod: mix('nod'), stretch: mix('stretch') };
}
/** Wrist target and elbow pole of the right arm at `seconds`, interpolated like the playback does. */
function pathAt(seconds) {
    const right = Math.max(1, poses.findIndex((p) => p.time >= seconds));
    const a = poses[right - 1], b = poses[right];
    const t = Math.min(1, Math.max(0, (seconds - a.time) / (b.time - a.time))), span = b.time - a.time;
    const tangent = (index, axis) => {
        if (index <= 0 || index >= poses.length - 1)
            return 0;
        const before = (poses[index].left.wrist[axis] - poses[index - 1].left.wrist[axis]) / (poses[index].time - poses[index - 1].time);
        const after = (poses[index + 1].left.wrist[axis] - poses[index].left.wrist[axis]) / (poses[index + 1].time - poses[index].time);
        return before * after <= 0 ? 0 : 2 * before * after / (before + after);
    };
    const wrist = new Vector3(...[0, 1, 2].map((axis) => (2 * t ** 3 - 3 * t ** 2 + 1) * a.left.wrist[axis] + (t ** 3 - 2 * t ** 2 + t) * span * tangent(right - 1, axis)
        + (-2 * t ** 3 + 3 * t ** 2) * b.left.wrist[axis] + (t ** 3 - t ** 2) * span * tangent(right, axis)));
    const fallback = [-1.15, 3.05, .04]; // the playback's default pole when a key has none
    const pole = new Vector3(...(a.left.elbow ?? fallback)).lerp(new Vector3(...(b.left.elbow ?? a.left.elbow ?? fallback)), t);
    return { wrist, pole };
}
export function createMonAnimation(model) {
    const bones = new Map();
    model.traverse((object) => { if (object instanceof Bone)
        bones.set(object.name, object); });
    const bone = (name) => {
        const found = bones.get(name) ?? bones.get(PropertyBinding.sanitizeNodeName(name));
        if (!found)
            throw new Error(`Missing mon bone: ${name}`);
        return found;
    };
    const clavicle = bone('clavicle.L'), neck = bone('neck'), head = bone('head');
    const upper = bone('upper_arm.L'), forearm = bone('forearm.L'), hand = bone('hand.L');
    const otherHand = bone('hand.R');
    const restForearm = forearm.position.clone(), restHand = hand.position.clone();
    const setStretch = (k) => {
        forearm.position.copy(restForearm).multiplyScalar(k);
        hand.position.copy(restHand).multiplyScalar(k);
    };
    const local = (b) => model.worldToLocal(b.getWorldPosition(new Vector3()));
    model.updateMatrixWorld(true);
    const upperLength = local(upper).distanceTo(local(forearm)), foreLength = local(forearm).distanceTo(local(hand));
    const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);
    /** Rotate a bone about a model-space axis through its own origin. */
    const rotateWorld = (target, axis, angle) => {
        if (!target.parent || Math.abs(angle) < 1e-5)
            return;
        const parent = target.parent.getWorldQuaternion(new Quaternion()).invert();
        const turn = new Quaternion().setFromAxisAngle(axis.clone().applyQuaternion(model.getWorldQuaternion(new Quaternion())), angle);
        target.quaternion.copy(parent.multiply(turn.multiply(target.getWorldQuaternion(new Quaternion()))));
        target.updateWorldMatrix(false, true);
    };
    const setWorldRotation = (target, rotation) => {
        target.quaternion.copy(target.parent.getWorldQuaternion(new Quaternion()).invert().multiply(rotation));
        target.updateWorldMatrix(false, true);
    };
    /** Turn `target` so that `child` points at `point` (model space). */
    const aim = (target, child, point) => {
        const origin = target.getWorldPosition(new Vector3());
        const from = child.getWorldPosition(new Vector3()).sub(origin).normalize();
        const to = model.localToWorld(point.clone()).sub(origin).normalize();
        setWorldRotation(target, new Quaternion().setFromUnitVectors(from, to).multiply(target.getWorldQuaternion(new Quaternion())));
    };
    const clip = createSignAnimation(model, poses, MON_DURATION, {
        continuous: true,
        before: (seconds) => {
            const b = bodyAt(seconds);
            setStretch(b.stretch);
            rotateWorld(clavicle, Z, -b.shrug); // lift the right shoulder (its outer end is on -x)
            rotateWorld(clavicle, Y, b.forward); // and bring it forward, so the arm passes in front of the face
            rotateWorld(neck, X, b.nod * .4); // a small bow toward the hand (+X nods the chin down)
            rotateWorld(head, X, b.nod * .6);
        },
        // While the arm is longer than the playback assumes, solve it again at its real length.
        after: (seconds) => {
            // The playback orients the hands using the model's facing from when the clip was made; while
            // the character is turned, turn both hands by the same amount so they keep their pose.
            if (Math.abs(turned) > 1e-6) {
                const up = new Vector3(0, 1, 0).applyQuaternion(model.getWorldQuaternion(new Quaternion()));
                const turn = new Quaternion().setFromAxisAngle(up, turned);
                for (const h of [hand, otherHand])
                    setWorldRotation(h, turn.clone().multiply(h.getWorldQuaternion(new Quaternion())));
            }
            const k = bodyAt(seconds).stretch;
            if (Math.abs(k - 1) < 1e-4)
                return;
            const { wrist, pole } = pathAt(seconds);
            const S = local(upper), a = upperLength * k, b = foreLength * k;
            const axis = wrist.clone().sub(S);
            const d = Math.min(axis.length(), (a + b) * .999);
            axis.normalize();
            const along = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - along * along));
            const bend = pole.clone().sub(S);
            bend.addScaledVector(axis, -bend.dot(axis)).normalize();
            const handRotation = hand.getWorldQuaternion(new Quaternion());
            aim(upper, forearm, S.clone().addScaledVector(axis, along).addScaledVector(bend, h));
            aim(forearm, hand, S.clone().addScaledVector(axis, d));
            setWorldRotation(hand, handRotation); // keep the hand's orientation (the fingers follow)
        },
    });
    // A small turn of the whole character to its own left while the hand is up, so the raised right
    // arm and the hand on the forehead are seen a little from the side. The whole model turns, so the
    // hand stays on the forehead; the turn is undone exactly by restore().
    const TURN = 20 * Math.PI / 180;
    let turned = 0;
    const setTurn = (angle) => {
        if (Math.abs(angle - turned) < 1e-6)
            return;
        model.rotateY(angle - turned); // +Y turns the face toward the viewer's right (the character's left)
        turned = angle;
        model.updateMatrixWorld(true);
    };
    const restore = () => { setStretch(1); setTurn(0); };
    return {
        duration: MON_DURATION,
        apply: (seconds) => { restore(); setTurn(TURN * bodyAt(seconds).nod / BOW); clip.apply(seconds); },
        reset: () => { restore(); clip.reset(); },
        idle: () => { restore(); clip.idle(); },
    };
}
