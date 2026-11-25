import { EAT_ONCE_SPAN, eatOnce, eatOnceBody } from './eat';
import { arm, createDemoClip, one, rest } from './shared';
/**
 * မနက်စာ / breakfast : "morning" then "eat" (once).
 * 1. The forearm stands up beside the head. The curled fingers flick open:
 *    index and middle finger spring up, thumb sticks out toward the face.
 * 2. One eat stroke (scoop from the plate, push into the mouth), as in eat.ts.
 * Signed with the LEFT hand, like eat.
 */
const EAT_START = 1.6;
export const BREAKFAST_DURATION = EAT_START + EAT_ONCE_SPAN + .7;
/** Fingers curled into the palm, thumb out to the side. */
const CURLED = {
    curl: { thumb: [.05, .08, .04], index: [1.2, 1.1, .6], middle: [1.2, 1.1, .6], ring: [1.25, 1.1, .6], pinky: [1.3, 1.1, .6] },
    spread: { index: -.02, ring: .02, pinky: .04 },
    thumbOpposition: 0,
};
/** Index and middle finger flicked up straight, thumb out, ring and pinky curled. */
const FLICKED = {
    curl: { thumb: [.05, .08, .04], index: 0, middle: 0, ring: [1.25, 1.1, .6], pinky: [1.3, 1.1, .6] },
    spread: { index: -.03, middle: .03 },
    thumbOpposition: 0,
};
const MORNING_CURLED = arm([-1.12, 4.55, .45], [.05, .99, .1], [.75, 0, .66], CURLED, [-1.55, 3.55, .1]);
const MORNING_OPEN = arm([-1.12, 4.6, .45], [.05, .99, .1], [.75, 0, .66], FLICKED, [-1.55, 3.55, .1]);
const breakfast = [
    rest(0), rest(.15),
    one(.6, MORNING_CURLED),
    one(.8, MORNING_CURLED),
    one(1.0, MORNING_OPEN),
    one(1.25, MORNING_OPEN),
    ...eatOnce(EAT_START),
    rest(BREAKFAST_DURATION),
];
export function createBreakfastAnimation(model) {
    return createDemoClip(model, breakfast, BREAKFAST_DURATION, eatOnceBody(EAT_START, BREAKFAST_DURATION), 0, 'left');
}
