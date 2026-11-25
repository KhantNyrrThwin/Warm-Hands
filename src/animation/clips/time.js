import { createDemoClip, rest } from './shared';
import { WATCH_ARM, WATCH_ARM_IN, WATCH_IN, WATCH_LIFT, WATCH_TOUCH } from './watch';
/**
 * အချိန် / time : fingertips tap twice on the back of the other wrist,
 * where a watch is worn. Signed with the LEFT hand, like the book picture.
 */
export const TIME_DURATION = 2.8;
const time = [
    rest(0), rest(.15),
    { time: .55, left: WATCH_IN, right: WATCH_ARM_IN },
    { time: .85, left: WATCH_TOUCH, right: WATCH_ARM },
    { time: 1.1, left: WATCH_LIFT, right: WATCH_ARM },
    { time: 1.35, left: WATCH_TOUCH, right: WATCH_ARM },
    { time: 1.6, left: WATCH_LIFT, right: WATCH_ARM },
    { time: 1.85, left: WATCH_TOUCH, right: WATCH_ARM },
    { time: 2.1, left: WATCH_TOUCH, right: WATCH_ARM },
    rest(TIME_DURATION),
];
export function createTimeAnimation(model) {
    return createDemoClip(model, time, TIME_DURATION, [], 0, 'left');
}
