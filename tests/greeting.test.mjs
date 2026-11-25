import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Bone, Box3, PropertyBinding, Quaternion, Vector3 } from 'three'
import { createMingalarbarAnimation, MINGALARBAR_DURATION } from '../src/animation/mingalarbar.ts'
import { createSignLibrary, HELP_DURATION, PLEASE_DURATION, SIGN_DURATIONS, THANK_YOU_DURATION } from '../src/animation/signs.ts'
import { MEDICINE_DURATION } from '../src/animation/clips/medicine.ts'
import { isMingalarbar, matchSign, planSigns } from '../src/animation/greetingInput.ts'
import { SICK_DURATION } from '../src/animation/sick.ts'
import { I_DURATION } from '../src/animation/i.ts'
import { HEADACHE_DURATION } from '../src/animation/headache.ts'
import { BREAKFAST_DURATION } from '../src/animation/clips/breakfast.ts'
import { FINISHED_DURATION, HAVE_YOU_FINISHED_DURATION } from '../src/animation/clips/finished.ts'
import { UNFINISHED_DURATION } from '../src/animation/clips/unfinished.ts'
import { EAT_DURATION } from '../src/animation/clips/eat.ts'
import { DOCTOR_DURATION } from '../src/animation/clips/doctor.ts'
import { NURSE_DURATION } from '../src/animation/clips/nurse.ts'
import { LUNCH_DURATION } from '../src/animation/clips/lunch.ts'
import { DINNER_DURATION } from '../src/animation/clips/dinner.ts'

test('breakfast and have-you-finished are recognized and their motions match the reference', async () => {
  const model = await loadCharacter()
  const library = createSignLibrary(model)
  const plan = planSigns('Breakfast, have you finished?')
  assert.deepEqual(plan.signs, ['breakfast', 'have_you_finished'])
  assert.deepEqual(plan.playable, ['breakfast', 'have_you_finished'])
  assert.deepEqual(planSigns('Have you done?').playable, ['have_you_finished'])
  assert.deepEqual(planSigns('Have you finished?').playable, ['have_you_finished'])
  assert.deepEqual(planSigns('မနက်စာပြီးပြီလား').playable, ['breakfast', 'have_you_finished'])
  assert.deepEqual(planSigns('ပြီး').playable, ['finished'])

  const rightRest = point(model, 'hand.R')
  const leftRest = point(model, 'hand.L')
  library.breakfast.apply(.9)
  assert.ok(point(model, 'hand.L').y > leftRest.y + 1.3, 'breakfast begins with the left hand raised beside the head')
  assert.ok(point(model, 'hand.R').distanceTo(rightRest) < .15, 'breakfast is one-handed')
  library.breakfast.apply(2.5)
  assert.ok(point(model, 'hand.L').y > 4.1, 'the breakfast sign includes the eating motion')
  for (let time = 0; time <= BREAKFAST_DURATION; time += 1 / 30) {
    library.breakfast.apply(time)
    model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
  }
  library.breakfast.apply(BREAKFAST_DURATION)
  assert.ok(point(model, 'hand.L').distanceTo(leftRest) < 1e-4, 'breakfast returns to rest')

  library.finished.apply(1.65)
  const finishedDirection = point(model, 'middle.03.R').sub(point(model, 'hand.R')).normalize()
  assert.ok(finishedDirection.z > .65, 'finished fingers angle slightly toward the front')
  library.finished.apply(FINISHED_DURATION)

  library.have_you_finished.apply(1.9)
  const questionDirection = point(model, 'middle.03.R').sub(point(model, 'hand.R')).normalize()
  assert.ok(Math.abs(questionDirection.y) < .2, 'the question ends with a flat, palm-down hand')
  assert.ok(questionDirection.y < finishedDirection.y - .4, 'the question hand is flatter than finished')
  for (let time = 0; time <= HAVE_YOU_FINISHED_DURATION; time += 1 / 30) {
    library.have_you_finished.apply(time)
    model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
  }
})

test('unfinished flicks at the left shoulder with the left hand and shakes the head side to side', async () => {
  const model = await loadCharacter()
  const clip = createSignLibrary(model).unfinished
  assert.deepEqual(planSigns('not finished').playable, ['unfinished'])
  assert.deepEqual(planSigns('unfinished').playable, ['unfinished'])

  const rightRest = point(model, 'hand.R')
  clip.apply(.55)
  assert.ok(point(model, 'hand.R').distanceTo(rightRest) < .15, 'unfinished leaves the right hand at rest')
  const start = point(model, 'hand.L').clone()
  const head = model.getObjectByName('head')
  const leftTurn = head.quaternion.clone()
  clip.apply(.8)
  const brush = point(model, 'hand.L').clone()
  assert.ok(brush.y < start.y - .1, 'hand flicks down at the shoulder')
  clip.apply(.95)
  assert.ok(!head.quaternion.equals(leftTurn), 'head turns during the negative marker')
  clip.apply(UNFINISHED_DURATION)
})

test('eat, lunch and dinner are signed with the left hand', async () => {
  const model = await loadCharacter()
  const library = createSignLibrary(model)
  assert.deepEqual(planSigns('နေ့လည်စာ').playable, ['lunch'])
  assert.deepEqual(planSigns('ညစာ').playable, ['dinner'])
  assert.deepEqual(planSigns('Dinner, have you finished?').playable, ['dinner', 'have_you_finished'])
  const rightRest = point(model, 'hand.R')
  const leftRest = point(model, 'hand.L')

  library.eat.apply(1.45)
  assert.ok(point(model, 'hand.L').y > 4.1, 'eat: left hand reaches the mouth')
  assert.ok(point(model, 'hand.R').distanceTo(rightRest) < .15, 'eat: right hand stays down')

  library.lunch.apply(1.0)
  const noonHand = point(model, 'hand.L'), noonElbow = point(model, 'forearm.L'), support = point(model, 'hand.R')
  assert.ok(noonHand.y - noonElbow.y > .5, 'lunch: left forearm stands upright')
  assert.ok(Math.abs(noonHand.x - noonElbow.x) < .15, 'lunch: forearm is vertical')
  assert.ok(support.x < rightRest.x - .5 && support.y > rightRest.y + .3, 'lunch: right hand comes across under the elbow')
  library.lunch.apply(2.6)
  assert.ok(point(model, 'hand.L').y > 4.1, 'lunch: eat motion reaches the mouth')
  assert.ok(point(model, 'hand.R').distanceTo(rightRest) < .15, 'lunch: support hand is back at rest while eating')

  library.dinner.apply(.8)
  assert.ok(point(model, 'hand.L').y > 4.0, 'dinner: left hand is raised beside the head')
  assert.ok(point(model, 'hand.R').distanceTo(rightRest) < .15, 'dinner is one-handed')
  library.dinner.apply(2.65)
  assert.ok(point(model, 'hand.L').y > 4.1, 'dinner: eat motion reaches the mouth')

  for (const [clip, duration] of [[library.eat, EAT_DURATION], [library.lunch, LUNCH_DURATION], [library.dinner, DINNER_DURATION]]) {
    for (let time = 0; time <= duration; time += 1 / 30) {
      clip.apply(time)
      model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
    }
    clip.apply(duration)
    assert.ok(point(model, 'hand.L').distanceTo(leftRest) < 1e-4, 'returns to rest')
  }
})

test('meal signs eat only once; doctor and nurse', async () => {
  const model = await loadCharacter()
  const library = createSignLibrary(model)
  assert.deepEqual(planSigns('ဆရာဝန်').playable, ['doctor'])
  assert.deepEqual(planSigns('သူနာပြု').playable, ['nurse'])
  assert.deepEqual(planSigns('doctor nurse').playable, ['doctor', 'nurse'])

  // Count how many times the left hand reaches the mouth.
  const mouthVisits = (clip, duration) => {
    let visits = 0, inside = false
    for (let time = 0; time <= duration; time += 1 / 30) {
      clip.apply(time)
      const near = point(model, 'hand.L').y > 4.1 && point(model, 'hand.L').z > .9
      if (near && !inside) visits += 1
      inside = near
    }
    return visits
  }
  assert.equal(mouthVisits(library.breakfast, BREAKFAST_DURATION), 1, 'breakfast eats once')
  assert.equal(mouthVisits(library.lunch, LUNCH_DURATION), 1, 'lunch eats once')
  assert.equal(mouthVisits(library.dinner, DINNER_DURATION), 1, 'dinner eats once')

  library.doctor.apply(1.0)
  const uprightBase = point(model, 'index.01.L'), uprightTip = point(model, 'index.03.L')
  const acrossBase = point(model, 'index.01.R'), acrossTip = point(model, 'index.03.R')
  assert.ok(acrossBase.x > uprightTip.x && acrossTip.x < uprightTip.x, 'doctor: the right index finger runs past the upright one')
  assert.ok(acrossTip.y > uprightBase.y && acrossTip.y < uprightTip.y, 'doctor: the fingers cross at the middle, not at the tip')
  const uprightMid = point(model, 'index.02.L'), acrossMid = point(model, 'index.02.R')
  assert.ok(acrossMid.z > uprightMid.z + .12 && acrossTip.z > uprightTip.z + .1, 'doctor: the crossing finger is clearly in front')
  library.doctor.apply(2.3)
  assert.ok(point(model, 'hand.L').y > 4.4 && point(model, 'hand.R').y > 4.4, 'doctor: both hands up at the ears')

  library.nurse.apply(1.2)
  assert.ok(point(model, 'hand.L').y > 4.7, 'nurse: left hand raised to the head')

  for (const [clip, duration] of [[library.doctor, DOCTOR_DURATION], [library.nurse, NURSE_DURATION]]) {
    for (let time = 0; time <= duration; time += 1 / 30) {
      clip.apply(time)
      model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
    }
  }
})

test('time, family and movement signs map from text and land on the body', async () => {
  const model = await loadCharacter()
  const library = createSignLibrary(model)
  const text = {
    wake_up: 'အိပ်ရာထ', time: 'အချိန်', hour: 'နာရီ', tomorrow: 'မနက်ဖြန်', day_after_tomorrow: 'သန်ဘက်ခါ',
    meet: 'တွေ့', go: 'သွား', father: 'အဖေ', mother: 'အမေ', older_sister: 'အစ်မ',
    younger_brother: 'ညီ', older_brother: 'အစ်ကို',
  }
  for (const [id, my] of Object.entries(text)) assert.deepEqual(planSigns(my).playable, [id], my)
  assert.deepEqual(planSigns('the day after tomorrow').playable, ['day_after_tomorrow'])
  assert.deepEqual(planSigns('older brother').playable, ['older_brother'])
  assert.deepEqual(planSigns('သွားကိုက်').playable, ['toothache'], 'toothache is not "go"')

  const L = () => point(model, 'hand.L'), R = () => point(model, 'hand.R')
  const tip = (side) => point(model, `index.03.${side}`)
  const rightRest = R(), leftRest = L()

  const head = model.getObjectByName('head')
  const headUp = () => new Vector3(0, 1, 0).applyQuaternion(head.getWorldQuaternion(new Quaternion()))
  const upright = headUp()
  library.wake_up.apply(1.0)
  const tiltDeg = headUp().angleTo(upright) * 180 / Math.PI
  assert.ok(Math.abs(tiltDeg - 20) < 2, `wake up: head tilts 20° (got ${tiltDeg.toFixed(1)}°)`)
  assert.ok(headUp().x < 0, 'wake up: head tilts toward the signing hand')
  const palm = L().lerp(point(model, 'middle.03.L'), .4)
  const cheek = meshNearest(model, 'Head_|_facial_surface', palm)
  assert.ok(palm.distanceTo(cheek) < .14, 'wake up: palm pressed against the cheek')
  const pillowShape = point(model, 'middle.03.L').sub(L())
  library.wake_up.apply(2.3)
  assert.ok(headUp().angleTo(upright) < .06, 'wake up: head is upright again')
  assert.ok(point(model, 'middle.03.L').sub(L()).angleTo(pillowShape) < .1, 'wake up: hand leaves in the same shape')
  assert.ok(L().x < -1.2, 'wake up: hand pulled away from the cheek')

  const watchSpot = () => R().lerp(point(model, 'forearm.R'), .15)
  library.time.apply(.85)
  assert.ok(tip('L').distanceTo(watchSpot()) < .15, 'time: index fingertip on the other wrist')
  library.time.apply(1.1)
  assert.ok(tip('L').y > watchSpot().y + .15, 'time: index lifts between taps')
  library.hour.apply(1.2)
  assert.ok(tip('L').distanceTo(watchSpot()) < .15, 'hour: index fingertip on the other wrist')
  library.meet.apply(1.5)
  assert.ok(tip('L').distanceTo(tip('R')) < .25, 'meet: the index fingers come together')
  // Father and older sister turn the body about 30° toward the screen's right first.
  const chest = model.getObjectByName('chest')
  const facing = () => new Vector3(0, 0, 1).applyQuaternion(chest.getWorldQuaternion(new Quaternion()))
  const front = facing()
  const turnDeg = () => Math.sign(facing().x) * facing().angleTo(front) * 180 / Math.PI
  for (const [id, before, during] of [['father', .5, 1.1], ['older_sister', .5, 2.5]]) {
    library[id].apply(before)
    assert.ok(Math.abs(turnDeg() - 30) < 3 && L().y < 3, `${id}: turns 30° right before the hand moves`)
    library[id].apply(during)
    assert.ok(Math.abs(turnDeg() - 30) < 3, `${id}: stays turned while signing (got ${turnDeg().toFixed(1)}°)`)
  }
  library.father.apply(1.1)
  const mouth = meshNearest(model, 'Lower_lip', tip('L'))
  assert.ok(tip('L').distanceTo(mouth) < .2, 'father: index at the lips, even with the body turned')
  library.mother.apply(.65)
  assert.ok(tip('L').x < -.9 && tip('L').y > 4.7, 'mother: index at the earlobe')
  const circleY = []
  for (let time = .9; time <= 2.1; time += .02) { library.mother.apply(time); circleY.push(tip('L').y) }
  assert.ok(Math.max(...circleY) - Math.min(...circleY) > .18, 'mother: circles are big')
  library.younger_brother.apply(.9)
  assert.ok(Math.abs(tip('L').y - 4.88) < .1 && Math.abs(tip('L').x) < .15, 'brother: index across the upper lip')

  library.tomorrow.apply(1.6); const tomorrowEnd = L()
  library.day_after_tomorrow.apply(1.8); const dayAfterEnd = L()
  assert.ok(dayAfterEnd.x < tomorrowEnd.x - .1, 'the day after tomorrow arcs further out than tomorrow')
  library.younger_brother.apply(2.6); const down = L().y
  library.older_brother.apply(2.6); const up = L().y
  assert.ok(down < 3.0 && up > 4.2, 'younger brother ends low, older brother ends high')

  for (const id of Object.keys(text)) {
    const clip = library[id], duration = SIGN_DURATIONS[id]
    for (let time = 0; time <= duration; time += 1 / 30) {
      clip.apply(time)
      model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite), id))
    }
    clip.apply(duration)
    assert.ok(point(model, 'hand.L').distanceTo(leftRest) < 1e-3 && point(model, 'hand.R').distanceTo(rightRest) < 1e-3, `${id} returns to rest`)
  }
})

test('safe, pound, obviously, severe, El Niño, hundred, kilogram and gram match the book', async () => {
  const model = await loadCharacter()
  const library = createSignLibrary(model)
  const text = {
    safe: 'လုံခြုံ', pound: 'ပေါင်', obviously: 'ထင်ရှား', severe: 'အပြင်းအထန်',
    el_nino: 'အယ်လ်နီညို', hundred: 'ဟန်ဒြက်', kilogram: 'ကီလိုဂရမ်', gram: 'ဂရမ်',
  }
  for (const [id, my] of Object.entries(text)) assert.deepEqual(planSigns(my).playable, [id], my)
  assert.deepEqual(planSigns('ဟန်းဒရက်').playable, ['hundred'], 'the other spelling of hundred')
  assert.deepEqual(planSigns('kg').playable, ['kilogram'])

  const P = (name) => point(model, name)
  const rightRest = P('hand.R'), leftRest = P('hand.L')
  const face = (target) => meshNearest(model, 'Head_|_facial_surface', target).distanceTo(target)
  const shirt = (target) => meshNearest(model, 'Traditional_shirt_|_continuous_long_sleeves', target).distanceTo(target)

  library.safe.apply(1.0)
  assert.ok(P('hand.L').x > .3 && P('hand.R').x < -.3, 'safe: arms crossed, each hand on the other side')
  assert.ok(shirt(P('hand.L').lerp(P('middle.03.L'), .4)) < .15 && shirt(P('hand.R').lerp(P('middle.03.R'), .4)) < .15, 'safe: hands rest on the shoulders')
  assert.ok(P('hand.L').z > P('hand.R').z, 'safe: left arm crossed in front')
  library.safe.apply(2.7)
  assert.ok(P('index.03.L').distanceTo(P('thumb.03.L')) < .08, 'safe: thumb and index close into an OK circle')
  assert.ok(P('middle.03.L').y > P('hand.L').y + .4, 'safe: the other three fingers stay up')

  library.pound.apply(.9)
  const lIndex = P('index.03.L').sub(P('hand.L')), lThumb = P('thumb.03.L').sub(P('hand.L'))
  assert.ok(lIndex.y > .45 && lThumb.x > .25 && lThumb.y < .2, 'pound: L hand, index up and thumb out to the side')
  library.pound.apply(1.8)
  assert.ok(['index', 'middle', 'ring', 'pinky'].every((f) => P(`${f}.03.L`).y > P('hand.L').y + .4), 'pound: four fingers up')
  assert.ok(P('thumb.03.L').z > P('hand.L').z + .05, 'pound: thumb folded across the palm')

  library.obviously.apply(1.0)
  assert.ok(face(P('index.03.L')) < .1 && P('index.03.L').y > 5.2, 'obviously: fingertips at the eye')
  library.obviously.apply(1.6)
  assert.ok(P('index.03.L').z > P('hand.L').z + .3, 'obviously: index points straight forward')
  library.obviously.apply(3.2)
  assert.ok(P('hand.L').y < 3.1 && P('hand.R').y > 3.4, 'obviously: signing hand sweeps down while the other is held up')

  library.severe.apply(.8)
  assert.ok(P('index.03.L').x > P('hand.L').x + .4, 'severe: V lies across the chest')
  library.severe.apply(1.6)
  assert.ok(P('hand.L').y > 4.3 && P('index.03.L').y > P('hand.L').y + .4, 'severe: flicked up beside the head, fingers up')
  assert.ok(P('index.03.L').distanceTo(P('middle.03.L')) > .15, 'severe: index and middle open into a V')

  library.el_nino.apply(.7)
  assert.ok(face(P('index.03.L')) < .08 && Math.abs(P('index.03.L').y - 4.62) < .1, 'El Niño: flat hand just under the lips')
  library.el_nino.apply(2.5)
  assert.ok(P('hand.L').distanceTo(P('hand.R')) < .6, 'El Niño: the hands come together')
  library.el_nino.apply(3.35)
  assert.ok(face(P('index.03.L')) < .1 && P('index.03.L').y > 5.3, 'El Niño: hand at the side of the forehead')
  library.el_nino.apply(4.1)
  assert.ok(face(P('index.03.L')) > .3, 'El Niño: wiped off, away from the head')

  library.hundred.apply(.8)
  assert.ok(face(P('index.03.L')) < .08 && P('index.03.L').y < 4.45, 'hundred: index under the chin')
  library.hundred.apply(2.0)
  assert.ok(['index', 'middle', 'ring'].every((f) => P(`${f}.03.L`).y > P('hand.L').y + .4) && P('pinky.03.L').y < P('hand.L').y + .3, 'hundred: 3 hand')

  library.kilogram.apply(.9)
  assert.ok(P('index.03.L').y > P('hand.L').y + .45 && P('middle.03.L').distanceTo(P('thumb.03.L')) < .2, 'kilogram: K hand')
  for (const [id, time] of [['kilogram', 2.0], ['gram', 1.0]]) {
    library[id].apply(time)
    const index = P('index.03.L'), thumb = P('thumb.03.L'), hand = P('hand.L')
    assert.ok(index.x > hand.x + .4 && index.y > thumb.y + .05 && index.distanceTo(thumb) < .35, `${id}: G hand, index over the thumb with a gap`)
  }

  for (const id of Object.keys(text)) {
    const clip = library[id], duration = SIGN_DURATIONS[id]
    for (let time = 0; time <= duration; time += 1 / 30) {
      clip.apply(time)
      model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite), id))
    }
    clip.apply(duration)
    assert.ok(P('hand.L').distanceTo(leftRest) < 1e-3 && P('hand.R').distanceTo(rightRest) < 1e-3, `${id} returns to rest`)
  }
})

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

test('sick / fever: back of the left hand on the forehead, slanted 45°, palm forward', async () => {
  const model = await loadCharacter()
  const clip = createSignLibrary(model).sick
  clip.idle()
  const restLeft = point(model, 'hand.L').clone()
  const restRight = point(model, 'hand.R').clone()
  clip.apply(1.4)
  const hand = point(model, 'hand.L'), middle = point(model, 'middle.03.L')
  const fingers = middle.clone().sub(hand).normalize()
  const slant = Math.atan2(fingers.y, Math.hypot(fingers.x, fingers.z)) * 180 / Math.PI
  assert.ok(Math.abs(slant - 45) < 10, `hand slants about 45° (got ${slant.toFixed(1)}°)`)
  const palm = point(model, 'index.01.L').sub(hand).cross(point(model, 'pinky.01.L').sub(hand)).normalize()
  const knuckles = hand.clone().lerp(middle, .45)
  const face = meshNearest(model, 'Head_|_facial_surface', knuckles)
  assert.ok(knuckles.distanceTo(face) < .12, 'back of the hand rests on the face')
  const brow = new Box3().setFromObject(model.getObjectByName('EyebrowR')).min.y
  assert.ok(middle.y > brow, 'fingers lie across the forehead, above the eyebrows')
  assert.ok(Math.abs(palm.z) > .5, 'palm faces forward (back of the hand toward the head)')
  assert.ok(point(model, 'hand.R').distanceTo(restRight) < .15, 'right hand rests')
  clip.apply(1.8)
  assert.ok(point(model, 'hand.L').distanceTo(hand) < .02, 'held still on the forehead')
  clip.apply(SICK_DURATION)
  assert.ok(point(model, 'hand.L').distanceTo(restLeft) < 1e-4, 'return to rest')
  let previous = restLeft
  for (let t = 0; t <= SICK_DURATION; t += 1 / 120) {
    clip.apply(t)
    const wrist = point(model, 'hand.L')
    assert.ok(wrist.distanceTo(previous) < .05, 'no sudden wrist jump during playback')
    model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
    previous = wrist
  }
  assert.equal(matchSign('Sick'), 'sick')
  assert.equal(matchSign('နေမကောင်းပါ'), 'sick')
  assert.deepEqual(planSigns('နေမကောင်းပါ').playable, ['sick'])
  assert.deepEqual(planSigns('အဖျား').playable, ['sick'], 'fever uses the same sign')
  assert.deepEqual(planSigns('fever').playable, ['sick'])
})

async function loadCharacter() {
  const data = await readFile(new URL('../public/models/WarmHands_Character.glb', import.meta.url))
  const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '')
  return gltf.scene
}
const point = (model, name) => model.getObjectByName(PropertyBinding.sanitizeNodeName(name)).getWorldPosition(new Vector3())

/** The posed vertex of a skinned mesh closest to `target`. */
function meshNearest(model, name, target) {
  const mesh = model.getObjectByName(PropertyBinding.sanitizeNodeName(name))
  mesh.skeleton.update()
  const vertex = new Vector3(), best = new Vector3()
  let bestDistance = Infinity
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    mesh.localToWorld(mesh.getVertexPosition(i, vertex))
    const distance = vertex.distanceTo(target)
    if (distance < bestDistance) { bestDistance = distance; best.copy(vertex) }
  }
  return best
}

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
  const plan = planSigns('ကျေးဇူးပြု၍ ဆေးရုံ')
  assert.deepEqual(plan.signs, ['please', 'hospital'])
  assert.deepEqual(plan.playable, ['please'])
  assert.deepEqual(plan.pending, ['hospital'])
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

test('medicine, cough and toothache are signed with the left hand', async () => {
  const model = await loadCharacter()
  model.updateMatrixWorld(true)
  const leftRest = point(model, 'hand.L')
  const rightRest = point(model, 'hand.R')
  const library = createSignLibrary(model)
  const P = (name) => point(model, name)

  library.medicine.apply(1.1)
  assert.ok(P('hand.L').y > 4.1, 'medicine: left hand raises the pill to the mouth')
  assert.ok(P('hand.R').distanceTo(rightRest) < .15, 'medicine: right hand rests')

  library.cough.apply(.8)
  const chestPalm = () => P('hand.L').lerp(P('middle.03.L'), .4)
  const start = chestPalm()
  assert.ok(chestPalm().distanceTo(meshNearest(model, 'Traditional_shirt_|_continuous_long_sleeves', chestPalm())) < .1, 'cough: palm on the chest')
  library.cough.apply(1.05); const up = chestPalm()
  library.cough.apply(1.35); const down = chestPalm()
  library.cough.apply(1.6); const upAgain = chestPalm()
  assert.ok(up.y > start.y + .1 && down.y < up.y - .1 && upAgain.y > down.y + .1 && upAgain.x > start.x + .08, 'cough: zigzag up, down-across, up')
  assert.ok(P('hand.R').distanceTo(rightRest) < .15, 'cough: right hand rests')
  const mouth = model.getObjectByName('mouthOpening')
  const mouthHeight = () => { model.updateMatrixWorld(true); const box = new Box3().setFromObject(mouth); return mouth.visible ? box.max.y - box.min.y : 0 }
  library.cough.apply(.95); const coughOpen = mouthHeight()
  library.cough.apply(1.05); const coughWide = mouthHeight()
  assert.ok(coughOpen > .03, 'cough: mouth a little open')
  assert.ok(coughWide > coughOpen, 'cough: mouth opens a bit more on each cough')
  library.cough.apply(2.6)
  assert.ok(!mouth.visible, 'cough: mouth closes again')

  library.toothache.apply(1.1)
  model.updateMatrixWorld(true)
  const opening = new Box3().setFromObject(mouth)
  assert.ok(mouth.visible, 'toothache: mouth open around the finger')
  const base = P('index.01.L'), tip = P('index.03.L')
  const fromVertical = tip.clone().sub(base).normalize().angleTo(new Vector3(0, 1, 0)) * 180 / Math.PI
  assert.ok(fromVertical > 10 && fromVertical < 35, `toothache: index nearly upright, slanted a little (got ${fromVertical.toFixed(1)}°)`)
  assert.ok(tip.y > opening.min.y - .03 && tip.y < opening.max.y + .03 && tip.x > opening.min.x && tip.x < opening.max.x, 'toothache: fingertip held between the teeth')
  assert.ok(base.y < opening.min.y, 'toothache: finger comes up into the mouth from below')
  assert.ok(tip.z > opening.min.z + .1, 'toothache: finger in front, not hidden inside the head')
  library.toothache.apply(1.9)
  const jaw = P('hand.L').lerp(P('middle.03.L'), .4)
  assert.ok(jaw.distanceTo(meshNearest(model, 'Head_|_facial_surface', jaw)) < .15 && jaw.x < -.4, 'toothache: hand at the side of the jaw')
  const shake = []
  for (let time = 1.95; time <= 2.95; time += .05) { library.toothache.apply(time); shake.push(P('hand.L').x) }
  assert.ok(Math.max(...shake) - Math.min(...shake) > .02, 'toothache: hand trembles at the jaw')

  for (const [clip, duration] of [[library.medicine, MEDICINE_DURATION], [library.cough, SIGN_DURATIONS.cough], [library.toothache, SIGN_DURATIONS.toothache]]) {
    for (let time = 0; time <= duration; time += 1 / 30) {
      clip.apply(time)
      model.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)))
    }
    clip.apply(duration)
    assert.ok(P('hand.L').distanceTo(leftRest) < 1e-4 && P('hand.R').distanceTo(rightRest) < 1e-4)
  }
  assert.deepEqual(planSigns('ချောင်းဆိုး').playable, ['cough'])
  assert.deepEqual(planSigns('cough').playable, ['cough'])
})
