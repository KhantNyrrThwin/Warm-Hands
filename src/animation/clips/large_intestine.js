import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const LARGE_INTESTINE_DURATION = 3.6;

const L = REST_LEFT;
const R = REST_RIGHT;

// Closed fist shape for both hands
const FIST_SHAPE = HAND_SHAPES.fist ?? {
  curl: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  spread: { index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 },
  thumbOpposition: 0.65,
};

// Soft entry waypoint so lifting from rest into center doesn't snap
const leftCenterApproach = {
  wrist: [-0.34, 2.72, 0.78],
  direction: [0.20, -0.22, 0.95],
  palm: [0.10, 0.95, 0.29],
  elbow: [-1.10, 2.46, 0.20],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

const rightCenterApproach = {
  wrist: [0.34, 2.72, 0.78],
  direction: [-0.20, -0.22, 0.95],
  palm: [-0.10, 0.95, 0.29],
  elbow: [1.10, 2.46, 0.20],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

// 1. Fists downward together at the lower-center abdomen
const leftDownTogether = {
  wrist: [-0.22, 2.78, 0.80],
  direction: [0.24, -0.18, 0.95],
  palm: [0.08, 0.96, 0.27],
  elbow: [-1.02, 2.52, 0.22],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

const rightDownTogether = {
  wrist: [0.22, 2.78, 0.80],
  direction: [-0.24, -0.18, 0.95],
  palm: [-0.08, 0.96, 0.27],
  elbow: [1.02, 2.52, 0.22],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

// Mid-roll: Fists turn sideways as they move apart
const leftRollOut = {
  wrist: [-0.46, 2.82, 0.82],
  direction: [0.16, -0.17, 0.97],
  palm: [-0.95, 0.0, 0.31],
  elbow: [-1.20, 2.54, 0.21],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

const rightRollOut = {
  wrist: [0.46, 2.82, 0.82],
  direction: [-0.16, -0.17, 0.97],
  palm: [0.95, 0.0, 0.31],
  elbow: [1.20, 2.54, 0.21],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

// 2. Fists moved wider apart and turned upward
const leftApartUp = {
  wrist: [-0.74, 2.86, 0.82],
  direction: [0.08, -0.16, 0.98],
  palm: [-0.14, -0.92, 0.37],
  elbow: [-1.40, 2.56, 0.20],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

const rightApartUp = {
  wrist: [0.74, 2.86, 0.82],
  direction: [-0.08, -0.16, 0.98],
  palm: [0.14, -0.92, 0.37],
  elbow: [1.40, 2.56, 0.20],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

// 3. Fists move back closer (not together), facing upward at the end position
const leftCloserUp = {
  wrist: [-0.62, 2.86, 0.82],
  direction: [0.12, -0.16, 0.98],
  palm: [-0.14, -0.92, 0.37],
  elbow: [-1.32, 2.56, 0.20],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

const rightCloserUp = {
  wrist: [0.62, 2.86, 0.82],
  direction: [-0.12, -0.16, 0.98],
  palm: [0.14, -0.92, 0.37],
  elbow: [1.32, 2.56, 0.20],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

// Mid-roll exit: Smoothly pronates wrists back as hands lower to rest
const leftExit = {
  wrist: [-0.52, 2.56, 0.68],
  direction: [0.08, -0.32, 0.94],
  palm: [-0.90, 0.22, 0.38],
  elbow: [-1.24, 2.38, 0.16],
  gather: 0.20,
  fingers: { thumb: 0.55, index: 0.65, middle: 0.68, ring: 0.70, pinky: 0.72 },
  handShape: FIST_SHAPE,
};

const rightExit = {
  wrist: [0.52, 2.56, 0.68],
  direction: [-0.08, -0.32, 0.94],
  palm: [0.90, 0.22, 0.38],
  elbow: [1.24, 2.38, 0.16],
  gather: 0.20,
  fingers: { thumb: 0.55, index: 0.65, middle: 0.68, ring: 0.70, pinky: 0.72 },
  handShape: FIST_SHAPE,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // 1. Fists downward together
  { time: 0.55, left: leftCenterApproach, right: rightCenterApproach },
  { time: 0.90, left: leftDownTogether, right: rightDownTogether },

  // 2. Fists turn outward as they move apart
  { time: 1.32, left: leftRollOut, right: rightRollOut },
  { time: 1.75, left: leftApartUp, right: rightApartUp },

  // 3. Fists move back closer (not together), facing up
  { time: 2.25, left: leftCloserUp, right: rightCloserUp },
  { time: 2.65, left: leftCloserUp, right: rightCloserUp },

  // Ease smoothly back to rest
  { time: 3.12, left: leftExit, right: rightExit },
  { time: LARGE_INTESTINE_DURATION, left: L, right: R },
];

export function createLargeIntestineAnimation(model) {
  return createSignAnimation(model, poses, LARGE_INTESTINE_DURATION, { continuous: true });
}