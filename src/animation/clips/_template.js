import { createSignAnimation, REST_LEFT, REST_RIGHT, } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';
export const PLACEHOLDER_DURATION = 3.0;
const L = REST_LEFT;
const R = REST_RIGHT;
/** Example: open right hand raised in front of the chest. Change this. */
const raised = {
    wrist: [0.55, 3.20, 0.55],
    direction: [0, 0.95, 0.20],
    palm: [0, 0, -1],
    gather: 0,
    handShape: HAND_SHAPES.open,
};
const poses = [
    { time: 0, left: L, right: R },
    { time: 0.2, left: L, right: R },
    { time: 0.8, left: L, right: raised },
    { time: 2.2, left: L, right: raised },
    { time: PLACEHOLDER_DURATION, left: L, right: R },
];
export function createPlaceholderAnimation(model) {
    return createSignAnimation(model, poses, PLACEHOLDER_DURATION, { continuous: true });
}
