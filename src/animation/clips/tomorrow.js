import { arm, createDemoClip, one, rest } from './shared';
import { FLAT } from './shapes';
/**
 * မနက်ဖြန် / tomorrow : the flat hand starts beside the cheek, fingers
 * pointing at the face, and arcs a short way forward and out, ending upright
 * beside the head. Signed with the LEFT hand, like the book picture.
 * သန်ဘက်ခါ (day after tomorrow) is the same arc, carried further back.
 */
export const TOMORROW_DURATION = 2.4;
/** Beside the cheek, fingers toward the face, palm forward. */
export const NEAR_CHEEK = arm([-1.05, 4.85, .68], [1, .08, 0], [0, -.3, .95], FLAT, [-1.6, 3.9, .3]);
/** Top of the arc. */
const ARC = arm([-1.18, 4.75, .62], [.5, .85, 0], [0, -.2, .98], FLAT, [-1.6, 3.8, .2]);
/** End: hand upright beside the head, palm forward. */
const END = arm([-1.32, 4.72, .42], [-.15, .97, -.1], [0, .1, 1], FLAT, [-1.6, 3.8, .1]);
const tomorrow = [
    rest(0), rest(.15),
    one(.6, NEAR_CHEEK),
    one(.85, NEAR_CHEEK),
    one(1.15, ARC),
    one(1.4, END),
    one(1.75, END),
    rest(TOMORROW_DURATION),
];
export function createTomorrowAnimation(model) {
    return createDemoClip(model, tomorrow, TOMORROW_DURATION, [], 0, 'left');
}
