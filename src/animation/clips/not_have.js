import { Bone, PropertyBinding, Quaternion, Vector3 } from 'three';
import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../armPlayback';
import { HAND_SHAPES } from '../handArticulation';

export const NOT_HAVE_DURATION = 3.0;
const HEAD_SHAKE_YAW = 0.34;

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

// Smooth envelope so the head eases into and out of the shake without snapping
function shakeEnvelope(seconds) {
  if (seconds <= 0.2 || seconds >= NOT_HAVE_DURATION - 0.15) return 0;
  if (seconds < 0.7) {
    return smoothstep01((seconds - 0.2) / (0.7 - 0.2));
  }
  if (seconds > 2.02) {
    return 1 - smoothstep01((seconds - 2.02) / (NOT_HAVE_DURATION - 0.15 - 2.02));
  }
  return 1;
}

// Left hand raised with palm facing inward, twisted toward the right/chest
const leftTwistIn = {
  wrist: [-0.58, 3.38, 0.56],
  direction: [0.06, 0.98, 0.18],
  palm: [0.65, 0.10, 0.75],
  gather: 0.05,
  handShape: HAND_SHAPES.open,
};

// Left hand raised with palm facing inward, twisted toward the left/outward
const leftTwistOut = {
  wrist: [-0.58, 3.38, 0.56],
  direction: [-0.08, 0.98, 0.18],
  palm: [-0.65, 0.10, 0.75],
  gather: 0.05,
  handShape: HAND_SHAPES.open,
};

const poses = [
  { time: 0.0, left: L, right: R },
  { time: 0.2, left: L, right: R },

  // Raise left hand and twist wrist/forearm back and forth
  { time: 0.70, left: leftTwistOut, right: R },
  { time: 0.92, left: leftTwistIn, right: R },
  { time: 1.14, left: leftTwistOut, right: R },
  { time: 1.36, left: leftTwistIn, right: R },
  { time: 1.58, left: leftTwistOut, right: R },
  { time: 1.80, left: leftTwistIn, right: R },
  { time: 2.02, left: leftTwistOut, right: R },

  // Return to rest
  { time: NOT_HAVE_DURATION, left: L, right: R },
];

export function createNotHaveAnimation(model) {
  const headNode = findRigNode(model, ['head', 'Head', 'mixamorigHead']);
  const restHeadQuat = headNode ? headNode.quaternion.clone() : null;
  const yAxis = new Vector3(0, 1, 0);

  const clip = createSignAnimation(model, poses, NOT_HAVE_DURATION, {
    continuous: true,
    after(seconds) {
      if (!headNode || !restHeadQuat) return;
      const env = shakeEnvelope(seconds);
      if (env <= 0) {
        headNode.quaternion.copy(restHeadQuat);
        return;
      }

      // 3.5 full cycles across the 0.70s–2.02s wrist-twist window, synced to the beat
      const cycle = Math.sin(((seconds - 0.70) / (2.02 - 0.70)) * Math.PI * 7);
      const yawQuat = new Quaternion().setFromAxisAngle(yAxis, HEAD_SHAKE_YAW * env * cycle);
      headNode.quaternion.copy(restHeadQuat).premultiply(yawQuat);
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