import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const CHOLERA_DURATION = 2.8;

const L = REST_LEFT;
const R = REST_RIGHT;

const FIST_SHAPE = HAND_SHAPES.fist ?? {
  curl: { thumb: 0.85, index: 0.96, middle: 0.98, ring: 1.0, pinky: 1.0 },
  spread: { thumb: 0.05, index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 },
  thumbOpposition: 0.85,
};

const OPEN_UNCURL_SHAPE = HAND_SHAPES.open ?? {
  curl: { thumb: 0.14, index: 0.06, middle: 0.06, ring: 0.06, pinky: 0.06 },
  spread: { thumb: 0.24, index: 0.16, middle: 0.12, ring: 0.16, pinky: 0.20 },
  thumbOpposition: 0.25,
};

// Right hand: fist rotated 90° in the YZ plane (pointing forward along +Z) with palm facing left
const rightVerticalFist = {
  wrist: [0.16, 3.46, 0.78],
  direction: [0, 0, 1],
  palm: [1, 0, 0],
  elbow: [0.88, 2.82, 0.22],
  gather: 0.28,
  handShape: FIST_SHAPE,
};

// Phase 1: Left horizontal fist lifted slightly to meet right at the base of the right fist
const leftHorizontalFist = {
  wrist: [0.06, 3.30, 0.78],
  direction: [0.20, -0.22, 0.95],
  palm: [0.10, 0.95, 0.29],
  elbow: [-0.94, 2.78, 0.20],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

// Phase 2: Left hand drops downward from the contact point and uncurls its fingers
const leftDropUncurl = {
  wrist: [0.02, 2.78, 0.82],
  direction: [0.16, -0.82, 0.55],
  palm: [0.10, 0.55, 0.83],
  elbow: [-0.96, 2.52, 0.20],
  gather: 0.22,
  handShape: OPEN_UNCURL_SHAPE,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.20, left: L, right: R },

  // Phase 1: Right fist held steady; left horizontal fist meets right at its base
  { time: 0.70, left: leftHorizontalFist, right: rightVerticalFist },
  { time: 1.15, left: leftHorizontalFist, right: rightVerticalFist },

  // Phase 2: Right hand holds steady; left hand drops down and uncurls its fingers
  { time: 1.65, left: leftDropUncurl, right: rightVerticalFist },
  { time: 2.20, left: leftDropUncurl, right: rightVerticalFist },

  // Return to rest
  { time: CHOLERA_DURATION, left: L, right: R },
];

export function createCholeraAnimation(model) {
  return createSignAnimation(model, poses, CHOLERA_DURATION, { continuous: true });
}