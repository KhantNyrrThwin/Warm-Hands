import { arm, at, both, CLASP, createDemoClip, rest } from './shared';
/** အစာအိမ်နာ / stomach ache : clasped hands shake at the belly. */
export const STOMACH_ACHE_DURATION = 3.6;
const belly = arm([-.36, 2.82, .62], [.95, .05, .25], [.1, .45, -.88], CLASP, [-1.25, 2.75, .05]);
const bellyUp = at(belly, [belly.wrist[0], belly.wrist[1] + .07, belly.wrist[2]]);
const bellyDown = at(belly, [belly.wrist[0], belly.wrist[1] - .07, belly.wrist[2]]);
const stomachAche = [
    rest(0), rest(.15),
    both(.85, belly),
    ...[0, 1, 2, 3, 4, 5].map((i) => both(1.1 + i * .27, i % 2 ? bellyDown : bellyUp)),
    both(2.85, belly),
    rest(STOMACH_ACHE_DURATION),
];
const STOMACH_BODY = [
    { time: 0 }, { time: .4 },
    { time: 1.0, lean: .09, nod: .14, tilt: -.05 },
    { time: 2.8, lean: .1, nod: .16, tilt: -.06 },
    { time: STOMACH_ACHE_DURATION },
];
export function createStomachAcheAnimation(model) {
    // The stomach sits a little to the viewer's left.
    return createDemoClip(model, stomachAche, STOMACH_ACHE_DURATION, STOMACH_BODY, -.16);
}
