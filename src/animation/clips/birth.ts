/**
 * Animator: hand-made from the reference picture (no recordings; build_clips.py leaves this file
 * alone and lists it in the index through HAND_MADE_WORDS).
 * Sign id:  birth
 * Myanmar:  မွေး
 * English:  Birth
 *
 * Both hands, the same shape on each side (mirror images):
 *   in front of the belly, the hands stand VERTICAL the whole time: fingers pointing at the
 *   ground, naturally curved, palms facing each other (inward), the two thumbs reaching in and
 *   touching in the middle (as in the picture) for the whole sign, the fingers angled a little
 *   outward. Both hands move straight down together along the red arrows, keeping exactly the
 *   same shape, angle and width, the thumbs staying in touch; held briefly, then back to rest.
 *   The wrist position is solved on the model so the thumb tips meet (tools/avatar/_thumbsolve.mjs).
 *   Never flat, never palm up, also on the way up and down (the hands rise and fall vertical).
 * No sideways, circular or finger movement. The head and body stay still.
 * Not mirrored by the shared playback: `left` is bone side L (the character's right hand), the
 * other hand is its exact mirror image.
 */
import type { Object3D } from 'three'
import { createSignAnimation, REST_LEFT, REST_RIGHT, type ArmPose, type SignAnimation, type SignPose } from '../armPlayback'
import type { HandShape } from '../handArticulation'
import { mirror } from './shared'

export const BIRTH_DURATION = 3.45

/**
 * Fingers naturally curved and together; the thumb folded in at its base so it points inward,
 * toward the other hand (tip about 0.32 inward, a little forward and down from the wrist).
 */
const CURVED: HandShape = {
  curl: { thumb: [1.4, .05, 0], index: [.3, .4, .25], middle: [.3, .42, .25], ring: [.32, .42, .25], pinky: [.35, .42, .25] },
  spread: { thumb: .3, index: -.04, middle: 0, ring: .03, pinky: .06 },
  thumbOpposition: 0,
}

// Model space: +y up, +z toward the viewer; this hand (the character's right) works on -x.
// Raw `palm` field is the normal of the BACK of the hand.
/** `tilt` (degrees) > 0 angles the fingers outward, < 0 inward; 0 = fingers straight down. */
const pose = (wrist: number[], tilt = 0, elbow = [-1.1, 3.0, -.1]): ArmPose => {
  const r = tilt * Math.PI / 180
  return {
    wrist,
    direction: [-Math.sin(r), -Math.cos(r), .12], // vertical: fingers pointing at the ground
    palm: [-Math.cos(r), Math.sin(r), 0], // back of the hand outward, so the palm faces inward (toward the other hand)
    gather: 0,
    handShape: CURVED,
    elbow, // elbows at the sides
  }
}
/** Fingers angled a little outward; at this width the two thumb tips touch in the middle. */
const TILT = 10, WIDTH = -.307
/** Start and end: the same hand position, only the height changes (thumbs touching throughout). */
const TOP = pose([WIDTH, 3.1, .6], TILT)
const BOTTOM = pose([WIDTH, 2.78, .6], TILT)
/** On the way up and down: already vertical, lower and nearer the side. */
const RISING = pose([-.75, 2.72, .38], 0, [-1.15, 3.05, -.2])
const LOWERING = pose([-.85, 2.6, .38], 5, [-1.2, 3.0, -.2])

const keys: [number, ArmPose][] = [
  [0, REST_LEFT], [.1, REST_LEFT],
  [.35, RISING],
  [.6, TOP],
  [1.0, TOP], // held
  [1.9, BOTTOM], // both hands straight down together, thumbs touching
  [2.8, BOTTOM], // held
  [3.05, LOWERING],
  [3.3, REST_LEFT],
  [BIRTH_DURATION, REST_LEFT],
]
const poses: SignPose[] = keys.map(([time, arm]) => ({ time, left: arm, right: arm === REST_LEFT ? REST_RIGHT : mirror(arm) }))

export function createBirthAnimation(model: Object3D): SignAnimation {
  return createSignAnimation(model, poses, BIRTH_DURATION, { continuous: true })
}
