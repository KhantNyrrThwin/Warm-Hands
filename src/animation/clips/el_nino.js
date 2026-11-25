import { arm, createDemoClip, one, OPEN, rest, SPREAD } from './shared';
import { CLAW, FLAT } from './shapes';
import { turnBetween } from './turn';
/**
 * အယ်လ်နီညို / El Niño
 * 1. A flat hand, palm down, held level just under the lips, slides a little across.
 * 2. The other hand is held up in front of the chest; the open signing hand
 *    moves across toward it.
 * 3. Body turned about 30° to the right: the hand at the side of the forehead
 *    wipes off outward and down (wiping away the heat).
 * Signed with the LEFT hand, like the book picture.
 */
export const EL_NINO_DURATION = 5.0;
const UNDER_LIPS = arm([-.55, 4.6, .8], [1, 0, -.05], [0, -1, 0], FLAT, [-1.3, 3.8, .4]);
const UNDER_LIPS_ACROSS = arm([-.45, 4.6, .8], [1, 0, -.05], [0, -1, 0], FLAT, [-1.3, 3.8, .4]);
/** Other hand held up in front of the chest, fingers loosely bent, palm in. */
const HELD = arm([.35, 3.6, .72], [0, 1, .1], [-1, 0, 0], CLAW, [1.2, 2.9, .3]);
/** Open signing hand, palm out, starting out at the side... */
const ACROSS_START = arm([-.8, 3.55, .7], [0, 1, .05], [0, 0, 1], SPREAD, [-1.4, 2.9, .2]);
/** ...and arriving beside the held hand. */
const ACROSS_END = arm([-.15, 3.6, .78], [0, 1, .05], [.3, 0, .95], OPEN, [-1.2, 2.9, .3]);
/**
 * Fingers against the temple at the side of the forehead. (The arm cannot
 * reach the middle of this character's large forehead, so the wipe starts
 * at the temple, the highest point the hand reaches.)
 */
const FOREHEAD = arm([-1.1, 5.0, .5], [.5, .85, 0], [1, -.5, 0], FLAT, [-1.75, 4.1, .1]);
const WIPE_MID = arm([-1.28, 4.85, .65], [.4, .9, .15], [.5, 0, -.85], FLAT, [-1.8, 3.9, .15]);
/** Wiped off, out and down. */
const WIPE_END = arm([-1.35, 4.5, .7], [.2, .95, .2], [-.4, 0, -.92], FLAT, [-1.8, 3.6, .1]);
const elNino = [
    rest(0), rest(.15),
    one(.6, UNDER_LIPS),
    one(.85, UNDER_LIPS),
    one(1.15, UNDER_LIPS_ACROSS),
    one(1.35, UNDER_LIPS_ACROSS),
    { time: 1.8, left: ACROSS_START, right: HELD },
    { time: 1.95, left: ACROSS_START, right: HELD },
    { time: 2.4, left: ACROSS_END, right: HELD },
    { time: 2.65, left: ACROSS_END, right: HELD },
    one(3.25, FOREHEAD),
    one(3.45, FOREHEAD),
    one(3.75, WIPE_MID),
    one(4.0, WIPE_END),
    one(4.3, WIPE_END),
    rest(EL_NINO_DURATION),
];
const EL_NINO_BODY = [
    { time: 0 },
    ...turnBetween(30, 2.7, 3.2, 4.35, 4.9),
    { time: EL_NINO_DURATION },
];
export function createElNinoAnimation(model) {
    return createDemoClip(model, elNino, EL_NINO_DURATION, EL_NINO_BODY, 0, 'left');
}
