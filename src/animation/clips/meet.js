import { arm, both, createDemoClip, POINT, rest } from './shared';
/**
 * တွေ့ / meet : both index fingers stand up apart in front of the chest,
 * palms facing each other, and move together until they meet.
 * Signed with the LEFT hand leading, like the book picture.
 */
export const MEET_DURATION = 2.4;
const APART = arm([-.6, 3.3, .7], [0, 1, .05], [1, 0, 0], POINT, [-1.35, 2.8, .2]);
const TOGETHER = arm([-.06, 3.3, .75], [0, 1, .05], [1, 0, 0], POINT, [-1.2, 2.8, .25]);
const meet = [
    rest(0), rest(.15),
    both(.6, APART),
    both(.85, APART),
    both(1.35, TOGETHER),
    both(1.75, TOGETHER),
    rest(MEET_DURATION),
];
export function createMeetAnimation(model) {
    return createDemoClip(model, meet, MEET_DURATION, [], 0, 'left');
}
