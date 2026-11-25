import { mirrorKeys } from './mirrored';
import { createRecordedClip } from './recorded';
export const NUM_3_DURATION = 2.94;
// [time, signer's right hand, signer's left hand]; 0 = arm at rest.
const keys = [
    [.545, { w: [-.957, 3.165, .849], d: [-.019, .406, .141], p: [-.166, -.05, -.366], e: [-1.15, 2.946, -.174], c: { thumb: [.489, .469, .328], index: [.075, .038, .083], middle: [.082, .06, .049], ring: [.105, .121, .089], pinky: [.201, 1.154, .18] }, s: { thumb: -.245, index: .089, middle: .01, ring: -.133, pinky: -.023 }, o: .699 }, 0],
    [.869, { w: [-.84, 3.678, .386], d: [.003, .96, .257], p: [-.302, -.091, .154], e: [-1.15, 2.86, -.35], c: { thumb: [.699, .671, .47], index: [.107, .054, .119], middle: [.117, .086, .069], ring: [.151, .174, .127], pinky: [.287, 1.65, .258] }, s: { thumb: -.351, index: .128, middle: .015, ring: -.19, pinky: -.033 }, o: 1 }, 0],
    [1.02, { w: [-.768, 3.269, .694], d: [-.121, .975, .186], p: [-.22, .156, -.963], e: [-1.15, 2.811, -.35], c: { thumb: [.397, 1.3, .91], index: [.067, .06, .205], middle: [0, .142, .066], ring: [.064, .176, .136], pinky: [.48, 1.65, .378] }, s: { thumb: -.292, index: .22, middle: .021, ring: -.113, pinky: .244 }, o: 1 }, 0],
    [1.473, { w: [-.775, 3.26, .69], d: [-.117, .977, .18], p: [-.222, .15, -.963], e: [-1.15, 2.812, -.35], c: { thumb: [.399, 1.3, .91], index: [.04, .082, .091], middle: [0, .129, .051], ring: [.06, .18, .066], pinky: [.494, 1.65, .253] }, s: { thumb: -.272, index: .194, middle: .052, ring: -.09, pinky: .242 }, o: 1 }, 0],
    [1.926, { w: [-.751, 3.259, .669], d: [-.134, .974, .182], p: [-.213, .152, -.965], e: [-1.15, 2.794, -.35], c: { thumb: [.4, 1.3, .91], index: [.034, .122, .081], middle: [0, .137, .069], ring: [.071, .167, .209], pinky: [.471, 1.65, .209] }, s: { thumb: -.261, index: .239, middle: .049, ring: -.061, pinky: .303 }, o: 1 }, 0],
    [2.276, { w: [-.751, 3.258, .669], d: [-.134, .973, .182], p: [-.213, .152, -.966], e: [-1.15, 2.794, -.35], c: { thumb: [.4, 1.299, .91], index: [.034, .122, .081], middle: [0, .137, .069], ring: [.071, .167, .209], pinky: [.471, 1.649, .209] }, s: { thumb: -.261, index: .239, middle: .049, ring: -.061, pinky: .303 }, o: 1 }, 0],
    [2.607, { w: [-.926, 2.899, .85], d: [-.089, .352, .091], p: [-.106, .076, -.983], e: [-1.15, 2.922, -.155], c: { thumb: [.28, .91, .637], index: [.024, .086, .057], middle: [0, .096, .048], ring: [.05, .117, .146], pinky: [.33, 1.155, .146] }, s: { thumb: -.183, index: .167, middle: .034, ring: -.043, pinky: .212 }, o: .7 }, 0],
];
export function createNum3Animation(model) {
    // Mirrored: played on the character's right hand (a two-handed sign swaps hands).
    return createRecordedClip(model, mirrorKeys(keys), NUM_3_DURATION);
}
