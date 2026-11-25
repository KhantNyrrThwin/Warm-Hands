import { arm, createDemoClip, one, OPEN, rest } from './shared';
import { FLAT } from './shapes';
import { turnedBody } from './turn';
/**
 * အစ်မ / older sister
 * 1. Female: the flat hand, palm down, at the side of the forehead, strokes
 *    down beside the face.
 * 2. Older: the hand rises up high above the shoulder.
 * The body first turns about 30° to the right.
 * Signed with the LEFT hand, like the book picture.
 */
export const OLDER_SISTER_DURATION = 3.6;
const HAIR_TOP = arm([-1.1, 4.95, .5], [.95, .15, .2], [0, -1, .15], FLAT, [-1.7, 4.0, .2]);
const HAIR_LOW = arm([-1.1, 4.55, .5], [.95, .15, .2], [0, -1, .15], FLAT, [-1.7, 3.8, .2]);
/** Hand by the shoulder, palm forward, ready to rise. */
const RAISE_LOW = arm([-1.05, 4.45, .35], [0, 1, 0], [0, 0, 1], OPEN, [-1.7, 3.7, 0]);
/** Hand raised up high. */
const RAISE_HIGH = arm([-.95, 5.15, .15], [0, 1, 0], [0, 0, 1], OPEN, [-1.7, 4.2, 0]);
const olderSister = [
    rest(0), rest(.5),
    one(.95, HAIR_TOP),
    one(1.15, HAIR_TOP),
    one(1.6, HAIR_LOW),
    one(1.9, RAISE_LOW),
    one(2.35, RAISE_HIGH),
    one(2.75, RAISE_HIGH),
    rest(OLDER_SISTER_DURATION),
];
/** Turn about 30° to the right first, then sign. */
// Once the hand is up, the lean toward it takes back about 6°: add that back (+6° body, +6° head).
const OLDER_SISTER_BODY = turnedBody(30, .5, 2.85, OLDER_SISTER_DURATION, { at: .95, body: 6, head: 6 });
export function createOlderSisterAnimation(model) {
    return createDemoClip(model, olderSister, OLDER_SISTER_DURATION, OLDER_SISTER_BODY, 0, 'left');
}
