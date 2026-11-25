import { Bone, PropertyBinding, Quaternion, Vector3 } from 'three';
import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const THROAT_DURATION = 3.2;

// Turn head slightly to the avatar's left (-X side) to expose the throat
const HEAD_TURN_LEFT = -0.34;

const L = REST_LEFT;
const R = REST_RIGHT;

const normalizeKey = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

function findRigNode(model, candidates) {
  for (const rawName of candidates) {
    const sanitized = PropertyBinding.sanitizeNodeName(rawName);
    const targetNorm = normalizeKey(rawName);
    let found = null;

    model.traverse((obj) => {
      if (found) return;
      if (obj.name === rawName || obj.name === sanitized) {
        found = obj;
        return;
      }
      if (obj instanceof Bone && normalizeKey(obj.name) === targetNorm) {
        found = obj;
      }
    });

    if (found) return found;
  }
  return null;
}

const smoothstep01 = (x) => {
  const u = Math.max(0, Math.min(1, x));
  return u * u * (3 - 2 * u);
};

// Smoothly turn the head left as the hand rises, hold during the slide, then return
function headTurnWeight(seconds) {
  if (seconds <= 0.2 || seconds >= THROAT_DURATION - 0.2) return 0;
  if (seconds < 0.85) {
    return smoothstep01((seconds - 0.2) / (0.85 - 0.2));
  }
  if (seconds > 2.25) {
    return 1 - smoothstep01((seconds - 2.25) / (THROAT_DURATION - 0.2 - 2.25));
  }
  return 1;
}

// Extended index finger with curled middle/ring/pinky for pointing
const POINT_SHAPE = HAND_SHAPES.point ?? {
  curl: { thumb: 0.45, index: 0.02, middle: 0.88, ring: 0.90, pinky: 0.92 },
  spread: { index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 },
  thumbOpposition: 0.45,
};

// Stage 1: Approach waypoint out to the left and lifting with palm facing down
const throatApproach = {
  wrist: [-0.56, 3.62, 0.72],
  direction: [0.58, 0.68, -0.45],
  palm: [0.45, 0.74, -0.50],
  elbow: [-1.24, 2.98, 0.20],
  gather: 0.05,
  fingers: { index: 0.02, middle: 0.85, ring: 0.88, pinky: 0.90, thumb: 0.45 },
  handShape: POINT_SHAPE,
};

// Stage 2: Index finger pointing slightly lower than before on the left neck, palm down
const throatTop = {
  wrist: [-0.48, 4.02, 0.63],
  direction: [0.75, 0.50, -0.43],
  palm: [0.28, 0.84, -0.46],
  elbow: [-1.18, 3.20, 0.22],
  gather: 0.05,
  fingers: { index: 0.02, middle: 0.88, ring: 0.90, pinky: 0.92, thumb: 0.45 },
  handShape: POINT_SHAPE,
};

// Stage 3: Slide the pointing finger down along the left side of the throat with palm facing down
const throatBottom = {
  wrist: [-0.46, 3.78, 0.66],
  direction: [0.76, 0.44, -0.47],
  palm: [0.24, 0.86, -0.45],
  elbow: [-1.16, 3.04, 0.22],
  gather: 0.05,
  fingers: { index: 0.02, middle: 0.88, ring: 0.90, pinky: 0.92, thumb: 0.45 },
  handShape: POINT_SHAPE,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Lift hand smoothly toward the upper neck
  { time: 0.55, left: throatApproach, right: R },

  // Point at the upper-left neck and pause briefly so the contact point reads
  { time: 0.90, left: throatTop, right: R },
  { time: 1.15, left: throatTop, right: R },

  // Slide the pointing finger smoothly down the throat and hold at throatBottom
  { time: 1.85, left: throatBottom, right: R },
  { time: 2.15, left: throatBottom, right: R },

  // Lower back through approach waypoint to rest
  { time: 2.60, left: throatApproach, right: R },
  { time: THROAT_DURATION, left: L, right: R },
];

export function createThroatAnimation(model) {
  const headNode = findRigNode(model, ['head', 'Head', 'mixamorigHead']);
  const restHeadQuat = headNode ? headNode.quaternion.clone() : null;
  const yAxis = new Vector3(0, 1, 0);

  const clip = createSignAnimation(model, poses, THROAT_DURATION, {
    continuous: true,
    after(seconds) {
      if (!headNode || !restHeadQuat) return;
      const w = headTurnWeight(seconds);
      if (w <= 0) {
        headNode.quaternion.copy(restHeadQuat);
        return;
      }
      const turnQuat = new Quaternion().setFromAxisAngle(yAxis, HEAD_TURN_LEFT * w);
      headNode.quaternion.copy(restHeadQuat).premultiply(turnQuat);
    },
  });

  const applyHeadReset = () => {
    if (headNode && restHeadQuat) {
      headNode.quaternion.copy(restHeadQuat);
      model.updateMatrixWorld(true);
    }
  };

  return {
    ...clip,
    reset() {
      clip.reset();
      applyHeadReset();
    },
    idle() {
      clip.idle();
      applyHeadReset();
    },
  };
}