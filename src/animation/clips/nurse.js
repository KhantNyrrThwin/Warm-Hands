import { arm, createDemoClip, one, rest } from './shared';
/**
 * သူနာပြု / nurse : the arm goes up over the head and the flat hand lies on
 * the forehead, fingers pointing across it, thumb sticking up (like a nurse's
 * cap). Signed with the LEFT hand, like the book picture.
 *
 * The character's head is much bigger than a real head, so the arm cannot
 * reach the forehead by itself: the head bows forward to meet the hand.
 */
export const NURSE_DURATION = 2.6;
/** Like a thumbs up, but the four fingers stay straight and together. */
const FLAT_THUMB_UP = {
    curl: { thumb: [0, 0, 0], index: 0, middle: 0, ring: 0, pinky: 0 },
    spread: { index: .02, middle: 0, ring: -.02, pinky: -.04, thumb: -.45 },
    thumbOpposition: 0,
};
/** Elbow up and out beside the head, hand laid across the forehead. */
const CAP = arm([-1.0, 5.1, .45], [.72, .62, .3], [.25, -.3, -.92], FLAT_THUMB_UP, [-1.8, 4.7, -.1]);
const CAP_IN = arm([-1.15, 4.75, .4], [.6, .75, .2], [.2, -.3, -.93], FLAT_THUMB_UP, [-1.75, 4.5, -.1]);
const nurse = [
    rest(0), rest(.15),
    one(.65, CAP_IN),
    one(.95, CAP),
    one(1.75, CAP),
    rest(NURSE_DURATION),
];
const NURSE_BODY = [
    { time: 0 }, { time: .55 },
    { time: .95, nod: .12, tilt: -.08 },
    { time: 1.75, nod: .12, tilt: -.08 },
    { time: NURSE_DURATION },
];
export function createNurseAnimation(model) {
    return createDemoClip(model, nurse, NURSE_DURATION, NURSE_BODY, 0, 'left');
}
