import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const DISEASE_DURATION = 3.2;

const L = REST_LEFT;
const R = REST_RIGHT;

const POINT_SHAPE = HAND_SHAPES.point ?? {
  curl: { thumb: 0.72, index: 0.0, middle: 0.96, ring: 0.98, pinky: 1.0 },
  spread: { thumb: 0.0, index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 },
  thumbOpposition: 0.65,
};

// Index finger hooks/curls at the end of the staircase path while other fingers stay closed
const HOOKED_INDEX_SHAPE = {
  curl: {
    thumb: 0.78,
    index: [0.22, 0.52, 0.48],
    middle: 0.96,
    ring: 0.98,
    pinky: 1.0,
  },
  spread: { thumb: 0.0, index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 },
  thumbOpposition: 0.70,
};

// Shared hand orientation: left index pointing toward top-right (+X, +Y) with palm facing right (+X)
const basePointOrientation = {
  direction: [0.68, 0.72, -0.14],
  palm: [-0.72, 0.68, 0.0],
  gather: 0.22,
};

// Step 0: Start at base point (-0.62, 2.86, 0.60)
const step0Start = {
  ...basePointOrientation,
  wrist: [-0.62, 2.86, 0.60],
  elbow: [-1.24, 2.42, 0.16],
  handShape: POINT_SHAPE,
};

// Step 1: Step right (+0.18 in X)
const step1Right = {
  ...basePointOrientation,
  wrist: [-0.44, 2.86, 0.61],
  elbow: [-1.16, 2.42, 0.17],
  handShape: POINT_SHAPE,
};

// Step 2: Step up (+0.20 in Y)
const step2Up = {
  ...basePointOrientation,
  wrist: [-0.44, 3.06, 0.61],
  elbow: [-1.16, 2.56, 0.17],
  handShape: POINT_SHAPE,
};

// Step 3: Step right (+0.18 in X)
const step3Right = {
  ...basePointOrientation,
  wrist: [-0.26, 3.06, 0.62],
  elbow: [-1.06, 2.56, 0.18],
  handShape: POINT_SHAPE,
};

// Step 4: Step up (+0.20 in Y)
const step4Up = {
  ...basePointOrientation,
  wrist: [-0.26, 3.26, 0.62],
  elbow: [-1.06, 2.70, 0.18],
  handShape: POINT_SHAPE,
};

// Step 5: Step right (+0.18 in X) to finish
const step5Right = {
  ...basePointOrientation,
  wrist: [-0.08, 3.26, 0.62],
  elbow: [-0.96, 2.70, 0.18],
  handShape: POINT_SHAPE,
};

// Step 6: Hold at final position and curl the pointed index finger
const step6Curl = {
  ...basePointOrientation,
  wrist: [-0.08, 3.26, 0.62],
  elbow: [-0.96, 2.70, 0.18],
  handShape: HOOKED_INDEX_SHAPE,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.20, left: L, right: R },

  // Start at base point
  { time: 0.55, left: step0Start, right: R },

  // Staircase steps: right -> up -> right -> up -> right
  { time: 0.85, left: step1Right, right: R },
  { time: 1.15, left: step2Up, right: R },
  { time: 1.45, left: step3Right, right: R },
  { time: 1.75, left: step4Up, right: R },
  { time: 2.05, left: step5Right, right: R },

  // Final index curl
  { time: 2.35, left: step6Curl, right: R },
  { time: 2.75, left: step6Curl, right: R },

  // Return to rest
  { time: DISEASE_DURATION, left: L, right: R },
];

export function createDiseaseAnimation(model) {
  return createSignAnimation(model, poses, DISEASE_DURATION, { continuous: true });
}