/**
 * Second pass after build_clips.py: plays every generated clip on the real rig,
 * measures each finger joint against the body surface and moves the wrist of
 * any key forward until no finger is inside the face or torso. Rewrites only the
 * wrist depth in src/animation/clips/<sign>.ts.
 *
 *   node --import ./tools/avatar/ts-resolve.mjs tools/avatar/fix_contacts.mjs [sign ...]
 */
import { readFile, writeFile } from 'node:fs/promises'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { PropertyBinding, Vector3 } from 'three'
import { createRecordedClip, MIRROR_RECORDED } from '../../src/animation/clips/recorded.ts'
import { RECORDED_SIGN_IDS } from '../../src/animation/clips/recorded.generated.ts'

const MARGIN = 0.05
const { grid, front } = JSON.parse(await readFile(new URL('./calibration.json', import.meta.url), 'utf8'))
const surface = (x, y) => {
  const i = (y - grid.y0) / grid.step, j = (x - grid.x0) / grid.step
  let best = null
  for (const ii of [Math.floor(i), Math.ceil(i)]) for (const jj of [Math.floor(j), Math.ceil(j)]) {
    const v = front[ii]?.[jj]
    if (v !== null && v !== undefined && (best === null || v > best)) best = v
  }
  return best
}

const glb = await readFile(new URL('../../public/models/WarmHands_Character.glb', import.meta.url))
const model = (await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '')).scene
model.updateMatrixWorld(true)
const at = (n) => model.worldToLocal(model.getObjectByName(PropertyBinding.sanitizeNodeName(n)).getWorldPosition(new Vector3()))
const headBone = model.getObjectByName('head')
const headRest = headBone.matrixWorld.clone()
const HEAD_GAP = 0.04
/** A point next to the head, moved back to where it would be on the un-leaned head. */
const onRestHead = (p) => {
  headBone.updateWorldMatrix(true, false)
  return p.clone().applyMatrix4(headBone.matrixWorld.clone().invert()).applyMatrix4(headRest)
}
const isHead = (q) => q.y > 4.35 && q.y < 6.7 && Math.abs(q.x) < 1.05
const DIGITS = ['thumb', 'index', 'middle', 'ring', 'pinky']

function handPoints(side) {
  const pts = [at(`hand.${side}`)]
  for (const d of DIGITS) {
    const j = [1, 2, 3].map((k) => at(`${d}.0${k}.${side}`))
    pts.push(...j, j[2].clone().add(j[2].clone().sub(j[1]).multiplyScalar(0.85)))
  }
  return pts
}

/** Deepest point of one hand inside the face/torso (> 0 = penetrating); the head is taken where it is now. */
function depthInside(side) {
  let worst = -Infinity
  for (const p of handPoints(side)) {
    const q = onRestHead(p)
    const r = isHead(q) ? q : p
    const s = surface(r.x, r.y)
    if (s === null || Math.abs(r.x) > 0.8 || r.y < 2.3 || r.y > 6.6 || r.z < -0.2) continue
    worst = Math.max(worst, s + MARGIN - r.z)
  }
  return worst
}

/** Gap between the head surface and the nearest fingertip in front of the face (null if none). */
function fingertips(side) {
  return DIGITS.flatMap((d) => {
    const b = at(`${d}.02.${side}`), c = at(`${d}.03.${side}`)
    return [c, c.clone().add(c.clone().sub(b).multiplyScalar(0.85))]
  })
}

function headGap(side) {
  let best = null
  for (const p of fingertips(side)) {
    const q = onRestHead(p)
    if (!isHead(q) || Math.abs(q.x) > 0.9) continue
    const s = surface(q.x, q.y)
    if (s === null || s < 0.3) continue // only the front of the face, not its sides
    const g = q.z - s
    if (best === null || g < best) best = g
  }
  return best
}

/**
 * Signs at the head: the arm is at full reach, so the head leans to meet the hand.
 * Scale the whole clip's lean by one factor so the deepest fingertip just touches
 * the head (HEAD_GAP in front of it) at the moment it is deepest. Returns the change.
 */
function fitHeadLean(keys, duration, boneOf) {
  const heads = []
  keys.forEach((key) => [1, 2].forEach((e) => { if (key[e] && key[e].h) heads.push([key, e, [...key[e].h]]) }))
  if (!heads.length) return 0
  const deepest = (f) => {
    for (const [key, e, h] of heads) key[e].h = h.map((v) => v * f)
    const clip = createRecordedClip(model, keys, duration)
    let worst = Infinity
    for (const [key, e] of heads) {
      clip.apply(key[0])
      const g = headGap(boneOf[e - 1])
      if (g !== null) worst = Math.min(worst, g)
    }
    clip.reset()
    return worst
  }
  let lo = 0, hi = 1.6 // gap shrinks as the lean grows
  if (deepest(hi) >= HEAD_GAP) lo = hi
  else if (deepest(lo) <= HEAD_GAP) hi = lo
  else for (let k = 0; k < 18; k++) { const mid = (lo + hi) / 2; if (deepest(mid) > HEAD_GAP) lo = mid; else hi = mid }
  const f = lo
  for (const [key, e, h] of heads) key[e].h = h.map((v) => v * f)
  return Math.abs(f - 1) * Math.max(...heads.map(([, , h]) => h[0]))
}

const fmt = (x) => {
  let s = x.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  if (s === '-0' || s === '') s = '0'
  return s.replace(/^(-?)0\./, '$1.')
}

async function fix(id) {
  const url = new URL(`../../src/animation/clips/${id}.ts`, import.meta.url)
  const src = await readFile(url, 'utf8')
  const lines = src.split('\n')
  const rows = lines.map((line, i) => [line, i]).filter(([line]) => /^ {2}\[[\d.]+, /.test(line))
  const keys = rows.map(([line]) => Function(`return ${line.trim().replace(/,$/, '')}`)())
  const duration = Number(src.match(/_DURATION = ([\d.]+)/)[1])
  // playback bone side for each key entry (entry 1 = signer's right hand)
  const boneOf = MIRROR_RECORDED ? ['R', 'L'] : ['L', 'R']
  let moved = fitHeadLean(keys, duration, boneOf)
  for (let pass = 0; pass < 5; pass++) {
    const clip = createRecordedClip(model, keys, duration)
    let changed = false
    keys.forEach((key, i) => {
      const times = [key[0]]
      if (i + 1 < keys.length) times.push((key[0] + keys[i + 1][0]) / 2)
      for (const entry of [1, 2]) {
        if (!key[entry]) continue
        if (key[entry].h) continue // head contact is set by fitHeadLean() below
        let need = -Infinity
        for (const t of times) { clip.apply(t); need = Math.max(need, depthInside(boneOf[entry - 1])) }
        if (need > 0.005) { key[entry].w[2] += need; moved = Math.max(moved, need); changed = true }
      }
    })
    clip.reset() // the next clip records the model's current pose as its rest pose
    if (!changed) break
  }
  rows.forEach(([line, li], k) => {
    // occurrences in order: entry 1's w (and h), then entry 2's w (and h)
    const entries = [1, 2].filter((e) => keys[k][e])
    let current = -1
    lines[li] = line.replace(/(w|h): \[([^\]]+)\]/g, (m, field) => {
      if (field === 'w') current += 1
      const arm = keys[k][entries[current]]
      return `${field}: [${arm[field].map(fmt).join(', ')}]`
    })
  })
  if (moved > 0) await writeFile(url, lines.join('\n'))
  return moved
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : RECORDED_SIGN_IDS
for (const id of ids) {
  const moved = await fix(id)
  if (moved > 0) console.log(`${id.padEnd(20)} adjusted contact by up to ${moved.toFixed(3)}`)
}
console.log(`checked ${ids.length} clips`)
