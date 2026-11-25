/**
 * Animator: hand-written thumbs-up (build_clips.py leaves this file alone).
 * Sign id:  fine
 * Myanmar:  ကောင်းပါတယ်
 * English:  Fine / good
 *
 * Raise the hand, hold a steady thumbs-up in front of the chest, lower it.
 * No sideways movement. Authored like the other clips (signer's right hand =
 * `left` arm) and mirrored the same way as the recorded clips.
 */
import type { Object3D } from 'three'
import type { ArmPose, SignPose } from '../armPlayback'
import { HAND_SHAPES } from '../handArticulation'
import { mirrorPoses } from './mirrored'
import { createDemoClip, one, rest } from './shared'

export const FINE_DURATION = 2.8

/** Fist, thumb straight up, knuckles toward the viewer, in front of the chest. */
const thumbsUp: ArmPose = {
  wrist: [-.55, 3.72, .9],
  direction: [.12, .35, .93],
  palm: [-1, 0, .1],
  gather: 0,
  handShape: HAND_SHAPES.thumbsUp,
  elbow: [-1.25, 2.8, -.3],
}
/** On the way up and down: same hand, lower and to the side. */
const rising: ArmPose = { ...thumbsUp, wrist: [-.75, 3.15, .8] }

const poses: SignPose[] = [
  rest(0), rest(.15),
  one(.5, rising),
  one(.85, thumbsUp),
  one(2.05, thumbsUp), // steady hold
  one(2.35, rising),
  rest(FINE_DURATION),
]

export function createFineAnimation(model: Object3D) {
  // Mirrored: played on the character's right hand.
  return createDemoClip(model, mirrorPoses(poses), FINE_DURATION)
}
