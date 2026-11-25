import { male, palmDown } from './brother';
import { createDemoClip, one, rest } from './shared';
/**
 * အစ်ကို / older brother : same as ညီ (younger brother), but in the second
 * part the flat hand, palm down, moves UP (older).
 * Signed with the LEFT hand, like the book picture.
 */
export const OLDER_BROTHER_DURATION = 3.2;
const olderBrother = [
    rest(0), rest(.15),
    ...male(.6),
    one(1.9, palmDown(3.7)),
    one(2.1, palmDown(3.7)),
    one(2.45, palmDown(4.35)),
    one(2.7, palmDown(4.35)),
    rest(OLDER_BROTHER_DURATION),
];
export function createOlderBrotherAnimation(model) {
    return createDemoClip(model, olderBrother, OLDER_BROTHER_DURATION, [], 0, 'left');
}
