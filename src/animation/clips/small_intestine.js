import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const SMALL_INTESTINE_DURATION = 3.4;

const L = REST_LEFT;
const R = REST_RIGHT;

// Closed fist shape for both hands
const FIST_SHAPE = HAND_SHAPES.fist ?? {
  curl: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  spread: { index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 },
  thumbOpposition: 0.65,
};

// Right fist holds steady at the lower-center abdomen with clearance from the left fist
const rightHoldCenter = {
  wrist: [0.22, 2.78, 0.80],
  direction: [-0.24, -0.18, 0.95],
  palm: [-0.08, 0.96, 0.27],
  elbow: [1.02, 2.52, 0.22],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
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

// Step 1: Left fist meets right fist at the lower-center abdomen without overlapping
const leftTogetherDown = {
  wrist: [-0.22, 2.78, 0.80],
  direction: [0.24, -0.18, 0.95],
  palm: [0.08, 0.96, 0.27],
  elbow: [-1.02, 2.52, 0.22],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

// Mid-roll waypoint 1: Smoothly guides the 180° wrist supination through side-facing
const leftRollUp = {
  wrist: [-0.34, 2.72, 0.83],
  direction: [0.18, -0.20, 0.96],
  palm: [-0.95, 0.0, 0.31],
  elbow: [-1.10, 2.48, 0.21],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

// Step 2: Left fist moves apart (-X) and faces upward (supinated)
const leftMidUp = {
  wrist: [-0.46, 2.66, 0.82],
  direction: [0.12, -0.22, 0.97],
  palm: [-0.12, -0.96, -0.25],
  elbow: [-1.18, 2.44, 0.20],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

// Mid-roll waypoint 2: Smoothly guides the 180° wrist pronation back through side-facing
const leftRollDown = {
  wrist: [-0.61, 2.60, 0.81],
  direction: [0.02, -0.23, 0.97],
  palm: [-0.95, 0.0, 0.31],
  elbow: [-1.30, 2.41, 0.19],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

// Step 3: Left fist moves further apart (-X) and faces downward (pronated)
const leftFarDown = {
  wrist: [-0.76, 2.54, 0.78],
  direction: [-0.08, -0.24, 0.97],
  palm: [0.10, 0.96, 0.26],
  elbow: [-1.42, 2.38, 0.18],
  gather: 0.25,
  fingers: { thumb: 0.78, index: 0.92, middle: 0.94, ring: 0.95, pinky: 0.96 },
  handShape: FIST_SHAPE,
};

// Soft exit waypoint so lowering back to rest eases out cleanly
const leftFarExit = {
  wrist: [-0.68, 2.44, 0.66],
  direction: [-0.10, -0.35, 0.93],
  palm: [0.14, 0.93, 0.34],
  elbow: [-1.36, 2.32, 0.14],
  gather: 0.20,
  fingers: { thumb: 0.60, index: 0.70, middle: 0.72, ring: 0.74, pinky: 0.76 },
  handShape: FIST_SHAPE,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.18, left: L, right: R },

  // Ease into center so both fists come together cleanly without overlapping
  { time: 0.52, left: leftCenterApproach, right: rightHoldCenter },
  { time: 0.85, left: leftTogetherDown, right: rightHoldCenter },

  // Flow continuously through mid-roll into the palm-up position
  { time: 1.25, left: leftRollUp, right: rightHoldCenter },
  { time: 1.65, left: leftMidUp, right: rightHoldCenter },

  // Flow continuously through mid-roll into the far palm-down position
  { time: 2.05, left: leftRollDown, right: rightHoldCenter },
  { time: 2.50, left: leftFarDown, right: rightHoldCenter },

  // Ease smoothly back to rest
  { time: 2.88, left: leftFarExit, right: rightHoldCenter },
  { time: SMALL_INTESTINE_DURATION, left: L, right: R },
];

export function createSmallIntestineAnimation(model) {
  return createSignAnimation(model, poses, SMALL_INTESTINE_DURATION, { continuous: true });
}