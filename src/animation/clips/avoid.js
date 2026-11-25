import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const AVOID_DURATION = 3.0;

const L = REST_LEFT;
const R = REST_RIGHT;

// 1. Top-left corner of the 'Z'
const zTopLeft = {
  wrist: [-0.78, 3.55, 0.58],
  direction: [-0.08, 0.98, 0.16],
  palm: [0.05, 0.08, -0.99],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

// 2. Top-right corner of the 'Z'
const zTopRight = {
  wrist: [-0.35, 3.55, 0.58],
  direction: [0.05, 0.98, 0.16],
  palm: [-0.05, 0.08, -0.99],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

// 3. Bottom-left corner of the 'Z' (diagonal down-left)
const zBottomLeft = {
  wrist: [-0.75, 3.22, 0.62],
  direction: [-0.08, 0.96, 0.25],
  palm: [0.05, 0.10, -0.99],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

// 4. Bottom-right corner of the 'Z'
const zBottomRight = {
  wrist: [-0.32, 3.22, 0.62],
  direction: [0.05, 0.96, 0.25],
  palm: [-0.05, 0.10, -0.99],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Trace the 'Z' motion
  { time: 0.65, left: zTopLeft, right: R },
  { time: 1.05, left: zTopRight, right: R },
  { time: 1.50, left: zBottomLeft, right: R },
  { time: 1.95, left: zBottomRight, right: R },
  { time: 2.20, left: zBottomRight, right: R },

  // Return to rest
  { time: AVOID_DURATION, left: L, right: R },
];

export function createAvoidAnimation(model) {
  return createSignAnimation(model, poses, AVOID_DURATION, { continuous: true });
}