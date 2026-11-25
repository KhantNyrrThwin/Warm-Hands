import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const LUNGS_DURATION = 3.2;

const L = REST_LEFT;
const R = REST_RIGHT;

// Softly cupped hand shape with fingers slightly curved and together
const CUPPED_SHAPE = HAND_SHAPES.cup ?? {
  curl: { thumb: 0.35, index: 0.38, middle: 0.42, ring: 0.45, pinky: 0.48 },
  spread: { index: -0.03, middle: 0.0, ring: 0.03, pinky: 0.06 },
  thumbOpposition: 0.35,
};

// Left hand approach waypoint further out to -X, keeping exact hand/palm/thumb orientation
const leftApproach = {
  wrist: [-0.76, 3.30, 0.78],
  direction: [0.86, 0.12, 0.49],
  palm: [0.38, 0.08, 0.92],
  elbow: [-1.52, 2.75, 0.18],
  gather: 0.25,
  fingers: { thumb: 0.35, index: 0.38, middle: 0.42, ring: 0.45, pinky: 0.48 },
  handShape: CUPPED_SHAPE,
};

// Left hand near upper chest, wider apart along -X
const leftUpperChest = {
  wrist: [-0.62, 3.58, 0.72],
  direction: [0.92, 0.08, 0.38],
  palm: [0.32, 0.08, 0.94],
  elbow: [-1.42, 2.95, 0.16],
  gather: 0.30,
  fingers: { thumb: 0.35, index: 0.38, middle: 0.42, ring: 0.45, pinky: 0.48 },
  handShape: CUPPED_SHAPE,
};

// Left hand lowered down the chest, wider apart along -X
const leftLowerChest = {
  wrist: [-0.64, 3.16, 0.74],
  direction: [0.91, 0.10, 0.40],
  palm: [0.32, 0.10, 0.94],
  elbow: [-1.44, 2.62, 0.18],
  gather: 0.30,
  fingers: { thumb: 0.35, index: 0.38, middle: 0.42, ring: 0.45, pinky: 0.48 },
  handShape: CUPPED_SHAPE,
};

// Right hand poses further out to +X, keeping exact hand/palm/thumb orientation
const rightApproach = {
  wrist: [0.76, 3.30, 0.78],
  direction: [-0.86, 0.12, 0.49],
  palm: [-0.38, 0.08, 0.92],
  elbow: [1.52, 2.75, 0.18],
  gather: 0.25,
  fingers: { thumb: 0.35, index: 0.38, middle: 0.42, ring: 0.45, pinky: 0.48 },
  handShape: CUPPED_SHAPE,
};

const rightUpperChest = {
  wrist: [0.62, 3.58, 0.72],
  direction: [-0.92, 0.08, 0.38],
  palm: [-0.32, 0.08, 0.94],
  elbow: [1.42, 2.95, 0.16],
  gather: 0.30,
  fingers: { thumb: 0.35, index: 0.38, middle: 0.42, ring: 0.45, pinky: 0.48 },
  handShape: CUPPED_SHAPE,
};

const rightLowerChest = {
  wrist: [0.64, 3.16, 0.74],
  direction: [-0.91, 0.10, 0.40],
  palm: [-0.32, 0.10, 0.94],
  elbow: [1.44, 2.62, 0.18],
  gather: 0.30,
  fingers: { thumb: 0.35, index: 0.38, middle: 0.42, ring: 0.45, pinky: 0.48 },
  handShape: CUPPED_SHAPE,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Bring both hands up and inward toward the upper chest
  { time: 0.65, left: leftApproach, right: rightApproach },
  { time: 1.05, left: leftUpperChest, right: rightUpperChest },
  { time: 1.25, left: leftUpperChest, right: rightUpperChest },

  // Lower both cupped hands smoothly down along the chest
  { time: 2.00, left: leftLowerChest, right: rightLowerChest },
  { time: 2.25, left: leftLowerChest, right: rightLowerChest },

  // Return through approach and lower back to rest
  { time: 2.65, left: leftApproach, right: rightApproach },
  { time: LUNGS_DURATION, left: L, right: R },
];

export function createLungsAnimation(model) {
  return createSignAnimation(model, poses, LUNGS_DURATION, { continuous: true });
}