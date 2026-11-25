import { mirrorKeys } from './mirrored';
import { createRecordedClip } from './recorded';
export const NUM_4_DURATION = 2.83;
// [time, signer's right hand, signer's left hand]; 0 = arm at rest.
const keys = [
    [.531, { w: [-.862, 3.091, .85], d: [-.127, .391, .164], p: [-.124, .139, -.967], e: [-1.15, 2.927, -.174], c: { thumb: [.567, .91, .637], index: [.096, .039, .051], middle: [0, .056, .049], ring: [0, .047, .059], pinky: [.045, .068, .096] }, s: { thumb: .161, index: .199, middle: .021, ring: -.112, pinky: -.237 }, o: .56 }, 0],
    [.843, { w: [-.667, 3.542, .338], d: [-.195, .932, .298], p: [-.225, .253, -.94], e: [-1.15, 2.826, -.35], c: { thumb: [.81, 1.3, .91], index: [.137, .056, .073], middle: [0, .08, .071], ring: [0, .067, .084], pinky: [.064, .096, .137] }, s: { thumb: .23, index: .284, middle: .03, ring: -.16, pinky: -.338 }, o: .8 }, 0],
    [1.145, { w: [-.537, 3.338, .276], d: [-.065, .955, .288], p: [-.274, .26, -.926], e: [-1.15, 2.819, -.35], c: { thumb: [.791, 1.3, .91], index: [.125, .088, .097], middle: [0, .122, .183], ring: [0, .055, .078], pinky: [0, .128, .254] }, s: { thumb: .141, index: .154, middle: -.006, ring: -.142, pinky: -.333 }, o: .75 }, 0],
    [1.598, { w: [-.52, 3.31, .303], d: [-.042, .956, .288], p: [-.282, .264, -.921], e: [-1.15, 2.808, -.35], c: { thumb: [.751, 1.3, .91], index: [.118, .083, .108], middle: [0, .116, .083], ring: [0, .056, .102], pinky: [0, .127, .168] }, s: { thumb: .102, index: .106, middle: .038, ring: -.188, pinky: -.361 }, o: .75 }, 0],
    [1.85, { w: [-.536, 3.262, .276], d: [-.005, .947, .32], p: [-.308, .303, -.901], e: [-1.15, 2.833, -.35], c: { thumb: [.85, 1.3, .91], index: [.08, .078, .091], middle: [0, .103, .07], ring: [0, .056, .063], pinky: [0, .172, .107] }, s: { thumb: .162, index: .079, middle: -.007, ring: -.14, pinky: -.285 }, o: .75 }, 0],
    [2.2, { w: [-.536, 3.262, .276], d: [-.005, .947, .321], p: [-.308, .303, -.901], e: [-1.15, 2.833, -.35], c: { thumb: [.851, 1.3, .91], index: [.08, .078, .091], middle: [0, .103, .07], ring: [0, .056, .063], pinky: [0, .172, .107] }, s: { thumb: .162, index: .079, middle: -.008, ring: -.14, pinky: -.285 }, o: .75 }, 0],
    [2.517, { w: [-.818, 2.901, .85], d: [-.025, .339, .16], p: [-.154, .152, -.951], e: [-1.15, 2.942, -.155], c: { thumb: [.596, .91, .637], index: [.056, .055, .064], middle: [0, .072, .049], ring: [0, .039, .044], pinky: [0, .121, .075] }, s: { thumb: .113, index: .055, middle: -.005, ring: -.098, pinky: -.199 }, o: .525 }, 0],
];
export function createNum4Animation(model) {
    // Mirrored: played on the character's right hand (a two-handed sign swaps hands).
    return createRecordedClip(model, mirrorKeys(keys), NUM_4_DURATION);
}
