import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { mirror } from './shared';
export const BIRTH_DURATION = 3.45;
/**
 * Fingers naturally curved and together; the thumb folded in at its base so it points inward,
 * toward the other hand (tip about 0.32 inward, a little forward and down from the wrist).
 */
const CURVED = {
    curl: { thumb: [1.4, .05, 0], index: [.3, .4, .25], middle: [.3, .42, .25], ring: [.32, .42, .25], pinky: [.35, .42, .25] },
    spread: { thumb: .3, index: -.04, middle: 0, ring: .03, pinky: .06 },
    thumbOpposition: 0,
};
// Model space: +y up, +z toward the viewer; this hand (the character's right) works on -x.
// Raw `palm` field is the normal of the BACK of the hand.
/** `tilt` (degrees) > 0 angles the fingers outward, < 0 inward; 0 = fingers straight down. */
const pose = (wrist, tilt = 0, elbow = [-1.1, 3.0, -.1]) => {
    const r = tilt * Math.PI / 180;
    return {
        wrist,
        direction: [-Math.sin(r), -Math.cos(r), .12], // vertical: fingers pointing at the ground
        palm: [-Math.cos(r), Math.sin(r), 0], // back of the hand outward, so the palm faces inward (toward the other hand)
        gather: 0,
        handShape: CURVED,
        elbow, // elbows at the sides
    };
};
/** Fingers angled a little outward; at this width the two thumb tips touch in the middle. */
const TILT = 10, WIDTH = -.307;
/** Start and end: the same hand position, only the height changes (thumbs touching throughout). */
const TOP = pose([WIDTH, 3.1, .6], TILT);
const BOTTOM = pose([WIDTH, 2.78, .6], TILT);
/** On the way up and down: already vertical, lower and nearer the side. */
const RISING = pose([-.75, 2.72, .38], 0, [-1.15, 3.05, -.2]);
const LOWERING = pose([-.85, 2.6, .38], 5, [-1.2, 3.0, -.2]);
const keys = [
    [0, REST_LEFT], [.1, REST_LEFT],
    [.35, RISING],
    [.6, TOP],
    [1.0, TOP], // held
    [1.9, BOTTOM], // both hands straight down together, thumbs touching
    [2.8, BOTTOM], // held
    [3.05, LOWERING],
    [3.3, REST_LEFT],
    [BIRTH_DURATION, REST_LEFT],
];
const poses = keys.map(([time, arm]) => ({ time, left: arm, right: arm === REST_LEFT ? REST_RIGHT : mirror(arm) }));
export function createBirthAnimation(model) {
    return createSignAnimation(model, poses, BIRTH_DURATION, { continuous: true });
}
