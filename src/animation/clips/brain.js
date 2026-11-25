import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const BRAIN_DURATION = 3.4;

const L = REST_LEFT;
const R = REST_RIGHT;

// Extended index finger with curled middle/ring/pinky for pointing
const POINT_SHAPE = HAND_SHAPES.point ?? {
  curl: { thumb: 0.45, index: 0.02, middle: 0.88, ring: 0.90, pinky: 0.92 },
  spread: { index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 },
  thumbOpposition: 0.45,
};

// Rounded cupped shape with lower, less-tucked thumbs as if cradling/shaping a brain
const BRAIN_CUP_SHAPE = {
  curl: { thumb: 0.55, index: 0.44, middle: 0.48, ring: 0.50, pinky: 0.52 },
  spread: { index: -0.02, middle: 0.0, ring: 0.02, pinky: 0.04 },
  thumbOpposition: 0.15,
};

// Step 1a: Lift left hand further out to the left on approach toward the head
const leftHeadApproach = {
  wrist: [-0.92, 4.10, 0.72],
  direction: [0.34, 0.90, -0.27],
  palm: [0.35, 0.12, 0.93],
  elbow: [-1.52, 3.40, 0.22],
  gather: 0.05,
  fingers: { index: 0.02, middle: 0.86, ring: 0.88, pinky: 0.90, thumb: 0.45 },
  handShape: POINT_SHAPE,
};

// Step 1b: Point left index finger further left toward the head
const leftPointHead = {
  wrist: [-0.88, 4.56, 0.68],
  direction: [0.44, 0.85, -0.28],
  palm: [0.28, 0.16, 0.95],
  elbow: [-1.48, 3.72, 0.24],
  gather: 0.05,
  fingers: { index: 0.02, middle: 0.88, ring: 0.90, pinky: 0.92, thumb: 0.45 },
  handShape: POINT_SHAPE,
};

// Step 2a: Mid-transition waypoint as both hands move down and inward toward the chest
const leftChestApproach = {
  wrist: [-0.46, 3.56, 0.82],
  direction: [0.18, 0.92, 0.35],
  palm: [-0.88, 0.14, 0.45],
  elbow: [-1.16, 2.86, 0.24],
  gather: 0.26,
  fingers: { thumb: 0.16, index: 0.44, middle: 0.48, ring: 0.50, pinky: 0.52 },
  handShape: BRAIN_CUP_SHAPE,
};

const rightChestApproach = {
  wrist: [0.46, 3.56, 0.82],
  direction: [-0.18, 0.92, 0.35],
  palm: [0.88, 0.14, 0.45],
  elbow: [1.16, 2.86, 0.24],
  gather: 0.26,
  fingers: { thumb: 0.16, index: 0.44, middle: 0.48, ring: 0.50, pinky: 0.52 },
  handShape: BRAIN_CUP_SHAPE,
};

// Step 2b: Both hands slightly separated in front of the chest, cupped inward with lower thumbs
const leftCupChest = {
  wrist: [-0.31, 3.44, 0.86],
  direction: [0.10, 0.95, 0.29],
  palm: [-0.94, 0.18, 0.29],
  elbow: [-1.04, 2.74, 0.26],
  gather: 0.32,
  fingers: { thumb: 0.16, index: 0.44, middle: 0.48, ring: 0.50, pinky: 0.52 },
  handShape: BRAIN_CUP_SHAPE,
};

const rightCupChest = {
  wrist: [0.31, 3.44, 0.86],
  direction: [-0.10, 0.95, 0.29],
  palm: [0.94, 0.18, 0.29],
  elbow: [1.04, 2.74, 0.26],
  gather: 0.32,
  fingers: { thumb: 0.16, index: 0.44, middle: 0.48, ring: 0.50, pinky: 0.52 },
  handShape: BRAIN_CUP_SHAPE,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // 1. Left hand rises and points at the head
  { time: 0.65, left: leftHeadApproach, right: R },
  { time: 1.00, left: leftPointHead, right: R },
  { time: 1.35, left: leftPointHead, right: R },

  // 2. Both hands come together in front of the chest to cup each other
  { time: 1.85, left: leftChestApproach, right: rightChestApproach },
  { time: 2.25, left: leftCupChest, right: rightCupChest },
  { time: 2.65, left: leftCupChest, right: rightCupChest },

  // Return to rest
  { time: BRAIN_DURATION, left: L, right: R },
];

export function createBrainAnimation(model) {
  return createSignAnimation(model, poses, BRAIN_DURATION, { continuous: true });
}