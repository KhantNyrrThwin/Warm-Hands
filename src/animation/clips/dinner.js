import { EAT_ONCE_SPAN, eatOnce, eatOnceBody } from './eat';
import { arm, createDemoClip, one, OPEN, rest } from './shared';
/**
 * ညစာ / dinner : "night" then "eat" (once).
 * 1. An open hand raised beside the head, palm forward, closes its fingers
 *    down onto the thumb (the light going out).
 * 2. One eat stroke (scoop from the plate, push into the mouth), as in eat.ts.
 * Signed with the LEFT hand, like eat.
 */
const EAT_START = 1.75;
export const DINNER_DURATION = EAT_START + EAT_ONCE_SPAN + .7;
/** Fingers bent flat at the knuckles, tips resting on the thumb. */
const CLOSED = {
    curl: {
        thumb: [.25, .2, .1],
        index: [1.15, .35, .15],
        middle: [1.15, .35, .15],
        ring: [1.15, .35, .15],
        pinky: [1.15, .35, .15],
    },
    spread: { index: -.03, ring: .03, pinky: .06 },
    thumbOpposition: .85,
};
const NIGHT_OPEN = arm([-.95, 4.25, .45], [.12, .98, .1], [.05, 0, 1], OPEN, [-1.6, 3.4, .0]);
const NIGHT_CLOSED = arm([-.95, 4.22, .45], [.12, .98, .1], [.05, 0, 1], CLOSED, [-1.6, 3.4, .0]);
const dinner = [
    rest(0), rest(.15),
    one(.65, NIGHT_OPEN),
    one(.85, NIGHT_OPEN),
    one(1.15, NIGHT_CLOSED),
    one(1.35, NIGHT_CLOSED),
    ...eatOnce(EAT_START),
    rest(DINNER_DURATION),
];
export function createDinnerAnimation(model) {
    return createDemoClip(model, dinner, DINNER_DURATION, eatOnceBody(EAT_START, DINNER_DURATION), 0, 'left');
}
