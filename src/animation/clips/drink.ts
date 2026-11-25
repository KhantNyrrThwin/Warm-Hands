/**
 * Copy this file to `src/animation/clips/drink.ts`.
 *
 * Animator: May Yu Ya Myet Chare
 * Sign id:  drink
 * Myanmar:  သောက်
 * English:  Drink
 */
import type { Object3D } from 'three'
import { arm, createDemoClip, CUP, one, rest } from './shared'

/** သောက် / drink : lift a cup to the mouth, turn and tip it like drinking. */
export const DRINK_DURATION = 3.2

const cupLow = arm([-0.42, 3.35, 1.0], [0.5, 0.3, 0.8], [0.8, 0, 0.55], CUP, [-1.3, 2.75, 0.1])
const cup = arm([-0.16, 4.58, 1.1], [0.6, 0.3, 0.75], [0.75, 0, 0.6], CUP, [-1.3, 3.25, 0.25])
const cupTip = arm([-0.15, 4.72, 1.03], [0.55, 0.65, 0.5], [0.75, -0.1, 0.65], CUP, [-1.3, 3.35, 0.3])

const drink = [
  rest(0),
  rest(0.15),
  one(0.6, cupLow),
  one(1.0, cup),
  one(1.55, cupTip),
  one(2.2, cupTip),
  one(2.55, cup),
  rest(DRINK_DURATION),
]

interface DrinkBodyKeyframe {
  time: number
  turn?: number
  headTurn?: number
  nod?: number
  lean?: number
}

const DRINK_BODY: DrinkBodyKeyframe[] = [
  { time: 0 },
  { time: 0.55 },
  { time: 1.0, turn: 0.16, headTurn: 0.1 },
  { time: 1.55, turn: 0.34, headTurn: 0.22, nod: -0.3, lean: -0.04 },
  { time: 2.2, turn: 0.36, headTurn: 0.24, nod: -0.34, lean: -0.05 },
  { time: 2.6, turn: 0.18, headTurn: 0.1, nod: -0.05 },
  { time: DRINK_DURATION },
]

export function createDrinkAnimation(model: Object3D) {
  return createDemoClip(model, drink, DRINK_DURATION, DRINK_BODY)
}