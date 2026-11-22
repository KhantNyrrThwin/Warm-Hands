/**
 * Measures the Warm Hands character so recorded MediaPipe landmarks can be
 * retargeted onto it. Writes tools/avatar/calibration.json.
 *
 *   node tools/avatar/calibrate.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { PropertyBinding, Vector3 } from 'three'
import { createSignAnimation, REST_LEFT, REST_RIGHT } from '../../src/animation/armPlayback.ts'
import { createHandArticulation } from '../../src/animation/handArticulation.ts'

const glb = await readFile(new URL('../../public/models/WarmHands_Character.glb', import.meta.url))
const model = (await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '')).scene
model.updateMatrixWorld(true)
const r3 = (v) => v.toArray().map((x) => +x.toFixed(4))
const node = (n) => model.getObjectByName(PropertyBinding.sanitizeNodeName(n))
const at = (n) => model.worldToLocal(node(n).getWorldPosition(new Vector3()))
const meshVerts = (mesh) => {
  mesh.skeleton?.update()
  const out = [], v = new Vector3()
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    mesh.getVertexPosition(i, v)
    out.push(model.worldToLocal(mesh.localToWorld(v.clone())))
  }
  return out
}
const centre = (n) => { const vs = meshVerts(node(n)); return vs.reduce((a, b) => a.add(b), new Vector3()).divideScalar(vs.length) }

// ---- body surface (front-most z of everything except arms/hands) at rest
const skip = /Arm_|Nail|Finger_crease|Palm_crease|cuff|Sandal|Foot|Calf|Catchlight|Pupil|Iris/
const grid = { x0: -1.8, y0: 1.6, step: 0.05, nx: 73, ny: 106 }
const front = Array.from({ length: grid.ny }, () => new Array(grid.nx).fill(null))
// Rasterise every front-facing-or-not triangle into a z-buffer (max z per cell centre),
// so the surface is exact between vertices.
const meshes = []
model.traverse((o) => { if (o.isMesh && !skip.test(o.name)) meshes.push(o) })
for (const o of meshes) {
  const sleeves = /continuous_long_sleeves/.test(o.name)
  const v = meshVerts(o)
  const index = o.geometry.index ? o.geometry.index.array : v.map((_, k) => k)
  for (let t = 0; t + 2 < index.length; t += 3) {
    const a = v[index[t]], b = v[index[t + 1]], c = v[index[t + 2]]
    if (sleeves && (Math.abs(a.x) > 0.78 || Math.abs(b.x) > 0.78 || Math.abs(c.x) > 0.78)) continue // sleeves hang with the arms
    const j0 = Math.max(0, Math.ceil((Math.min(a.x, b.x, c.x) - grid.x0) / grid.step))
    const j1 = Math.min(grid.nx - 1, Math.floor((Math.max(a.x, b.x, c.x) - grid.x0) / grid.step))
    const i0 = Math.max(0, Math.ceil((Math.min(a.y, b.y, c.y) - grid.y0) / grid.step))
    const i1 = Math.min(grid.ny - 1, Math.floor((Math.max(a.y, b.y, c.y) - grid.y0) / grid.step))
    const den = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y)
    if (Math.abs(den) < 1e-12) continue
    for (let i = i0; i <= i1; i++) {
      const y = grid.y0 + i * grid.step
      for (let j = j0; j <= j1; j++) {
        const x = grid.x0 + j * grid.step
        const w1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / den
        const w2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / den
        const w3 = 1 - w1 - w2
        if (w1 < -1e-9 || w2 < -1e-9 || w3 < -1e-9) continue
        const z = w1 * a.z + w2 * b.z + w3 * c.z
        if (front[i][j] === null || z > front[i][j]) front[i][j] = +z.toFixed(3)
      }
    }
  }
}

// ---- face anchors
const face = meshVerts(node('Head_|_facial_surface'))
const chin = face.filter((v) => Math.abs(v.x) < 0.08 && v.z > 0.2).reduce((a, b) => (b.y < a.y ? b : a))
const brow = centre('EyebrowL').add(centre('EyebrowR')).multiplyScalar(0.5)
const anchors = {
  shoulderL: r3(at('upper_arm.L')), shoulderR: r3(at('upper_arm.R')),
  nose: r3(centre('Nose_tip')), mouth: r3(centre('Smile_|_gentle_closed_mouth')),
  eyeL: r3(centre('IrisR')), eyeR: r3(centre('IrisL')), // mesh R = bone L side (viewer's left)
  earL: r3(centre('EarR')), earR: r3(centre('EarL')),
  chin: r3(chin), brow: r3(brow),
  neck: r3(at('neck')), chest: r3(at('chest')), spine: r3(at('spine')), hips: r3(at('hips')),
}

// ---- hand. The hand frame is built the same way for the avatar and for
// MediaPipe landmarks: y = wrist -> middle knuckle, x = pinky knuckle -> index
// knuckle (made perpendicular to y), z = x × y. For a right hand z is the palm
// normal. Bone side L is an anatomical right hand, like the signer's right.
// One animation, created at the true rest pose; probes mutate its pose in place.
const probePose = { wrist: [-0.4, 3.4, 0.9], direction: [0, 1, 0], palm: [0, 0, 1], gather: 0, handShape: {} }
const probeClip = createSignAnimation(model, [0, 1, 2].map((time) => ({ time, left: probePose, right: REST_RIGHT })), 2)
const probe = (direction, palm, shape) => {
  Object.assign(probePose, { direction, palm, handShape: shape ?? {} })
  probeClip.apply(1)
}
const frame = () => {
  const w = at('hand.L'), y = at('middle.01.L').sub(w).normalize()
  const x = at('index.01.L').sub(at('pinky.01.L')); x.addScaledVector(y, -x.dot(y)).normalize()
  return { w, x, y, z: new Vector3().crossVectors(x, y) }
}
const local = (p, f) => { const d = p.clone().sub(f.w); return [d.dot(f.x), d.dot(f.y), d.dot(f.z)] }
const fix = (a) => a.map((v) => +v.toFixed(4))

probe([0, 1, 0], [0, 0, 1])
let f = frame()
// Rig frame produced by basis(direction=[0,1,0], palm=[0,0,1]) = identity.
const M0 = { x: r3(f.x), y: r3(f.y), z: r3(f.z) }
const knuckle = at('middle.01.L').distanceTo(f.w)
const handLength = centre('NailmiddleR').distanceTo(f.w) + 0.06

// finger flexion gain/sign and spread gain/sign, per digit
const digits = ['index', 'middle', 'ring', 'pinky']
const seg = (d) => { const f2 = frame(); const a = local(at(`${d}.01.L`), f2), b = local(at(`${d}.02.L`), f2); return [b[0] - a[0], b[1] - a[1], b[2] - a[2]] }
const ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, (u[0]*v[0]+u[1]*v[1]+u[2]*v[2]) / Math.hypot(...u) / Math.hypot(...v))))
const fingers = {}
probe([0, 1, 0], [0, 0, 1], {})
const neutral = Object.fromEntries(digits.map((d) => [d, seg(d)]))
const base = Object.fromEntries(digits.map((d) => [d, fix(local(at(`${d}.01.L`), frame()).map((v) => v / knuckle))]))
for (const d of digits) {
  probe([0, 1, 0], [0, 0, 1], { curl: { [d]: [0.8, 0, 0] } })
  const flexed = seg(d)
  probe([0, 1, 0], [0, 0, 1], { spread: { [d]: 0.3 } })
  const spread = seg(d)
  const abd = (v) => Math.atan2(v[0], v[1])
  fingers[d] = {
    neutralAbduction: +abd(neutral[d]).toFixed(4),
    neutralFlex: +Math.atan2(-neutral[d][2], Math.hypot(neutral[d][0], neutral[d][1])).toFixed(4),
    flexGain: +(ang(neutral[d], flexed) / 0.8).toFixed(4),
    flexTowardMinusZ: flexed[2] < neutral[d][2],
    spreadGain: +((abd(spread) - abd(neutral[d])) / 0.3).toFixed(4),
  }
}

// thumb lookup table: IP joint and tip in the hand frame, in knuckle lengths
const thumb = []
const tipOf = () => { const t = at('thumb.03.L'), p = at('thumb.02.L'); return t.clone().add(t.clone().sub(p).multiplyScalar(0.85)) }
for (const a of [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2])
  for (const b of [0, 0.25, 0.5, 0.75, 1.0, 1.3])
    for (const o of [0, 0.25, 0.5, 0.75, 1.0])
      for (const s of [-0.4, -0.2, 0, 0.2, 0.4]) {
        probe([0, 1, 0], [0, 0, 1], { curl: { thumb: [a, b, b * 0.7] }, thumbOpposition: o, spread: { thumb: s } })
        const f2 = frame()
        thumb.push({ a, b, o, s, tip: fix(local(tipOf(), f2).map((v) => v / knuckle)), ip: fix(local(at('thumb.03.L'), f2).map((v) => v / knuckle)) })
      }
const hand = {
  M0, knuckle: +knuckle.toFixed(4), length: +handLength.toFixed(4),
  upperArm: +at('upper_arm.L').distanceTo(at('forearm.L')).toFixed(4),
  forearm: +at('forearm.L').distanceTo(at('hand.L')).toFixed(4),
  base, fingers,
}

const out = {
  note: 'Generated by tools/avatar/calibrate.mjs. Model space: +y up, +z toward viewer, -x viewer-left (bone side L = anatomical right hand).',
  anchors, grid, front, hand, thumb,
}
await writeFile(new URL('./calibration.json', import.meta.url), JSON.stringify(out))
console.log(JSON.stringify(hand, null, 1))
