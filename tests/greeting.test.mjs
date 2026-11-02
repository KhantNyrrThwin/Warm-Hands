import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Bone, Box3, PropertyBinding, Vector3 } from 'three'
import { createMingalarbarAnimation, MINGALARBAR_DURATION } from '../src/animation/mingalarbar.ts'
import { createSignLibrary, HELP_DURATION, MEDICINE_DURATION, PLEASE_DURATION, THANK_YOU_DURATION } from '../src/animation/signs.ts'
import { isMingalarbar, matchSign, planSigns } from '../src/animation/greetingInput.ts'
import { SICK_DURATION } from '../src/animation/sick.ts'
import { I_DURATION } from '../src/animation/i.ts'
import { HEADACHE_DURATION } from '../src/animation/headache.ts'

test('Headache hovers beside the temples and scratches without touching the head', async () => {
  const model = await loadCharacter()
  const clip = createSignLibrary(model).headache
  clip.idle()
  const bodyTransforms = new Map()
  model.traverse(object => {
    if (object instanceof Bone && !/upper_arm|forearm|hand|thumb|index|middle|ring|pinky/.test(object.name)) {
      bodyTransforms.set(object, object.matrixWorld.clone())
    }
  })
  const rest = ['L', 'R'].map(side => point(model, `hand.${side}`))
  clip.apply(1.25)
  const wrists = ['L', 'R'].map(side => point(model, `hand.${side}`))
  assert.ok(wrists[1].y > wrists[0].y + .15, 'right hand is higher than left')
  const extended = point(model, 'middle.03.R')
  clip.apply(1.6)
  assert.ok(point(model, 'middle.03.R').distanceTo(extended) > .1, 'fingers make a visible scratching stroke')
  for (let t = 1.25; t <= 3.55; t += .025) {
    clip.apply(t)
    for (const [index, side] of ['L', 'R'].entries()) {
      const wrist = point(model, `hand.${side}`)
      assert.ok(wrist.y > 4.6, 'both hands rise beside the head')
      assert.ok(wrist.distanceTo(wrists[index]) < 1e-4, 'wrists hover while fingers move')
      for (const digit of ['index', 'middle', 'ring', 'pinky']) {
        for (const joint of ['01', '02', '03']) {
          assert.ok(Math.abs(point(model, `${digit}.${joint}.${side}`).x) > 1.06, 'fingers clear the head and side hair')
        }
      }
    }
  }
  let previous = rest
  clip.idle()
  let previousElbows = ['L', 'R'].map(side => point(model, `forearm.${side}`))
  for (let t = 0; t <= HEADACHE_DURATION; t += 1 / 120) {
    clip.apply(t)
    const current = ['L', 'R'].map(side => point(model, `hand.${side}`))
    current.forEach((wrist, index) => assert.ok(wrist.distanceTo(previous[index]) < .04))
    const elbows = ['L', 'R'].map(side => point(model, `forearm.${side}`))
    elbows.forEach((elbow, index) => assert.ok(elbow.distanceTo(previousElbows[index]) < .06, `no elbow jump at ${t}`))
    previousElbows = elbows
    model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
    for (const [bone, matrix] of bodyTransforms) assert.ok(bone.matrixWorld.equals(matrix), `${bone.name} stays stable`)
    previous = current
  }
  clip.apply(HEADACHE_DURATION)
  ;['L', 'R'].forEach((side, index) => assert.ok(point(model, `hand.${side}`).distanceTo(rest[index]) < 1e-4))
  assert.equal(matchSign('ခေါင်းကိုက်ပါ'), 'headache')
  assert.deepEqual(planSigns('ကျွန်တော်ခေါင်းကိုက်ပါ').playable, ['i', 'headache'])
})

test('I follows A–E: open palm to chest, hold, withdraw and rest', async () => {
  const model = await loadCharacter()
  const clip = createSignLibrary(model).i
  clip.idle()
  const leftRest = point(model, 'hand.L')
  const rightRest = point(model, 'hand.R')
  const fistLength = point(model, 'middle.03.R').distanceTo(rightRest)
  clip.apply(.9)
  const raised = point(model, 'hand.R')
  assert.ok(raised.y > rightRest.y + .3)
  assert.ok(point(model, 'middle.03.R').distanceTo(raised) > fistLength + .15, 'open hand rather than pointing finger')
  clip.apply(1.8)
  const chest = point(model, 'hand.R')
  assert.ok(Math.abs(chest.x) < .35 && chest.y > 2.9 && chest.y < 3.3, 'palm reaches chest')
  assert.ok(chest.z < raised.z - .1 && chest.z > .2, 'palm moves inward without passing through torso')
  assert.ok(point(model, 'hand.L').distanceTo(leftRest) < 1e-4)
  clip.apply(2.1)
  assert.ok(point(model, 'hand.R').distanceTo(chest) < 1e-4, 'single still contact, no rubbing')
  clip.apply(2.85)
  assert.ok(point(model, 'hand.R').x < chest.x - .3, 'withdraw before lowering')
  let previous = rightRest
  for (let t = 0; t <= I_DURATION; t += 1 / 120) {
    clip.apply(t)
    const wrist = point(model, 'hand.R')
    assert.ok(wrist.distanceTo(previous) < .04, 'smooth playback')
    model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
    previous = wrist
  }
  clip.apply(I_DURATION)
  assert.ok(point(model, 'hand.R').distanceTo(rightRest) < 1e-4)
  assert.equal(matchSign('ကျွန်တော်'), 'i')
  assert.equal(matchSign('I'), 'i')
  assert.deepEqual(planSigns('ကျွန်တော်နေမကောင်းပါ').playable, ['i', 'sick'])
})

test('Sick follows the eight stills: open hand to forehead, hold, lower and restore', async () => {
  const model = await loadCharacter()
  const clip = createSignLibrary(model).sick
  clip.idle()
  const restLeft = point(model, 'hand.L').clone()
  const restRight = point(model, 'hand.R').clone()
  clip.apply(2.2)
  const raised = point(model, 'hand.R').clone()
  assert.ok(raised.y > restRight.y + 1.2, 'hand reaches forehead height')
  assert.ok(raised.x < 0, 'same side of the frame as the eight new stills')
  const eyeTop = new Box3().setFromObject(model.getObjectByName('Eye_whiteR')).max.y
  assert.ok(point(model, 'middle.03.R').y > eyeTop + .1, 'hand reaches the forehead above the eyes')
  const foreheadFront = new Box3().setFromObject(model.getObjectByName('EyebrowR')).max.z
  assert.ok(raised.z > foreheadFront + .02, 'raised palm clears the forehead surface')
  assert.ok(point(model, 'index.03.R').z > foreheadFront + .05, 'fingers stay outside the forehead')
  assert.ok(point(model, 'hand.L').distanceTo(restLeft) < 1e-4, 'other hand rests')
  clip.apply(2.9)
  assert.ok(point(model, 'hand.R').distanceTo(raised) < 1e-4, 'hold without waving')
  clip.apply(4.4)
  assert.ok(point(model, 'hand.R').y < raised.y - .5, 'hand lowers after the hold')
  clip.apply(SICK_DURATION)
  assert.ok(point(model, 'hand.R').distanceTo(restRight) < 1e-4, 'return to rest')
  model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
  let previous = restRight
  const upperLength = point(model, 'upper_arm.R').distanceTo(point(model, 'forearm.R'))
  const lowerLength = point(model, 'forearm.R').distanceTo(point(model, 'hand.R'))
  for (let t = 0; t <= SICK_DURATION; t += 1 / 120) {
    clip.apply(t)
    const wrist = point(model, 'hand.R')
    assert.ok(wrist.distanceTo(previous) < .04, 'no sudden wrist jump during playback')
    assert.ok(Math.abs(point(model, 'upper_arm.R').distanceTo(point(model, 'forearm.R')) - upperLength) < 1e-4, 'upper arm does not stretch')
    assert.ok(Math.abs(point(model, 'forearm.R').distanceTo(wrist) - lowerLength) < 1e-4, 'forearm does not stretch')
    model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
    previous = wrist
  }
  assert.equal(matchSign('Sick'), 'sick')
  assert.equal(matchSign('နေမကောင်းပါ'), 'sick')
  assert.deepEqual(planSigns('နေမကောင်းပါ').playable, ['sick'])
})

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

