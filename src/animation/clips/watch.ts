import type { ArmPose } from '../armPlayback'
import { arm, POINT } from './shared'
import { FIST } from './shapes'

/**
 * Shared "wrist watch" poses for အချိန် (time) and နာရီ (hour / clock).
 * Both forearms lie across the waist; the signing hand points down over the other
 * forearm and its index fingertip touches the back of the wrist where a watch sits.
 */

/** Other arm: forearm across the body, fist, palm down. */
export const WATCH_ARM: ArmPose = arm([.08, 3.0, .7], [-1, 0, .1], [0, -1, 0], FIST, [1.2, 2.6, .3])
/** Signing hand: pointing down, index fingertip on the back of the other wrist. */
export const WATCH_TOUCH: ArmPose = arm([-.02, 3.62, .55], [.1, -.97, .15], [.015, -.15, -.98], POINT, [-1.1, 2.9, .3])
/** Signing hand lifted a little off the wrist, between taps. */
export const WATCH_LIFT: ArmPose = arm([-.02, 3.82, .58], [.1, -.97, .15], [.015, -.15, -.98], POINT, [-1.1, 2.9, .3])
/** On the way in. */
export const WATCH_ARM_IN: ArmPose = arm([.35, 2.9, .55], [-1, 0, .1], [0, -1, 0], FIST, [1.2, 2.6, .3])
export const WATCH_IN: ArmPose = arm([-.2, 3.6, .6], [.1, -.97, .15], [.015, -.15, -.98], POINT, [-1.1, 2.9, .3])
