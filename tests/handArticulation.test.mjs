import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Bone, PropertyBinding, Vector3 } from 'three'
import { createHandArticulation, HAND_SHAPES } from '../src/animation/handArticulation.ts'
import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../src/animation/armPlayback.ts'

async function load() {
  const file = await readFile(new URL('../public/models/WarmHands_Character.glb', import.meta.url))
  const { scene } = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')
  scene.updateMatrixWorld(true)
  return scene
}
const bone = (model, name) => model.getObjectByName(PropertyBinding.sanitizeNodeName(name))
const point = (model, name) => bone(model, name).getWorldPosition(new Vector3())
function nail(model, name) {
  const mesh = bone(model, name), center = new Vector3(), v = new Vector3()
  mesh.skeleton.update()
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) center.add(mesh.getVertexPosition(i, v))
  return mesh.localToWorld(center.divideScalar(mesh.geometry.attributes.position.count))
}

test('each finger has three independent joints and curls toward its palm', async () => {
  for (const side of ['L', 'R']) {
    const model = await load(), hand = createHandArticulation(model)
    const middle = nail(model, `Nail.middle.${side}`), index = nail(model, `Nail.index.${side}`)
    hand.apply(side, { curl: { index: [.65, .9, .5] } })
    const bent = nail(model, `Nail.index.${side}`)
    assert.ok(bent.z < index.z - .10, 'flexion moves the finger toward the backward-facing palm')
    assert.ok(bent.distanceTo(index) > .2, 'the skinned fingertip follows the joint chain')
    assert.ok(nail(model, `Nail.middle.${side}`).distanceTo(middle) < 1e-5, 'the neighboring finger stays still')
    for (const joint of ['01', '02', '03']) assert.ok(Math.abs(bone(model, `index.${joint}.${side}`).quaternion.x) > .1)
  }
})

test('thumbs-up keeps the thumb extended while four fingers close', async () => {
  const model = await load(), hand = createHandArticulation(model)
  const thumb = nail(model, 'Nail.thumb.L'), index = nail(model, 'Nail.index.L')
  hand.apply('L', HAND_SHAPES.thumbsUp)
  assert.ok(nail(model, 'Nail.thumb.L').distanceTo(thumb) < 1e-5)
  assert.ok(nail(model, 'Nail.index.L').distanceTo(index) > .25)
  for (const name of ['index', 'middle', 'ring', 'pinky']) {
    assert.ok(bone(model, `${name}.02.L`).quaternion.x > .5, `${name} middle joint bends`)
  }
})

test('thumb opposition is independent and the arm timeline resets all finger offsets', async () => {
  const model = await load(), hand = createHandArticulation(model)
  const thumb = nail(model, 'Nail.thumb.L'), index = nail(model, 'Nail.index.L')
  hand.apply('L', { thumbOpposition: 1 })
  assert.ok(nail(model, 'Nail.thumb.L').distanceTo(thumb) > .01)
  assert.ok(nail(model, 'Nail.index.L').distanceTo(index) < 1e-5)
  const fresh = await load(), rest = new Map()
  fresh.traverse((o) => { if (o instanceof Bone) rest.set(o, o.quaternion.clone()) })
  const poses = [
    { time: 0, left: REST_LEFT, right: REST_RIGHT },
    { time: 1, left: { ...REST_LEFT, handShape: HAND_SHAPES.fist }, right: REST_RIGHT },
    { time: 2, left: REST_LEFT, right: REST_RIGHT },
  ]
  const animation = createSignAnimation(fresh, poses, 2)
  animation.apply(1)
  const curled = bone(fresh, 'index.02.L').quaternion.clone()
  animation.apply(1.5)
  assert.ok(bone(fresh, 'index.02.L').quaternion.angleTo(rest.get(bone(fresh, 'index.02.L'))) < curled.angleTo(rest.get(bone(fresh, 'index.02.L'))), 'the release interpolates back to open fingers')
  for (let t = 0; t <= 2; t += .025) {
    animation.apply(t)
    for (const b of rest.keys()) assert.ok(b.quaternion.toArray().every(Number.isFinite))
  }
  animation.apply(2)
  for (const [b, q] of rest) assert.ok(b.quaternion.equals(q), `${b.name} restores exactly`)
})
