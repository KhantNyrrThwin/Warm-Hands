import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';

export const HEART_DURATION = 3.2;

const L = REST_LEFT;
const R = REST_RIGHT;

// Loose cup shape for the open beat
const HEART_CUP_OPEN = {
  curl: { thumb: 0.35, index: 0.40, middle: 0.45, ring: 0.45, pinky: 0.45 },
  spread: { index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.05 },
  thumbOpposition: 0.45,
};

// Tighter squeeze/pump shape for the flexed beat
const HEART_CUP_FLEXED = {
  curl: { thumb: 0.55, index: 0.65, middle: 0.70, ring: 0.72, pinky: 0.72 },
  spread: { index: 0.03, middle: 0.03, ring: 0.03, pinky: 0.03 },
  thumbOpposition: 0.55,
};

// Natural waypoint guiding the arm up and across while rotating the palm upward
const leftHeartLift = {
  wrist: [-0.02, 2.95, 0.85],
  direction: [0.42, 0.25, 0.87],
  palm: [0.45, -0.82, 0.35],
  elbow: [-1.04, 2.40, 0.18],
  gather: 0.05,
  fingers: { index: 0.40, middle: 0.45, ring: 0.45, pinky: 0.45, thumb: 0.35 },
  handShape: HEART_CUP_OPEN,
};

// Cupped left hand at [0.24, 3.34, 0.82] with palm facing upward
const leftHeartBaseOpen = {
  wrist: [0.24, 3.34, 0.82],
  direction: [0.42, 0.32, 0.85],
  palm: [0.15, -0.92, 0.36],
  elbow: [-0.96, 2.48, 0.26],
  gather: 0.05,
  fingers: { index: 0.40, middle: 0.45, ring: 0.45, pinky: 0.45, thumb: 0.35 },
  handShape: HEART_CUP_OPEN,
};

// Identical arm/wrist position with flexed fingers for the pumping beat
const leftHeartBaseFlexed = {
  ...leftHeartBaseOpen,
  fingers: { index: 0.65, middle: 0.70, ring: 0.72, pinky: 0.72, thumb: 0.55 },
  handShape: HEART_CUP_FLEXED,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Smooth lift up and across
  { time: 0.52, left: leftHeartLift, right: R },

  // Hold open cup shape
  { time: 0.85, left: leftHeartBaseOpen, right: R },

  // PUMP 1
  { time: 1.15, left: leftHeartBaseFlexed, right: R },
  { time: 1.35, left: leftHeartBaseFlexed, right: R },
  { time: 1.65, left: leftHeartBaseOpen, right: R },
  { time: 1.85, left: leftHeartBaseOpen, right: R },

  // PUMP 2
  { time: 2.15, left: leftHeartBaseFlexed, right: R },
  { time: 2.35, left: leftHeartBaseFlexed, right: R },
  { time: 2.65, left: leftHeartBaseOpen, right: R },

  // Lower back through lift waypoint to rest
  { time: 2.92, left: leftHeartLift, right: R },
  { time: HEART_DURATION, left: L, right: R },
];

export function createHeartAnimation(model) {
  return createSignAnimation(model, poses, HEART_DURATION, { continuous: true });
}