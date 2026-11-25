import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const MANY_DURATION = 3.0;

const L = REST_LEFT;
const R = REST_RIGHT;

// Noticeable finger curl for the cupped start pose
const CUPPED_FINGERS = {
  index: 0.65,
  middle: 0.7,
  ring: 0.75,
  pinky: 0.8,
  thumb: 0.45,
};

// Milder curl as the hands open wide
const OPEN_CURVE_FINGERS = {
  index: 0.35,
  middle: 0.4,
  ring: 0.45,
  pinky: 0.5,
  thumb: 0.25,
};

const OPEN_SHAPE = { ...HAND_SHAPES.open };

// Starting pose: hands cupped and closer together, palms facing each other
const startLeft = {
  wrist: [-0.22, 3.12, 0.66],
  direction: [0.0, 0.35, 0.93],
  palm: [-1.0, 0.0, 0.0],
  gather: 0.45,
  fingers: CUPPED_FINGERS,
  handShape: OPEN_SHAPE,
};

const startRight = {
  wrist: [0.22, 3.12, 0.66],
  direction: [0.0, 0.35, 0.93],
  palm: [1.0, 0.0, 0.0],
  gather: 0.45,
  fingers: CUPPED_FINGERS,
  handShape: OPEN_SHAPE,
};

// End/peak gesture pose: wider outward sweep with gently curved fingers
const openLeft = {
  wrist: [-0.72, 3.14, 0.62],
  direction: [-0.15, 0.35, 0.92],
  palm: [-0.85, 0.0, -0.52],
  gather: 0.2,
  fingers: OPEN_CURVE_FINGERS,
  handShape: OPEN_SHAPE,
};

const openRight = {
  wrist: [0.72, 3.14, 0.62],
  direction: [0.15, 0.35, 0.92],
  palm: [0.85, 0.0, -0.52],
  gather: 0.2,
  fingers: OPEN_CURVE_FINGERS,
  handShape: OPEN_SHAPE,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Bring both hands up with palms facing each other, cupped fingers
  { time: 0.75, left: startLeft, right: startRight },
  { time: 1.05, left: startLeft, right: startRight },

  // Move wider outward while partially uncurling the fingers
  { time: 1.75, left: openLeft, right: openRight },
  { time: 2.25, left: openLeft, right: openRight },

  // Return to rest
  { time: MANY_DURATION, left: L, right: R },
];

export function createManyAnimation(model) {
  return createSignAnimation(model, poses, MANY_DURATION, { continuous: true });
}