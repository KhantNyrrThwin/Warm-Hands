import { arm, one, POINT } from './shared';
import { FLAT } from './shapes';
/**
 * Shared poses for ညီ (younger brother) and အစ်ကို (older brother).
 * 1. Male: the index finger lies across the upper lip like a moustache and
 *    slides outward along it.
 * 2. The flat hand, palm down beside the body, moves down (younger) or up (older).
 */
const MOUSTACHE = arm([-.55, 4.84, .84], [1, .05, .05], [0, -1, .05], POINT, [-1.4, 4.0, .3]);
const MOUSTACHE_OUT = arm([-.72, 4.84, .8], [1, .05, .05], [0, -1, .05], POINT, [-1.5, 4.0, .3]);
/** The male part, from `start`. Ends at `start + .9`. */
export const male = (start) => [
    one(start, MOUSTACHE),
    one(start + .25, MOUSTACHE),
    one(start + .6, MOUSTACHE_OUT),
    one(start + .9, MOUSTACHE_OUT),
];
/** Flat hand, palm down, fingers forward, beside the body at height `y`. */
export const palmDown = (y) => arm([-.8, y, .65], [.3, 0, .95], [0, -1, 0], FLAT, [-1.5, y - .5, .1]);
