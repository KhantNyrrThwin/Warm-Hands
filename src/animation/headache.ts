import type { Object3D } from 'three'
import { createSignAnimation, REST_LEFT, REST_RIGHT, type ArmPose, type SignPose } from './armPlayback'

export const HEADACHE_DURATION = 4.6

// Both hands hover outside the temples. Fingers flex in short scratching
// strokes; the wrists remain steady and never move inward to touch the head.
function temple(side: number, curl: number): ArmPose {
  return {
    // Avatar right (viewer left) is higher, as in the reference.
    wrist: [side * 1.42, side < 0 ? 5.03 : 4.70, .52],
    direction: [side * .12, .99, .03],
    palm: [-side, .12, 0],
    gather: .05,
    elbow: [side * 1.6, 4.02, .18],
    handShape: {
      curl: { thumb: .28, index: curl, middle: curl + .04, ring: curl + .06, pinky: curl + .08 },
      spread: { index: -.07, middle: 0, ring: .06, pinky: .12 },
      thumbOpposition: .22,
    },
  }
}
const raised = (time: number, curl: number): SignPose => ({ time, left: temple(1, curl), right: temple(-1, curl) })
const poses: SignPose[] = [
  { time: 0, left: REST_LEFT, right: REST_RIGHT },
  { time: .2, left: REST_LEFT, right: REST_RIGHT },
  raised(1.25, .32),
  raised(1.6, .64),
  raised(1.95, .32),
  raised(2.3, .64),
  raised(2.65, .32),
  raised(3.0, .64),
  raised(3.35, .32),
  raised(3.55, .32),
  { time: HEADACHE_DURATION, left: REST_LEFT, right: REST_RIGHT },
]

export function createHeadacheAnimation(model: Object3D) {
  // A fixed outward/backward pole avoids crossing the shoulder-to-wrist axis
  // during the lift, which otherwise flips the elbow abruptly.
  const clip = createSignAnimation(model, poses, HEADACHE_DURATION, {
    continuous: true, elbowPole: [2.0, 3.3, -.8],
  })
  // Ease finger flex at each reversal, while preserving continuous wrist motion.
  return {
    ...clip,
    apply(seconds: number) {
      if (seconds >= 1.25 && seconds <= 3.35) {
        const phase = (seconds - 1.25) / .35
        const step = Math.min(5, Math.floor(phase))
        const fraction = phase - step
        const eased = fraction * fraction * (3 - 2 * fraction)
        clip.apply(1.25 + (step + eased) * .35)
      } else clip.apply(seconds)
    },
  }
}
