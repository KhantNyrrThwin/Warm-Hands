import { createDemoClip, rest } from './shared';
import { WATCH_ARM, WATCH_ARM_IN, WATCH_IN, WATCH_TOUCH } from './watch';
/**
 * နာရီ / hour, clock : fingertips are placed on the back of the other wrist,
 * where a watch is worn, and held there (time taps instead).
 * Signed with the LEFT hand, like the book picture.
 */
export const HOUR_DURATION = 2.6;
const hour = [
    rest(0), rest(.15),
    { time: .55, left: WATCH_IN, right: WATCH_ARM_IN },
    { time: .9, left: WATCH_TOUCH, right: WATCH_ARM },
    { time: 1.85, left: WATCH_TOUCH, right: WATCH_ARM },
    rest(HOUR_DURATION),
];
export function createHourAnimation(model) {
    return createDemoClip(model, hour, HOUR_DURATION, [], 0, 'left');
}
