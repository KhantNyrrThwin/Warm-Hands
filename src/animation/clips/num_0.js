import { mirrorKeys } from './mirrored';
import { createRecordedClip } from './recorded';
export const NUM_0_DURATION = 3.03;
// Authored in the recording's camera view: the signer's right hand works on -x. mirrorKeys()
// below puts the sign on the character's right hand, as for the other signs.
const INDEX = [.7, 1.45, .9];
const curve = (k) => INDEX.map((v) => +(v * k).toFixed(3));
/** Round "O": fingers evenly curved, the index fingertip on the thumb tip (also used by Ten). */
export const CIRCLE = {
    c: { thumb: [.9, .35, .3], index: INDEX, middle: curve(.97), ring: curve(.95), pinky: curve(.93) },
    s: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
    o: .4,
};
/** On the way up and down: the same circle, a little open. */
const OPENING = {
    c: { thumb: [.7, .25, .15], index: curve(.7), middle: curve(.72), ring: curve(.75), pinky: curve(.78) },
    s: CIRCLE.s,
    o: .2,
};
/** Held: beside the face, upright, palm toward the centre (pmt's median while held). */
const HELD = { w: [-.53, 3.55, .45], d: [.05, .99, .1], p: [-1, .05, .02], e: [-1.15, 2.82, -.35], ...CIRCLE };
const rising = { w: [-.9, 3.18, .85], d: [.03, .42, .05], p: [-.38, .07, -.84], e: [-1.15, 2.95, -.2], ...OPENING };
const lowering = { w: [-.81, 3.04, .85], d: [.01, .36, .05], p: [-.43, .06, -.76], e: [-1.15, 2.95, -.2], ...OPENING };
// [time, signer's right hand, signer's left hand]; 0 = arm at rest.
const keys = [
    [.56, rising, 0],
    [.95, HELD, 0],
    [2.31, HELD, 0], // the circle, held still
    [2.67, lowering, 0],
];
export function createNum0Animation(model) {
    // Mirrored: played on the character's right hand.
    return createRecordedClip(model, mirrorKeys(keys), NUM_0_DURATION);
}
