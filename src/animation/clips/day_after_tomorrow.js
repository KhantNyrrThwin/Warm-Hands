import { arm, createDemoClip, one, rest } from './shared';
import { FLAT } from './shapes';
import { NEAR_CHEEK } from './tomorrow';
/**
 * သန်ဘက်ခါ / the day after tomorrow : like tomorrow, the flat hand starts
 * beside the cheek, but it arcs further, out past the shoulder, ending
 * tipped back. Signed with the LEFT hand, like the book picture.
 */
export const DAY_AFTER_TOMORROW_DURATION = 2.7;
const ARC = arm([-1.25, 4.8, .55], [.4, .9, 0], [0, -.2, .98], FLAT, [-1.7, 3.8, .2]);
const ARC_2 = arm([-1.42, 4.8, .32], [-.15, .97, -.1], [0, .1, 1], FLAT, [-1.75, 3.8, .1]);
/** End: out past the shoulder, hand tipped back. */
const END = arm([-1.5, 4.72, .1], [-.5, .84, -.2], [-.35, 0, .94], FLAT, [-1.8, 3.8, 0]);
const dayAfterTomorrow = [
    rest(0), rest(.15),
    one(.6, NEAR_CHEEK),
    one(.85, NEAR_CHEEK),
    one(1.1, ARC),
    one(1.35, ARC_2),
    one(1.6, END),
    one(2.0, END),
    rest(DAY_AFTER_TOMORROW_DURATION),
];
export function createDayAfterTomorrowAnimation(model) {
    return createDemoClip(model, dayAfterTomorrow, DAY_AFTER_TOMORROW_DURATION, [], 0, 'left');
}
