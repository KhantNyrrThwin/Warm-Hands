import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const WEIGHT_DURATION = 2.8;

const L = REST_LEFT;
const R = REST_RIGHT;

const FIST_SHAPE = HAND_SHAPES.fist ?? {
  curl: { thumb: 0.75, index: 0.96, middle: 0.98, ring: 1.0, pinky: 1.0 },
  spread: { index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 },
  thumbOpposition: 0.65,
};

// Left hand: stationary fist once raised, facing right (-X)
const leftFistApproach = {
  wrist: [-0.46, 3.36, 0.72],
  direction: [0.22, 0.86, -0.46],
  palm: [-0.85, 0, 0.53],
  elbow: [-1.18, 2.86, 0.18],
  gather: 0.25,
  handShape: FIST_SHAPE,
};

const leftFistHold = {
  wrist: [-0.36, 3.68, 0.82],
  direction: [0.26, 0.84, -0.48],
  palm: [-1, 0, 0],
  elbow: [-1.14, 3.08, 0.20],
  gather: 0.30,
  handShape: FIST_SHAPE,
};

// Right hand: stationary open hand once raised, palm facing downward (-Y)
const rightPalmDownApproach = {
  wrist: [0.46, 3.16, 0.72],
  direction: [0.12, -0.22, 0.97],
  palm: [0, -0.78, -0.62],
  elbow: [1.16, 2.74, 0.18],
  gather: 0.25,
  handShape: HAND_SHAPES.open,
};

const rightPalmDownHold = {
  wrist: [0.38, 3.42, 0.84],
  direction: [0.10, -0.16, 0.98],
  palm: [0, -1, 0],
  elbow: [1.12, 2.94, 0.22],
  gather: 0.30,
  handShape: HAND_SHAPES.open,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.20, left: L, right: R },
  { time: 0.65, left: leftFistApproach, right: rightPalmDownApproach },
  { time: 1.05, left: leftFistHold, right: rightPalmDownHold },
  { time: 2.05, left: leftFistHold, right: rightPalmDownHold },
  { time: 2.45, left: leftFistApproach, right: rightPalmDownApproach },
  { time: WEIGHT_DURATION, left: L, right: R },
];

export function createWeightAnimation(model) {
  return createSignAnimation(model, poses, WEIGHT_DURATION, { continuous: true });
}