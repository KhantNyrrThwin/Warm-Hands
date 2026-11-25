import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';

export const SALTY_DURATION = 3.0;

const L = REST_LEFT;
const R = REST_RIGHT;

const INDEX_POINT_SHAPE = {
  curl: { thumb: 0.45, index: 0.04, middle: 0.85, ring: 0.88, pinky: 0.9 },
  spread: { index: 0, middle: 0.04, ring: 0.06, pinky: 0.08 },
  thumbOpposition: 0.35,
};

// Mid-lift waypoint at chest height to guide the wrist rotation without a 360° spin
const leftIndexLift = {
  wrist: [-0.24, 3.25, 0.85],
  direction: [0.15, 0.35, 0.92],
  palm: [0.75, -0.1, 0.65],
  elbow: [-1.25, 2.5, 0.25],
  gather: 0.15,
  fingers: { index: 0.0, middle: 0.85, ring: 0.88, pinky: 0.9, thumb: 0.45 },
  handShape: INDEX_POINT_SHAPE,
};

// Left index finger centered at the mouth with palm facing inward
const leftIndexAtMouth = {
  wrist: [0.08, 4.13, 1.0],
  direction: [0.12, 0.96, 0.15],
  palm: [0.25, -0.1, 0.96],
  elbow: [-1.2, 2.9, 0.3],
  gather: 0.15,
  fingers: { index: 0.0, middle: 0.85, ring: 0.88, pinky: 0.9, thumb: 0.45 },
  handShape: INDEX_POINT_SHAPE,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Guided mid-lift through chest height so the wrist rotates cleanly
  { time: 0.52, left: leftIndexLift, right: R },

  // Arrive at the center of the mouth and hold steady
  { time: 0.85, left: leftIndexAtMouth, right: R },
  { time: 2.1, left: leftIndexAtMouth, right: R },

  // Pass back through the mid-lift waypoint on the way down too
  { time: 2.5, left: leftIndexLift, right: R },

  // Lower back to rest
  { time: SALTY_DURATION, left: L, right: R },
];

export function createSaltyAnimation(model) {
  return createSignAnimation(model, poses, SALTY_DURATION, { continuous: true });
}