import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Bone, PropertyBinding, Vector3 } from 'three'
import { createMingalarbarAnimation, MINGALARBAR_DURATION } from '../src/animation/mingalarbar.ts'
import { isMingalarbar } from '../src/animation/greetingInput.ts'

async function loadCharacter() {
  const data = await readFile(new URL('../public/models/WarmHands_Character.glb', import.meta.url))
  const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '')
  return gltf.scene
}
const point = (model, name) => model.getObjectByName(PropertyBinding.sanitizeNodeName(name)).getWorldPosition(new Vector3())

test('Burmese greeting accepts surrounding whitespace and keyboard zero-width marks only', () => {
  for (const text of ['မင်္ဂလာပါ', '  မင်္ဂလာပါ\n', '\u200Bမင်္ဂလာပါ\u200D']) assert.equal(isMingalarbar(text), true)
  for (const text of ['', 'hello', 'မင်္ဂလာပါ extra']) assert.equal(isMingalarbar(text), false)
})

test('the real GLB raises both hands, holds palms together, and restores every bone', async () => {
  const model = await loadCharacter()
  // Use the same kind of centering translation as the real viewer.
  model.position.set(0, -3.25, 0)
  model.updateMatrixWorld(true)
  const rest = new Map()
  model.traverse((o) => { if (o instanceof Bone) rest.set(o, o.quaternion.clone()) })
  const animation = createMingalarbarAnimation(model)
  const leftRest = point(model, 'hand.L')
  const rightRest = point(model, 'hand.R')
  animation.apply(1.95)
  assert.ok(point(model, 'hand.L').y > leftRest.y + .5)
  assert.ok(point(model, 'hand.R').y > rightRest.y + .5)
  animation.apply(3.35)
  const left = point(model, 'hand.L'), right = point(model, 'hand.R')
  assert.ok(left.distanceTo(right) < .24, 'wrists come together at the chest')
  assert.ok(Math.abs(left.y - right.y) < .01, 'hands remain level')
  assert.ok(left.z > .6 && right.z > .6, 'hands stay in front of the torso')
  for (const side of ['L', 'R']) {
    const direction = point(model, `middle.03.${side}`).sub(point(model, `hand.${side}`)).normalize()
    assert.ok(direction.y > .9, 'fingers point upward')
  }
  animation.apply(4.2)
  assert.ok(point(model, 'hand.L').distanceTo(left) < .001, 'final pose holds still')
  for (let t = 0; t <= MINGALARBAR_DURATION; t += .025) {
    animation.apply(t)
    for (const bone of rest.keys()) assert.ok(bone.quaternion.toArray().every(Number.isFinite))
  }
  animation.apply(MINGALARBAR_DURATION)
  for (const [bone, quaternion] of rest) assert.ok(bone.quaternion.equals(quaternion), `${bone.name} returns to rest`)
  assert.ok(point(model, 'hand.L').distanceTo(leftRest) < 1e-5)
  animation.apply(3.35)
  assert.ok(point(model, 'hand.R').distanceTo(right) < .001, 'replay reaches the same pose')
})
