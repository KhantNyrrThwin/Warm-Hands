import { mirrorKeys } from './mirrored';
import { createRecordedClip } from './recorded';
export const MANDALAY_DURATION = 3.9;
// As recorded: [time, signer's right hand, signer's left hand]; 0 = arm at rest.
const recorded = [
    [.539, { w: [-.975, 3.025, .85], d: [-.133, .409, .089], p: [-.112, .065, -.984], e: [-1.15, 2.951, -.174], c: { thumb: [.487, .91, .637], index: [.053, .075, .069], middle: [0, .094, .06], ring: [.074, .142, .12], pinky: [.405, 1.155, .064] }, s: { thumb: -.107, index: .167, middle: .041, ring: -.075, pinky: .109 }, o: .7 }, 0],
    [.857, { w: [-.873, 3.422, .767], d: [-.206, .964, .161], p: [-.203, .119, -.971], e: [-1.15, 2.87, -.35], c: { thumb: [.696, 1.3, .91], index: [.075, .108, .099], middle: [0, .134, .086], ring: [.106, .202, .171], pinky: [.578, 1.649, .092] }, s: { thumb: -.152, index: .239, middle: .059, ring: -.107, pinky: .156 }, o: 1 }, 0],
    [1.158, { w: [-.865, 3.441, .767], d: [-.239, .958, .157], p: [-.181, .114, -.977], e: [-1.15, 2.855, -.35], c: { thumb: [.594, 1.3, .91], index: [.07, .089, .072], middle: [0, .15, .068], ring: [.135, .193, .141], pinky: [.694, 1.65, .134] }, s: { thumb: -.157, index: .234, middle: .111, ring: -.063, pinky: .18 }, o: 1 }, 0],
    [1.309, { w: [-.846, 3.38, .752], d: [-.222, .961, .163], p: [-.196, .121, -.973], e: [-1.15, 2.847, -.35], c: { thumb: [.718, 1.3, .91], index: [.07, .078, .073], middle: [0, .146, .055], ring: [.126, .194, .109], pinky: [.748, 1.65, .153] }, s: { thumb: -.112, index: .25, middle: .104, ring: -.074, pinky: .193 }, o: 1 }, 0],
    [1.61, { w: [-.879, 3.434, .771], d: [-.218, .964, .15], p: [-.179, .112, -.978], e: [-1.15, 2.85, -.35], c: { thumb: [.438, 1.3, .91], index: [.068, .069, .083], middle: [0, .127, .058], ring: [.139, .161, .107], pinky: [.736, 1.646, .232] }, s: { thumb: -.273, index: .226, middle: .105, ring: -.05, pinky: .208 }, o: 1 }, 0],
    [1.911, { w: [-.898, 3.437, .771], d: [-.191, .97, .148], p: [-.194, .11, -.975], e: [-1.15, 2.855, -.35], c: { thumb: [.725, 1.3, .91], index: [.087, .081, .088], middle: [0, .133, .04], ring: [.117, .201, .089], pinky: [.746, 1.547, .497] }, s: { thumb: -.094, index: .206, middle: .053, ring: -.075, pinky: .222 }, o: 1 }, 0],
    [2.362, { w: [-.916, 3.442, .777], d: [-.215, .967, .134], p: [-.169, .098, -.98], e: [-1.15, 2.857, -.35], c: { thumb: [.658, 1.3, .91], index: [.067, .098, .084], middle: [0, .15, .081], ring: [.148, .286, .127], pinky: [.748, 1.633, .437] }, s: { thumb: -.152, index: .22, middle: .123, ring: -.063, pinky: .178 }, o: 1 }, 0],
    [2.513, { w: [-.978, 3.536, .794], d: [-.228, .967, .101], p: [-.166, .066, -.983], e: [-1.15, 2.861, -.35], c: { thumb: [.467, 1.286, .9], index: [.118, .149, .201], middle: [.03, .272, .142], ring: [.171, .301, .178], pinky: [.76, 1.635, .41] }, s: { thumb: -.253, index: .182, middle: -.007, ring: -.105, pinky: .18 }, o: 1 }, 0],
    [2.663, { w: [-1.025, 3.606, .804], d: [-.234, .968, .075], p: [-.183, .033, -.983], e: [-1.15, 2.861, -.35], c: { thumb: [.447, 1.258, .88], index: [.237, .353, .835], middle: [.096, .664, .654], ring: [.183, .891, .562], pinky: [.693, 1.64, .486] }, s: { thumb: -.272, index: .106, middle: -.101, ring: -.143, pinky: .138 }, o: 1 }, 0],
    [2.864, { w: [-.863, 3.379, .783], d: [-.231, .968, .096], p: [-.234, .04, -.971], e: [-1.15, 2.849, -.35], c: { thumb: [.881, 1.3, .91], index: [.308, .635, 1.2], middle: [.126, 1.152, 1.167], ring: [.163, 1.562, .853], pinky: [.745, 1.65, .582] }, s: { thumb: .001, index: .003, middle: -.163, ring: -.173, pinky: .008 }, o: 1 }, 0],
    [3.214, { w: [-.863, 3.378, .784], d: [-.231, .968, .096], p: [-.234, .04, -.971], e: [-1.15, 2.849, -.35], c: { thumb: [.881, 1.3, .91], index: [.308, .634, 1.2], middle: [.126, 1.152, 1.167], ring: [.163, 1.562, .853], pinky: [.744, 1.65, .582] }, s: { thumb: .001, index: .003, middle: -.163, ring: -.173, pinky: .008 }, o: 1 }, 0],
    [3.565, { w: [-.982, 2.959, .849], d: [-.138, .348, .048], p: [-.117, .02, -.986], e: [-1.15, 2.95, -.155], c: { thumb: [.616, .909, .636], index: [.215, .444, .839], middle: [.088, .806, .816], ring: [.114, 1.092, .596], pinky: [.521, 1.154, .407] }, s: { thumb: .001, index: .002, middle: -.114, ring: -.121, pinky: .006 }, o: .699 }, 0],
];
/**
 * The sign twice within 3.9 s, using the recorded poses unchanged: rise to the open hand (key 1),
 * a short open hold (key 6), the closing of the hand (keys 7-9, as recorded), a short closed hold
 * (key 10); open again and close again; then lower (key 11). The long open hold of the recording
 * (1.2-2.4 s) is shortened to fit both.
 */
const pose = (time, recordedKey) => [time, recorded[recordedKey][1], recorded[recordedKey][2]];
/**
 * The hand stays still while the fingers move: the recorded finger and thumb shapes of that key,
 * on the hand position, direction and palm of the open hand just before closing (key 6). In the
 * recording the wrist rises a little as the fingers close; here only the fingers move.
 */
const steady = (time, recordedKey) => {
    const hand = recorded[6][1], fingers = recorded[recordedKey][1];
    return [time, { ...fingers, w: hand.w, d: hand.d, p: hand.p, e: hand.e }, recorded[recordedKey][2]];
};
const keys = [
    pose(.4, 0), // rising
    steady(.62, 1), // open hand up; from here the hand stays still and only the fingers move
    steady(.95, 6),
    steady(1.08, 7), steady(1.21, 8), steady(1.4, 9), // 1st: the fingers close
    steady(1.58, 10),
    steady(1.88, 1), // the fingers open again
    steady(2.08, 6),
    steady(2.21, 7), steady(2.34, 8), steady(2.53, 9), // 2nd: the fingers close
    steady(2.95, 10),
    pose(3.38, 11), // lowering
];
export function createMandalayAnimation(model) {
    // Mirrored: played on the character's right hand (a two-handed sign swaps hands).
    return createRecordedClip(model, mirrorKeys(keys), MANDALAY_DURATION);
}
