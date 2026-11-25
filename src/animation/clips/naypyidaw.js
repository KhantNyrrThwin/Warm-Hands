import { mirrorKeys } from './mirrored';
import { createRecordedClip } from './recorded';
export const NAYPYIDAW_DURATION = 4.3;
// Authored in the recording's camera view: the signer's right hand works on -x. mirrorKeys()
// below puts the sign on the character's right hand, as for the other signs.
const CLOSED = [1.25, 1.45, .9];
/** Only the index finger out, the others closed, the thumb resting on the middle finger. */
const POINT = {
    c: { thumb: [.4, .4, .2], index: [.05, .05, .03], middle: CLOSED, ring: CLOSED, pinky: CLOSED },
    s: { thumb: -.1, index: -.03, middle: 0, ring: 0, pinky: 0 },
    o: .6,
};
/** The whole hand gripped: all fingers closed, the thumb across them. */
const FIST = {
    c: { thumb: [.5, .48, .25], index: CLOSED, middle: CLOSED, ring: CLOSED, pinky: CLOSED },
    s: { thumb: -.1, index: 0, middle: 0, ring: 0, pinky: 0 },
    o: .75,
};
/** Standing hand: flat, fingers together and up. */
const FLAT = {
    c: { thumb: [.35, .1, .05], index: [0, .1, .1], middle: [0, .1, .07], ring: [0, .12, .1], pinky: [0, .14, .1] },
    s: { thumb: -.05, index: -.04, middle: 0, ring: .03, pinky: .06 },
    o: .5,
};
/** The standing hand (pmt's median): upright in front of the chest, palm toward the centre. Still throughout. */
const STAND = { w: [.39, 3.23, .39], d: [-.06, .97, .25], p: [.78, .2, -.59], e: [1.15, 2.77, -.35], ...FLAT };
const standRising = { ...STAND, w: [.72, 2.9, .8], d: [-.05, .38, .14], p: [.42, .13, -.75] };
/** Right hand, horizontal and palm down, fingers pointing across at the standing hand. */
const level = (x, z, shape) => ({ w: [x, 3.3, z], d: [.95, 0, .3], p: [-.05, 1, .02], e: [-1.15, 2.82, -.35], ...shape });
const POINTING = level(-.2, .47, POINT);
const GRIPPED = level(-.8, .6, FIST);
const rightRising = { ...POINTING, w: [-.6, 2.98, .82], d: [.42, .17, .22] };
const rightLowering = { ...GRIPPED, w: [-.96, 2.87, .85], d: [.3, 0, .2] };
// [time, signer's right hand, signer's left hand]; 0 = arm at rest.
const keys = [
    [.55, rightRising, standRising],
    [.88, POINTING, STAND],
    [2.3, POINTING, STAND], // only the index finger, held
    [2.7, { ...level(-.5, .53, FIST), c: { ...FIST.c, index: [.7, .8, .5] }, o: .7 }, STAND], // closing as it draws back
    [3.1, GRIPPED, STAND],
    [3.6, GRIPPED, STAND], // fist held
    [3.95, rightLowering, standRising],
];
export function createNaypyidawAnimation(model) {
    // Mirrored: played on the character's right hand (a two-handed sign swaps hands).
    return createRecordedClip(model, mirrorKeys(keys), NAYPYIDAW_DURATION);
}
