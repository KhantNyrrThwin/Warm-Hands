// Checks every clip generated from the recordings (tools/avatar/build_clips.py).
//   node --import ./tools/avatar/ts-resolve.mjs --test tests/recorded.test.mjs
//   bun test ./tests/recorded.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { PropertyBinding, Vector3 } from 'three'
import { createRecordedSignLibrary, RECORDED_DURATIONS, RECORDED_LABELS, RECORDED_SIGN_IDS } from '../src/animation/clips/recorded.generated.ts'

const calibration = JSON.parse(await readFile(new URL('../tools/avatar/calibration.json', import.meta.url), 'utf8'))
const { grid, front } = calibration
const surface = (x, y) => {
  const i = Math.round((y - grid.y0) / grid.step), j = Math.round((x - grid.x0) / grid.step)
  return front[i]?.[j] ?? null
}

async function loadCharacter() {
  const data = await readFile(new URL('../public/models/WarmHands_Character.glb', import.meta.url))
  const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '')
  return gltf.scene
}

const model = await loadCharacter()
model.updateMatrixWorld(true)
const library = createRecordedSignLibrary(model)
const at = (name) => model.worldToLocal(model.getObjectByName(PropertyBinding.sanitizeNodeName(name)).getWorldPosition(new Vector3()))
const SIDES = ['L', 'R']
const TIPS = ['thumb.03', 'index.03', 'middle.03', 'ring.03', 'pinky.03']

test('every recorded sign has a clip, a duration and a Myanmar label', () => {
  assert.ok(RECORDED_SIGN_IDS.length >= 1)
  for (const id of RECORDED_SIGN_IDS) {
    assert.ok(library[id], id)
    assert.ok(RECORDED_DURATIONS[id] > 1.5 && RECORDED_DURATIONS[id] < 7, `${id} duration`)
    assert.ok(RECORDED_LABELS[id], `${id} label`)
  }
})

for (const id of RECORDED_SIGN_IDS) {
  test(`${id}: starts and ends at rest, moves smoothly, stays out of the body`, () => {
    const clip = library[id]
    clip.idle()
    const rest = SIDES.map((s) => at(`hand.${s}`))
    let prev = rest, prevElbow = SIDES.map((s) => at(`forearm.${s}`))
    let maxLift = 0
    for (let t = 0; t <= clip.duration; t += 1 / 60) {
      clip.apply(t)
      const wrists = SIDES.map((s) => at(`hand.${s}`))
      const elbows = SIDES.map((s) => at(`forearm.${s}`))
      for (const v of [...wrists, ...elbows]) assert.ok([v.x, v.y, v.z].every(Number.isFinite), `finite at ${t}`)
      wrists.forEach((w, k) => assert.ok(w.distanceTo(prev[k]) < 0.12, `wrist jump at ${t.toFixed(2)}s`))
      elbows.forEach((e, k) => assert.ok(e.distanceTo(prevElbow[k]) < 0.16, `elbow jump at ${t.toFixed(2)}s`))
      for (const side of SIDES) {
        for (const tip of TIPS) {
          const p = at(`${tip}.${side}`)
          const s = surface(p.x, p.y)
          // only the torso and face, where the surface is well defined
          if (s !== null && Math.abs(p.x) < 0.75 && p.y > 2.3 && p.y < 5.9 && p.z > -0.2) {
            assert.ok(p.z > s - 0.12, `${tip}.${side} inside the body at ${t.toFixed(2)}s (z ${p.z.toFixed(2)} < ${s})`)
          }
        }
      }
      maxLift = Math.max(maxLift, ...wrists.map((w, k) => w.distanceTo(rest[k])))
      prev = wrists
      prevElbow = elbows
    }
    assert.ok(maxLift > 0.5, 'a hand actually signs')
    clip.apply(clip.duration)
    SIDES.forEach((s, k) => assert.ok(at(`hand.${s}`).distanceTo(rest[k]) < 1e-4, 'back at rest'))
  })
}
