/**
 * Looping gallery of every avatar sign, outside the app (the app's own code is untouched).
 *   /tools/avatar/gallery.html             earlier signs + the 30 spreadsheet signs
 *   /tools/avatar/gallery.html?show=new    only the 30 spreadsheet signs
 *   /tools/avatar/gallery.html?show=old    only the earlier signs
 *   /tools/avatar/gallery.html?show=kachin,fine   chosen signs
 * One WebGL renderer draws every visible tile in turn.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { SignAnimation } from '../../src/animation/armPlayback'
import { ANIMATED_SIGN_IDS, createSignLibrary, type SignId } from '../../src/animation/signs'
import { signLabel } from '../../src/api/translation'
import {
  createRecordedSignLibrary, RECORDED_ENGLISH, RECORDED_LABELS, RECORDED_SIGN_IDS, type RecordedSignId,
} from '../../src/animation/clips/recorded.generated'

const SIZE = 360
const PAUSE = 0.6 // seconds at rest between loops

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setSize(SIZE, SIZE)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xfff3e3)
scene.add(new THREE.HemisphereLight(0xfff4df, 0x8a827a, 2.5))
const key = new THREE.DirectionalLight(0xffecd6, 3); key.position.set(3, 8, 8); scene.add(key)
const fill = new THREE.DirectionalLight(0xe2edff, 1.5); fill.position.set(-6, 4, 4); scene.add(fill)
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
camera.position.set(0, 4.3, 13)
camera.lookAt(0, 4.3, 0)

const model = (await new GLTFLoader().loadAsync('/models/WarmHands_Character.glb')).scene
scene.add(model)
model.updateMatrixWorld(true)

// Both libraries are built at the rest pose, before anything is played.
const oldLibrary = createSignLibrary(model)
const newLibrary = createRecordedSignLibrary(model)
const isNew = (id: string): id is RecordedSignId => (RECORDED_SIGN_IDS as readonly string[]).includes(id)
const oldIds = ANIMATED_SIGN_IDS.filter((id) => !isNew(id)) as SignId[]

type Tile = { id: string, clip: SignAnimation, ctx: CanvasRenderingContext2D, start: number, visible: boolean }
const tiles: Tile[] = []
const main = document.getElementById('main')!
const observer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const tile = tiles.find((t) => t.ctx.canvas === e.target)
    if (tile) tile.visible = e.isIntersecting
  }
})

function section(title: string, ids: string[]) {
  if (!ids.length) return
  main.append(Object.assign(document.createElement('h2'), { textContent: `${title} (${ids.length})` }))
  const grid = Object.assign(document.createElement('div'), { className: 'grid' })
  main.append(grid)
  for (const id of ids) {
    const clip = isNew(id) ? newLibrary[id] : oldLibrary[id as SignId]
    if (!clip) continue
    const canvas = Object.assign(document.createElement('canvas'), { width: SIZE, height: SIZE })
    const caption = document.createElement('figcaption')
    const my = isNew(id) ? RECORDED_LABELS[id] : signLabel(id as SignId)
    const en = isNew(id) ? RECORDED_ENGLISH[id] : id.replace(/_/g, ' ')
    caption.innerHTML = `<b></b><br><small></small>`
    caption.querySelector('b')!.textContent = my
    caption.querySelector('small')!.textContent = `${en} · ${id} · ${clip.duration.toFixed(1)} s`
    const fig = document.createElement('figure')
    fig.append(canvas, caption)
    grid.append(fig)
    const tile: Tile = { id, clip, ctx: canvas.getContext('2d')!, start: performance.now() / 1000, visible: false }
    fig.addEventListener('click', () => { tile.start = performance.now() / 1000 })
    tiles.push(tile)
    observer.observe(canvas)
  }
}

const show = new URLSearchParams(location.search).get('show') ?? 'all'
if (show === 'all' || show === 'old') section('Earlier signs', oldIds)
if (show === 'all' || show === 'new') section('Signs from MSL for Warm Hands.xlsx', [...RECORDED_SIGN_IDS])
if (!['all', 'old', 'new'].includes(show)) section('Chosen signs', show.split(','))

function frame() {
  const now = performance.now() / 1000
  for (const tile of tiles) {
    if (!tile.visible) continue
    const t = (now - tile.start) % (tile.clip.duration + PAUSE)
    tile.clip.apply(Math.min(t, tile.clip.duration))
    renderer.render(scene, camera)
    tile.ctx.drawImage(renderer.domElement, 0, 0)
    tile.clip.idle() // back to rest before the next tile's clip is applied
  }
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
