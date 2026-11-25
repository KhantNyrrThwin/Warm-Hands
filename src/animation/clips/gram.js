import { arm, createDemoClip, one, rest } from './shared';
import { G_HAND } from './shapes';
/**
 * ဂရမ် / gram : beside the face, the index finger and thumb are held level
 * and parallel with a small gap between them, pointing toward the face.
 * Signed with the LEFT hand, like the book picture. Also the second half of ကီလိုဂရမ်.
 */
export const GRAM_DURATION = 2.2;
/** Palm out, fingers pointing toward the face: index on top, thumb underneath. */
export const GRAM_POSE = arm([-.92, 4.15, .6], [1, .22, 0], [0, 0, 1], G_HAND, [-1.55, 3.3, .2]);
const gram = [
    rest(0), rest(.15),
    one(.65, GRAM_POSE),
    one(1.5, GRAM_POSE),
    rest(GRAM_DURATION),
];
export function createGramAnimation(model) {
    return createDemoClip(model, gram, GRAM_DURATION, [], 0, 'left');
}
