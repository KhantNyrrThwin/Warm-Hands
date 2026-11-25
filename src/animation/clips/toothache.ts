import type { Object3D } from 'three'
import type { SignPose } from '../armPlayback'
import type { HandShape } from '../handArticulation'
import { arm, at, createDemoClip, one, rest, type BodyKey } from './shared'
import { CLAW } from './shapes'

/**
 * သွားကိုက် / toothache
 * 1. The index finger, nearly upright and slanted a little, goes up into the
 *    open mouth and is held between the teeth as if biting it.
 * 2. A bent (clawed) hand at the side of the jaw trembles (the aching).
 * Signed with the LEFT hand, like the book picture.
 */
export const TOOTHACHE_DURATION = 3.6

/** Index finger slightly hooked, the others folded. */
const BITE_HAND: HandShape = {
  curl: { thumb: [.45, .45, .2], index: [.15, .25, .15], middle: 1, ring: 1, pinky: 1 },
  thumbOpposition: .6,
}

/** Index finger nearly upright, slanted a little inward, its tip held between the teeth. */
const BITE = arm([-.08, 4.22, .82], [.3, .93, -.15], [-.05, .15, -.99], BITE_HAND, [-1.2, 3.5, .5])
const BITE_IN = at(BITE, [-.16, 4.0, .9])
/** Bent fingers against the side of the jaw. */
const JAW = arm([-.72, 4.26, .46], [.2, .97, .1], [.85, 0, -.5], CLAW, [-1.6, 3.4, .2])

/** Small, quick shaking at the jaw. */
function tremble(start: number, span: number, shakes: number): SignPose[] {
  const [x, y, z] = JAW.wrist
  return Array.from({ length: shakes * 2 + 1 }, (_, i) =>
    one(start + (i / (shakes * 2)) * span, at(JAW, [x + (i % 2 ? -.04 : 0), y + (i % 2 ? .02 : 0), z])))
}

const toothache: SignPose[] = [
  rest(0), rest(.15),
  one(.6, BITE_IN),
  one(.85, BITE),
  one(1.4, BITE),
  one(1.6, BITE_IN),
  one(1.85, JAW),
  ...tremble(1.95, 1.0, 5),
  one(3.05, JAW),
  rest(TOOTHACHE_DURATION),
]

/** Mouth opens a little around the finger, then stays a little open in pain. */
const TOOTHACHE_BODY: BodyKey[] = [
  { time: 0 }, { time: .5 },
  { time: .8, mouth: .55 },
  { time: 1.4, mouth: .55 },
  { time: 1.8, mouth: .3 },
  { time: 3.0, mouth: .3 },
  { time: 3.3 },
  { time: TOOTHACHE_DURATION },
]

export function createToothacheAnimation(model: Object3D) {
  return createDemoClip(model, toothache, TOOTHACHE_DURATION, TOOTHACHE_BODY, 0, 'left')
}
