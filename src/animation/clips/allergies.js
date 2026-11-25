import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const ALLERGIES_DURATION = 3.2;

const L = REST_LEFT;
const R = REST_RIGHT;

// 1. Index fingers meet along a diagonal on the character's right side (+X)
const leftPointTouch = {
  wrist: [0.05, 3.55, 0.65],
  direction: [0.75, -0.55, 0.35],
  palm: [-0.35, 0.25, 0.90],
  gather: 0,
  handShape: HAND_SHAPES.point,
};

const rightPointTouch = {
  wrist: [0.85, 2.95, 0.65],
  direction: [-0.75, 0.55, 0.35],
  palm: [0, -0.45, 0.90],
  gather: 0,
  handShape: HAND_SHAPES.point,
};

// 2. Index fingers separate slightly along the diagonal
const leftPointApart = {
  wrist: [-0.10, 3.68, 0.62],
  direction: [0.75, -0.55, 0.35],
  palm: [-0.35, 0.25, 0.90],
  gather: 0,
  handShape: HAND_SHAPES.point,
};

const rightPointApart = {
  wrist: [1.05, 2.80, 0.62],
  direction: [-0.75, 0.55, 0.35],
  palm: [0, -0.45, 0.90],
  gather: 0,
  handShape: HAND_SHAPES.point,
};

// 3. Arms further apart and fingers splayed wide (gather: 0) while shaking[cite: 2]
const leftShakeA = {
  wrist: [0.08, 3.55, 0.68],
  direction: [0.22, 0.88, 0.42],
  palm: [-0.84, 0.22, -0.50],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

const leftShakeB = {
  wrist: [0.08, 3.55, 0.68],
  direction: [0.22, 0.88, 0.42],
  palm: [-0.92, -0.14, -0.37],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

const rightShakeA = {
  wrist: [0.98, 2.75, 0.62],
  direction: [-0.18, 0.90, 0.40],
  palm: [0.84, 0.22, -0.50],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

const rightShakeB = {
  wrist: [0.98, 2.75, 0.62],
  direction: [-0.18, 0.90, 0.40],
  palm: [0.92, -0.14, -0.37],
  gather: 0,
  handShape: HAND_SHAPES.open,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Index fingers touch
  { time: 0.75, left: leftPointTouch, right: rightPointTouch },
  { time: 0.95, left: leftPointTouch, right: rightPointTouch },

  // Index fingers pull apart slightly
  { time: 1.30, left: leftPointApart, right: rightPointApart },

  // Arms wider apart and fingers splayed wide while shaking[cite: 2]
  { time: 1.55, left: leftShakeA, right: rightShakeA },
  { time: 1.72, left: leftShakeB, right: rightShakeB },
  { time: 1.89, left: leftShakeA, right: rightShakeA },
  { time: 2.06, left: leftShakeB, right: rightShakeB },
  { time: 2.23, left: leftShakeA, right: rightShakeA },
  { time: 2.40, left: leftShakeB, right: rightShakeB },

  { time: ALLERGIES_DURATION, left: L, right: R },
];

export function createAllergiesAnimation(model) {
  return createSignAnimation(model, poses, ALLERGIES_DURATION, { continuous: true });
}