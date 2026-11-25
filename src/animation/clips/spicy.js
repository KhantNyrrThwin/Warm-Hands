import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const SPICY_DURATION = 2.8;

const L = REST_LEFT;
const R = REST_RIGHT;

const leftWaveApproach = {
  wrist: [-0.58, 3.88, 0.84],
  direction: [0.36, 0.92, -0.15],
  palm: [-0.85, 0, 0.53],
  elbow: [-1.36, 3.16, 0.22],
  gather: 0.28,
  handShape: HAND_SHAPES.open,
};

// Mid-swing waypoint between approach and first inward peak for a smoother lift arc
const leftWaveLiftMid = {
  wrist: [-0.50, 4.10, 0.86],
  direction: [0.38, 0.91, -0.15],
  palm: [-0.94, 0, 0.34],
  elbow: [-1.32, 3.32, 0.23],
  gather: 0.29,
  handShape: HAND_SHAPES.open,
};

const leftWaveIn = {
  wrist: [-0.44, 4.26, 0.88],
  direction: [0.40, 0.90, -0.16],
  palm: [-1, 0, 0],
  elbow: [-1.28, 3.44, 0.24],
  gather: 0.30,
  handShape: HAND_SHAPES.open,
};

// Center pass-through between wave peaks so reversals don't snap
const leftWaveCenter = {
  wrist: [-0.54, 4.28, 0.87],
  direction: [0.37, 0.91, -0.17],
  palm: [-1, 0, 0],
  elbow: [-1.35, 3.46, 0.23],
  gather: 0.30,
  handShape: HAND_SHAPES.open,
};

const leftWaveOut = {
  wrist: [-0.64, 4.30, 0.86],
  direction: [0.34, 0.92, -0.18],
  palm: [-1, 0, 0],
  elbow: [-1.42, 3.48, 0.22],
  gather: 0.30,
  handShape: HAND_SHAPES.open,
};

const leftWaveExit = {
  wrist: [-0.60, 3.68, 0.74],
  direction: [0.34, 0.78, -0.52],
  palm: [-0.85, 0, 0.53],
  elbow: [-1.38, 3.02, 0.18],
  gather: 0.20,
  handShape: HAND_SHAPES.open,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.22, left: L, right: R },
  { time: 0.52, left: leftWaveApproach, right: R },
  { time: 0.74, left: leftWaveLiftMid, right: R },

  // Smooth wave cycle: in -> center -> out -> center -> in -> out
  { time: 0.96, left: leftWaveIn, right: R },
  { time: 1.14, left: leftWaveCenter, right: R },
  { time: 1.34, left: leftWaveOut, right: R },
  { time: 1.52, left: leftWaveCenter, right: R },
  { time: 1.72, left: leftWaveIn, right: R },
  { time: 1.92, left: leftWaveOut, right: R },

  // Ease out cleanly back to rest
  { time: 2.36, left: leftWaveExit, right: R },
  { time: SPICY_DURATION, left: L, right: R },
];

export function createSpicyAnimation(model) {
  return createSignAnimation(model, poses, SPICY_DURATION, { continuous: true });
}