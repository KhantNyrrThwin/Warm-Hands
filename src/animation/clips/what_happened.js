import { arm, at, both, createDemoClip, flipIn, flipOut, HOOK, one, questionBody, rest } from './shared';
/** ဘာဖြစ်လို့လဲ / what happened : hooked index under the chin, then the flip. */
export const WHAT_HAPPENED_DURATION = 4.3;
const chin = arm([-.16, 3.92, 1.02], [.12, .98, .1], [.1, .05, .99], HOOK, [-1.25, 3.0, .35]);
const chinTap = at(chin, [-.16, 3.86, 1.04]);
const whatHappened = [
    rest(0), rest(.15),
    one(.75, chin),
    one(1.05, chinTap),
    one(1.35, chin),
    one(1.65, chinTap),
    one(1.85, chin),
    both(2.3, flipIn),
    both(2.75, flipOut),
    both(3.15, flipIn),
    both(3.6, flipOut),
    rest(WHAT_HAPPENED_DURATION),
];
const WHAT_HAPPENED_BODY = questionBody(2.3, 3.7, WHAT_HAPPENED_DURATION);
export function createWhatHappenedAnimation(model) {
    return createDemoClip(model, whatHappened, WHAT_HAPPENED_DURATION, WHAT_HAPPENED_BODY);
}
