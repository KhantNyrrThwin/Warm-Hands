import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Bone, PropertyBinding, Vector3 } from 'three'
import { createMingalarbarAnimation, MINGALARBAR_DURATION } from '../src/animation/mingalarbar.ts'
import { createSignLibrary, HELP_DURATION, MEDICINE_DURATION, PLEASE_DURATION, THANK_YOU_DURATION } from '../src/animation/signs.ts'
import { isMingalarbar, matchSign, planSigns } from '../src/animation/greetingInput.ts'

async function loadCharacter() {
  const data = await readFile(new URL('../public/models/WarmHands_Character.glb', import.meta.url))
  const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '')
  return gltf.scene
}
const point = (model, name) => model.getObjectByName(PropertyBinding.sanitizeNodeName(name)).getWorldPosition(new Vector3())

function meshCenter(model, name) {
  const mesh = model.getObjectByName(PropertyBinding.sanitizeNodeName(name))
  mesh.skeleton.update()
  const center = new Vector3(), vertex = new Vector3()
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) center.add(mesh.getVertexPosition(i, vertex))
  return mesh.localToWorld(center.divideScalar(mesh.geometry.attributes.position.count))
}

test('resting palms face backward and the greeting turns the palms inward', async () => {
  const model = await loadCharacter()
  model.updateMatrixWorld(true)
  const animation = createMingalarbarAnimation(model)
  for (const side of ['L', 'R']) {
    const nail = meshCenter(model, `Nail.middle.${side}`)
    assert.ok(nail.z > point(model, `middle.03.${side}`).z, 'nails face forward at rest')
  }
  animation.apply(2)
  for (const [side, sign] of [['L', 1], ['R', -1]]) {
    const nail = meshCenter(model, `Nail.middle.${side}`)
    assert.ok(sign * (nail.x - point(model, `middle.03.${side}`).x) > 0, 'nails face away from the joined palms')
  }
})

test('Burmese greeting accepts surrounding whitespace and keyboard zero-width marks only', () => {
  for (const text of ['မင်္ဂလာပါ', '  မင်္ဂလာပါ\n', '\u200Bမင်္ဂလာပါ\u200D']) assert.equal(isMingalarbar(text), true)
  for (const text of ['', 'hello extra', 'မင်္ဂလာပါ extra']) assert.equal(isMingalarbar(text), false)
})

test('please then help is the same sequence for polite and casual wording', () => {
  for (const text of ['ကျေးဇူးပြု၍ ကူညီပါ', 'ကျေးဇူးပြု၍ ကူညီပေးပါနော်', 'please help', '  Please, help! ']) {
    const plan = planSigns(text)
    assert.deepEqual(plan.signs, ['please', 'help'])
    assert.deepEqual(plan.playable, ['please', 'help'])
    assert.deepEqual(plan.pending, [])
    assert.equal(plan.canonical, 'ကျေးဇူးပြု၍ ကူညီပါ')
  }
})

test('signs without a clip are recognized and not sent to the avatar', () => {
  const plan = planSigns('ကျေးဇူးပြု၍ ဆရာဝန်')
  assert.deepEqual(plan.signs, ['please', 'doctor'])
  assert.deepEqual(plan.playable, ['please'])
  assert.deepEqual(plan.pending, ['doctor'])
})

test('thank you, please, help and medicine text map to avatar clips', () => {
  assert.equal(matchSign('ကျေးဇူးတင်ပါတယ်'), 'thank_you')
  assert.equal(matchSign('  ကျေးဇူးပြု '), 'please')
  assert.equal(matchSign('ကူညီပါ'), 'help')
  assert.equal(matchSign('ဆေး'), 'medicine')
  assert.equal(matchSign('thank you'), 'thank_you')
  assert.equal(matchSign('please'), 'please')
  assert.equal(matchSign('help'), 'help')
  assert.equal(matchSign('medicine'), 'medicine')
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
  animation.apply(.78)
  assert.ok(point(model, 'hand.L').y > leftRest.y + .5)
  assert.ok(point(model, 'hand.R').y > rightRest.y + .5)
  animation.apply(1.08)
  const left = point(model, 'hand.L'), right = point(model, 'hand.R')
  assert.ok(left.distanceTo(right) < .24, 'wrists come together at the chest')
  assert.ok(Math.abs(left.y - right.y) < .01, 'hands remain level')
  assert.ok(left.z > .6 && right.z > .6, 'hands stay in front of the torso')
  for (const side of ['L', 'R']) {
    const direction = point(model, `middle.03.${side}`).sub(point(model, `hand.${side}`)).normalize()
    assert.ok(direction.y > .9, 'fingers point upward')
  }
  const head = model.getObjectByName('head')
  assert.ok(head.quaternion.equals(rest.get(head)), 'head stays upright as demonstrated')
  for (const side of ['L', 'R']) {
    const thumb = model.getObjectByName(PropertyBinding.sanitizeNodeName('thumb.01.' + side))
    assert.ok(!thumb.quaternion.equals(rest.get(thumb)), 'thumbs tuck toward the fingers')
  }
  animation.apply(4.07)
  assert.ok(point(model, 'hand.L').distanceTo(left) < .001, 'final pose holds still')
  for (let t = 0; t <= MINGALARBAR_DURATION; t += .025) {
    animation.apply(t)
    for (const bone of rest.keys()) assert.ok(bone.quaternion.toArray().every(Number.isFinite))
  }
  animation.apply(MINGALARBAR_DURATION)
  assert.ok(point(model, 'hand.L').distanceTo(leftRest) < 1e-4)
  assert.ok(point(model, 'hand.R').distanceTo(rightRest) < 1e-4)
  for (const name of ['head', 'upper_arm.L', 'upper_arm.R', 'forearm.L', 'forearm.R', 'hand.L', 'hand.R']) {
    const bone = model.getObjectByName(PropertyBinding.sanitizeNodeName(name))
    assert.ok(bone.quaternion.equals(rest.get(bone)), `${name} returns to rest`)
  }
  animation.apply(1.08)
  assert.ok(point(model, 'hand.R').distanceTo(right) < .001, 'replay reaches the same pose')
})

test('thank-you raises the right hand toward the chin then returns', async () => {
  const model = await loadCharacter()
  model.updateMatrixWorld(true)
  const rightRest = point(model, 'hand.R')
  const library = createSignLibrary(model)
  library.thank_you.apply(.9)
  const right = point(model, 'hand.R')
  assert.ok(right.y > rightRest.y + .4, 'right hand lifts toward the face')
  assert.ok(right.x > rightRest.x + .2, 'right hand moves inward to the chin')
  assert.ok(right.z > .3, 'right hand stays in front of the body')
  library.thank_you.apply(THANK_YOU_DURATION)
  assert.ok(point(model, 'hand.R').distanceTo(rightRest) < 1e-4)
})

test('please circles the right palm on the chest', async () => {
  const model = await loadCharacter()
  model.updateMatrixWorld(true)
  const rightRest = point(model, 'hand.R')
  const library = createSignLibrary(model)
  library.please.apply(.7)
  const start = point(model, 'hand.R')
  assert.ok(start.x < -.7, 'the first move lifts from the side instead of snapping to the chest')
  library.please.apply(1.8)
  const a = point(model, 'hand.R')
  const tip = point(model, 'middle.03.R')
  library.please.apply(3.2)
  const b = point(model, 'hand.R')
  assert.ok(a.y > rightRest.y + .25, 'right hand rises to the chest')
  assert.ok(a.y < 3.35, 'the palm stays under the neck')
  assert.ok(b.y < 3.35, 'the circle stays on the chest')
  assert.ok(tip.y < 3.65, 'the fingers stay under the neck')
  assert.ok(Math.abs(a.x) < .45, 'right palm stays near the chest center')
  assert.ok(a.distanceTo(b) > .08, 'the palm moves in a circle')
  library.please.apply(PLEASE_DURATION)
  assert.ok(point(model, 'hand.R').distanceTo(rightRest) < 1e-4)
})

test('help rests a thumbs-up on an open left palm, then lifts once', async () => {
  const model = await loadCharacter()
  model.updateMatrixWorld(true)
  const leftRest = point(model, 'hand.L')
  const rightRest = point(model, 'hand.R')
  const library = createSignLibrary(model)
  library.help.idle()
  const idleIndex = point(model, 'index.03.R').distanceTo(point(model, 'hand.R'))
  library.help.reset()
  const openIndex = point(model, 'index.03.R').distanceTo(point(model, 'hand.R'))
  assert.ok(idleIndex < openIndex - .08, 'idle hands rest as fists')
  library.help.apply(1.25)
  const left = point(model, 'hand.L')
  const right = point(model, 'hand.R')
  const thumb = point(model, PropertyBinding.sanitizeNodeName('thumb.03.R')).sub(point(model, PropertyBinding.sanitizeNodeName('thumb.01.R'))).normalize()
  assert.ok(left.z > leftRest.z + .15, 'left palm faces up under the right hand')
  assert.ok(right.y > left.y - .02, 'thumbs-up sits on the open palm')
  assert.ok(thumb.y > .75, 'right thumb points up')
  library.help.apply(1.75)
  assert.ok(point(model, 'hand.R').y > right.y + .12, 'right hand raises once')
  assert.ok(point(model, 'hand.R').y < 3.7, 'the lift stays under the neck')
  library.help.apply(2.3)
  assert.ok(Math.abs(point(model, 'hand.R').y - right.y) < .12, 'right hand comes back down')
  library.help.apply(HELP_DURATION)
  assert.ok(point(model, 'hand.L').distanceTo(leftRest) < 1e-4)
  assert.ok(point(model, 'hand.R').distanceTo(rightRest) < 1e-4)
})

test('medicine holds a left palm cup and taps with the right middle finger', async () => {
  const model = await loadCharacter()
  model.updateMatrixWorld(true)
  const leftRest = point(model, 'hand.L')
  const rightRest = point(model, 'hand.R')
  const library = createSignLibrary(model)
  library.medicine.apply(1.2)
  const left = point(model, 'hand.L')
  const right = point(model, 'hand.R')
  assert.ok(left.z > leftRest.z + .2, 'left palm comes forward as a cup')
  assert.ok(right.y > left.y - .05, 'right hand stays above the left palm')
  assert.ok(left.distanceTo(right) < 1.1, 'hands meet for the medicine tap')
  library.medicine.apply(MEDICINE_DURATION)
  assert.ok(point(model, 'hand.L').distanceTo(leftRest) < 1e-4)
  assert.ok(point(model, 'hand.R').distanceTo(rightRest) < 1e-4)
})

