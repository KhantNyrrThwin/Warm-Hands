import { mirrorKeys } from './mirrored';
import { createRecordedClip } from './recorded';
export const YANGON_DURATION = 4.0;
// As recorded: [time, signer's right hand, signer's left hand]; 0 = arm at rest.
const recorded = [
    [.568, { w: [-.993, 3.138, .85], d: [-.178, .402, .058], p: [-.069, .039, -.994], e: [-1.15, 2.962, -.174], c: { thumb: [.245, .061, .043], index: [.819, .939, .169], middle: [1.012, .739, .171], ring: [1.059, .931, .183], pinky: [.166, .25, .229] }, s: { thumb: .204, index: .044, middle: 0, ring: 0, pinky: -.28 }, o: .132 }, 0],
    [.91, { w: [-.905, 3.628, .805], d: [-.286, .952, .105], p: [-.125, .071, -.99], e: [-1.15, 2.89, -.35], c: { thumb: [.351, .087, .061], index: [1.17, 1.342, .242], middle: [1.445, 1.055, .245], ring: [1.512, 1.33, .262], pinky: [.237, .357, .327] }, s: { thumb: .291, index: .063, middle: 0, ring: 0, pinky: -.4 }, o: .189 }, 0],
    [1.11, { w: [-.932, 3.678, .805], d: [-.248, .964, .101], p: [-.133, .068, -.989], e: [-1.15, 2.897, -.35], c: { thumb: [.351, .124, .087], index: [1.55, .74, .207], middle: [1.55, .737, .285], ring: [1.55, 1.301, .35], pinky: [.157, .227, .391] }, s: { thumb: .3, index: 0, middle: 0, ring: 0, pinky: -.364 }, o: .189 }, 0],
    [1.509, { w: [-.945, 3.685, .804], d: [-.238, .966, .102], p: [-.132, .07, -.989], e: [-1.15, 2.895, -.35], c: { thumb: [.371, .124, .087], index: [1.55, .66, .222], middle: [1.55, .779, .241], ring: [1.532, 1.285, .357], pinky: [.193, .301, .188] }, s: { thumb: .299, index: 0, middle: 0, ring: 0, pinky: -.328 }, o: .297 }, 0],
    [1.909, { w: [-.933, 3.646, .8], d: [-.285, .952, .115], p: [-.154, .071, -.985], e: [-1.15, 2.881, -.35], c: { thumb: [.373, .173, .121], index: [1.55, .858, .329], middle: [1.55, .777, .224], ring: [1.55, 1.126, .327], pinky: [.226, .354, .202] }, s: { thumb: .349, index: 0, middle: 0, ring: 0, pinky: -.361 }, o: .251 }, 0],
    [2.108, { w: [-.946, 3.661, .798], d: [-.289, .95, .121], p: [-.163, .077, -.984], e: [-1.15, 2.882, -.35], c: { thumb: [.42, .111, .078], index: [1.55, .691, .342], middle: [1.55, .856, .214], ring: [1.55, 1.222, .332], pinky: [.16, .307, .198] }, s: { thumb: .32, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: .275 }, 0],
    [2.308, { w: [-.957, 3.657, .797], d: [-.284, .95, .127], p: [-.159, .085, -.984], e: [-1.15, 2.887, -.35], c: { thumb: [.45, .061, .043], index: [1.55, .771, .21], middle: [1.55, .905, .181], ring: [1.55, 1.289, .331], pinky: [.133, .337, .136] }, s: { thumb: .299, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: .398 }, 0],
    [2.508, { w: [-.957, 3.642, .781], d: [-.28, .933, .192], p: [-.166, .147, -.972], e: [-1.15, 2.891, -.35], c: { thumb: [.431, .099, .069], index: [1.55, .425, .226], middle: [1.55, .579, .203], ring: [1.55, 1.032, .333], pinky: [.378, .522, .243] }, s: { thumb: .349, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: .286 }, 0],
    [2.708, { w: [-.946, 3.561, .724], d: [-.218, .807, .531], p: [-.205, .497, -.836], e: [-1.15, 2.906, -.35], c: { thumb: [.421, .174, .122], index: [1.55, .374, .437], middle: [1.55, .506, .504], ring: [1.55, .921, .486], pinky: [.975, .521, .414] }, s: { thumb: .4, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: .025 }, 0],
    [2.907, { w: [-.932, 3.52, .704], d: [-.232, .717, .632], p: [-.217, .601, -.772], e: [-1.15, 2.925, -.35], c: { thumb: [.54, .187, .131], index: [1.55, .393, .676], middle: [1.55, .438, .97], ring: [1.55, .88, .813], pinky: [.952, .426, .51] }, s: { thumb: .4, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: 0 }, 0],
    [3.107, { w: [-.944, 3.515, .704], d: [-.059, .776, .604], p: [-.156, .587, -.786], e: [-1.15, 2.927, -.35], c: { thumb: [.551, .15, .105], index: [1.55, .191, .76], middle: [1.55, .397, .96], ring: [1.55, .7, 1.035], pinky: [1.277, .61, .432] }, s: { thumb: .381, index: 0, middle: 0, ring: 0, pinky: -.16 }, o: .062 }, 0],
    [3.307, { w: [-.96, 3.514, .733], d: [.072, .881, .464], p: [-.153, .471, -.867], e: [-1.15, 2.927, -.35], c: { thumb: [.585, .189, .132], index: [1.55, .205, .501], middle: [1.55, .399, .458], ring: [1.55, .793, .615], pinky: [1.55, .833, .37] }, s: { thumb: .305, index: 0, middle: 0, ring: 0, pinky: 0 }, o: .205 }, 0],
    [3.506, { w: [-.953, 3.535, .759], d: [-.101, .938, .29], p: [-.149, .275, -.944], e: [-1.15, 2.905, -.35], c: { thumb: [.48, .166, .116], index: [1.55, .291, .197], middle: [1.55, .404, .29], ring: [1.55, .899, .441], pinky: [.85, .757, .297] }, s: { thumb: .332, index: 0, middle: 0, ring: 0, pinky: -.239 }, o: .315 }, 0],
    [3.706, { w: [-.959, 3.583, .793], d: [-.284, .949, .143], p: [-.139, .109, -.985], e: [-1.15, 2.889, -.35], c: { thumb: [.419, .149, .104], index: [1.55, .696, .2], middle: [1.55, .573, .212], ring: [1.55, 1.131, .341], pinky: [.223, .458, .266] }, s: { thumb: .315, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: .271 }, 0],
    [3.906, { w: [-.967, 3.591, .801], d: [-.285, .951, .116], p: [-.153, .074, -.986], e: [-1.15, 2.886, -.35], c: { thumb: [.458, .104, .073], index: [1.55, 1.005, .233], middle: [1.55, .744, .221], ring: [1.55, 1.259, .264], pinky: [.166, .344, .162] }, s: { thumb: .306, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: .321 }, 0],
    [4.305, { w: [-.96, 3.597, .799], d: [-.326, .937, .127], p: [-.148, .081, -.985], e: [-1.15, 2.888, -.35], c: { thumb: [.451, .098, .068], index: [1.55, .992, .264], middle: [1.55, .945, .27], ring: [1.55, 1.259, .309], pinky: [.167, .351, .154] }, s: { thumb: .319, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: .312 }, 0],
    [4.505, { w: [-.972, 3.604, .795], d: [-.286, .948, .141], p: [-.14, .103, -.984], e: [-1.15, 2.888, -.35], c: { thumb: [.436, .123, .086], index: [1.55, 1.052, .275], middle: [1.55, .991, .247], ring: [1.55, 1.417, .263], pinky: [.167, .401, .24] }, s: { thumb: .311, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: .292 }, 0],
    [4.705, { w: [-.977, 3.604, .79], d: [-.305, .938, .154], p: [-.136, .117, -.984], e: [-1.15, 2.887, -.35], c: { thumb: [.403, .125, .088], index: [1.55, .899, .254], middle: [1.55, .789, .178], ring: [1.55, 1.278, .245], pinky: [.195, .386, .237] }, s: { thumb: .348, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: .254 }, 0],
    [4.954, { w: [-.971, 3.586, .775], d: [-.294, .934, .195], p: [-.118, .167, -.978], e: [-1.15, 2.876, -.35], c: { thumb: [.372, .155, .108], index: [1.55, .427, .148], middle: [1.55, .523, .135], ring: [1.55, 1.023, .223], pinky: [.319, .695, .521] }, s: { thumb: .38, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: .208 }, 0],
    [5.304, { w: [-.971, 3.586, .775], d: [-.294, .934, .195], p: [-.118, .167, -.978], e: [-1.15, 2.876, -.35], c: { thumb: [.372, .155, .108], index: [1.55, .426, .148], middle: [1.55, .523, .135], ring: [1.55, 1.023, .223], pinky: [.319, .696, .521] }, s: { thumb: .38, index: 0, middle: 0, ring: 0, pinky: -.4 }, o: .208 }, 0],
    [5.676, { w: [-1.036, 3.063, .849], d: [-.17, .331, .097], p: [-.059, .083, -.989], e: [-1.15, 2.963, -.155], c: { thumb: [.26, .108, .076], index: [1.084, .298, .104], middle: [1.084, .366, .094], ring: [1.084, .715, .156], pinky: [.223, .486, .365] }, s: { thumb: .265, index: 0, middle: 0, ring: 0, pinky: -.28 }, o: .146 }, 0],
];
/**
 * The sign twice: rise (key 0), the hand up, then the hand bends down at the wrist and back up,
 * twice; then lower right away (key 20). Between the rise and the lowering the arm does not
 * move (wrist position and elbow fixed) and the handshape (thumb and fingers) stays as in key 6:
 * only the wrist joint bends, in one plane (no circling).
 */
/** The middle three fingers (index, middle, ring) gripped tightly into the palm; the thumb and little finger as recorded. */
const TIGHT = [1.45, 1.6, 1.05];
const grip = (arm) => ({ ...arm, c: { ...arm.c, index: TIGHT, middle: TIGHT, ring: TIGHT } });
const pose = (time, recordedKey) => [time, grip(recorded[recordedKey][1]), recorded[recordedKey][2]];
const HAND = grip(recorded[6][1]);
/** How far the wrist bends: from the fingers pointing up to pointing down-forward. */
const BEND = 70 * Math.PI / 180;
/**
 * The hand of key 6 bent at the wrist by `angle` toward the palm side: the fingers swing from
 * pointing up toward the viewer and down. Wrist position, elbow and handshape do not change.
 */
const bent = (time, angle) => {
    const n = Math.hypot(...HAND.d), d = HAND.d.map((v) => v / n);
    const back = HAND.p; // raw palm field: the back-of-hand side
    const palmSide = back.map((v) => -v);
    const c = Math.cos(angle), s = Math.sin(angle);
    return [time, {
            ...HAND,
            d: d.map((v, i) => v * c + palmSide[i] * s), // fingers turn toward the palm side
            p: back.map((v, i) => v * c + d[i] * s), // and the back of the hand turns with them
        }, 0];
};
const wristDownUp = (start) => [
    bent(start + .5, BEND), // the wrist bends down
    bent(start + 1.0, 0), // and comes back up
];
const keys = [
    pose(.5, 0), // rising
    bent(.85, 0), // hand up; from here the arm stays still and only the wrist bends
    bent(.95, 0),
    ...wristDownUp(.95), // 1st: down 1.45, up 1.95
    bent(2.05, 0),
    ...wristDownUp(2.05), // 2nd: down 2.55, up 3.05
    bent(3.2, 0), // brief stop, then down
    pose(3.6, 20), // lowering
];
export function createYangonAnimation(model) {
    // Mirrored: played on the character's right hand (a two-handed sign swaps hands).
    return createRecordedClip(model, mirrorKeys(keys), YANGON_DURATION);
}
