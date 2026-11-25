import { HAND_SHAPES } from '../handArticulation';
/** Extra hand shapes shared by the family / time clips. */
/** Flat hand: four fingers straight and together, thumb resting alongside. */
export const FLAT = {
    curl: { thumb: [.1, .1, .05], index: 0, middle: 0, ring: 0, pinky: 0 },
    spread: { index: .02, middle: 0, ring: -.02, pinky: -.04 },
    thumbOpposition: .15,
};
/** Relaxed claw: every finger bent at all joints, as when tapping a watch. */
export const CLAW = {
    curl: {
        thumb: [.3, .3, .2],
        index: [.55, .75, .45],
        middle: [.6, .75, .45],
        ring: [.65, .75, .45],
        pinky: [.7, .75, .45],
    },
    spread: { index: -.04, ring: .04, pinky: .08 },
    thumbOpposition: .4,
};
/** Closed fist. */
export const FIST = HAND_SHAPES.fist;
/*
 * The shapes below are tuned for the LEFT hand (every clip using them is
 * left-handed). Finger spread turns the opposite way on each hand: on the
 * left hand a positive index spread moves the index AWAY from the middle finger.
 */
/** Finger fully folded into the palm. */
const FOLD = [1.45, 1.35, .8];
/** L: index straight up, thumb straight out to the side, the rest folded. */
export const L_HAND = {
    curl: { thumb: [0, 0, 0], index: 0, middle: FOLD, ring: FOLD, pinky: FOLD },
    spread: { thumb: .9 },
    thumbOpposition: 0,
};
/** B: four fingers straight up and together, thumb folded across the palm. */
export const B_HAND = {
    curl: { thumb: [.55, .55, .45], index: 0, middle: 0, ring: 0, pinky: 0 },
    spread: { index: .02, middle: 0, ring: -.02, pinky: -.04 },
    thumbOpposition: 1,
};
/** OK / F: thumb and index tips touch in a circle, the other three fingers up and spread. */
export const OK_HAND = {
    curl: { thumb: [1.1, .1, 0], index: [1.3, 1.1, .8], middle: 0, ring: 0, pinky: 0 },
    spread: { middle: -.02, ring: -.12, pinky: -.24 },
    thumbOpposition: .6,
};
/** V: index and middle straight and apart, thumb holding the ring and little fingers down. */
export const V_HAND = {
    curl: { thumb: [.5, .45, .3], index: 0, middle: 0, ring: FOLD, pinky: FOLD },
    spread: { index: .38, middle: -.3 },
    thumbOpposition: .8,
};
/** 3: index, middle and ring up, thumb holding the little finger down. */
export const THREE_HAND = {
    curl: { thumb: [.55, .5, .35], index: 0, middle: 0, ring: 0, pinky: FOLD },
    spread: { index: .12, middle: 0, ring: -.12 },
    thumbOpposition: .95,
};
/** K: index straight up, middle half bent forward with the thumb touching it, the rest folded. */
export const K_HAND = {
    curl: { thumb: [1.1, .1, 0], index: 0, middle: [1.3, .6, .3], ring: FOLD, pinky: FOLD },
    spread: { index: -.05 },
    thumbOpposition: .6,
};
/**
 * G (gram): index straight, thumb straight beside it with a small gap, the rest
 * folded. With the palm facing out and fingers pointing across, the thumb sits under the index.
 */
export const G_HAND = {
    curl: { thumb: [.05, .05, 0], index: [.1, 0, 0], middle: FOLD, ring: FOLD, pinky: FOLD },
    spread: { thumb: -.1 },
    thumbOpposition: .55,
};
/** Bunched fingertips together, all fingers bent toward the thumb. */
export const PINCHED = {
    curl: {
        thumb: [.15, .2, .1],
        index: [.55, .5, .3],
        middle: [.55, .5, .3],
        ring: [.6, .5, .3],
        pinky: [.65, .5, .3],
    },
    spread: { index: -.06, ring: .05, pinky: .1 },
    thumbOpposition: .8,
};
