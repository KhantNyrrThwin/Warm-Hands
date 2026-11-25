import { male, palmDown } from './brother';
import { createDemoClip, one, rest } from './shared';
/**
 * ညီ / younger brother : index finger across the upper lip (male), then the
 * flat hand, palm down beside the body, moves DOWN (younger).
 * Signed with the LEFT hand, like the book picture.
 */
export const YOUNGER_BROTHER_DURATION = 3.2;
const youngerBrother = [
    rest(0), rest(.15),
    ...male(.6),
    one(1.9, palmDown(3.3)),
    one(2.1, palmDown(3.3)),
    one(2.45, palmDown(2.85)),
    one(2.7, palmDown(2.85)),
    rest(YOUNGER_BROTHER_DURATION),
];
export function createYoungerBrotherAnimation(model) {
    return createDemoClip(model, youngerBrother, YOUNGER_BROTHER_DURATION, [], 0, 'left');
}
