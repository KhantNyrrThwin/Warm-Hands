import type { Group, Material, Mesh, Texture } from 'three'
import type { SignId } from './signs'

/**
 * One shared WebGL renderer + character that draws a looping, GIF-like MSL
 * animation into any number of chat-bubble <canvas> elements.
 *
 * Browsers cap WebGL contexts (~16), so each bubble gets a plain 2D canvas and
 * this module poses the single model for that bubble's clip time, renders it
 * off-screen and copies the frame across. Only bubbles on screen are drawn.
 */

export type RendererStatus = 'idle' | 'loading' | 'ready' | 'fallback'

export const FRAME_SIZE = 320
const FPS = 24
const PAUSE_SECONDS = 1.1

type Engine = {
  draw: (signs: SignId[], seconds: number, loop: boolean, target: CanvasRenderingContext2D) => number
}

type Entry = {
  ctx: CanvasRenderingContext2D
  signs: SignId[]
  start: number
  loop: boolean
  visible: boolean
  lastIndex: number
  onClip?: (index: number) => void
}

let status: RendererStatus = 'idle'
let engine: Engine | null = null
let raf = 0
let lastFrame = 0
const entries = new Map<HTMLCanvasElement, Entry>()
const statusListeners = new Set<() => void>()
const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const setStatus = (next: RendererStatus) => {
  status = next
  statusListeners.forEach((listener) => listener())
}

export const getRendererStatus = () => status

export function subscribeRendererStatus(listener: () => void) {
  statusListeners.add(listener)
  return () => { statusListeners.delete(listener) }
}

const observer = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver((items) => {
    for (const item of items) {
      const entry = entries.get(item.target as HTMLCanvasElement)
      if (entry) entry.visible = item.isIntersecting
    }
  }, { threshold: 0.05 })
  : null

function disposeModel(model: Group) {
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  model.traverse((object) => {
    const mesh = object as Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.add(material)
      for (const value of Object.values(material)) {
        if (value && typeof value === 'object' && 'isTexture' in value) textures.add(value as Texture)
      }
    }
  })
  textures.forEach((texture) => texture.dispose())
  materials.forEach((material) => material.dispose())
}

async function createEngine(): Promise<Engine> {
  const [THREE, { GLTFLoader }, { createSignLibrary, SIGN_DURATIONS }] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('./signs'),
  ])
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(1)
  renderer.setSize(FRAME_SIZE, FRAME_SIZE, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.setClearColor(0x000000, 0)
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    setStatus('fallback')
  })

  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xfff4df, 0x8a827a, 2.5))
  const key = new THREE.DirectionalLight(0xffecd6, 3)
  const fill = new THREE.DirectionalLight(0xe2edff, 1.5)
  scene.add(key, fill)

  const response = await fetch(`${import.meta.env.BASE_URL}models/WarmHands_Character.glb`)
  if (!response.ok) throw new Error(`Character request failed: ${response.status}`)
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '')
  const model = gltf.scene
  const bounds = new THREE.Box3().setFromObject(model)
  const size = bounds.getSize(new THREE.Vector3())
  model.position.sub(bounds.getCenter(new THREE.Vector3()))
  scene.add(model)

  // Frame head to waist: where signs happen.
  const targetY = size.y * 0.16
  const half = Math.max(size.y * 0.36, size.x * 0.46)
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 100)
  camera.position.set(0, targetY, 12)
  camera.lookAt(0, targetY, 0)
  key.position.set(-3, 5 + targetY, 6)
  fill.position.set(4, 2 + targetY, 3)

  const library = createSignLibrary(model)
  window.addEventListener('pagehide', () => { disposeModel(model); renderer.dispose() }, { once: true })

  return {
    draw(signs, seconds, loop, target) {
      const total = signs.reduce((sum, id) => sum + SIGN_DURATIONS[id], 0) + PAUSE_SECONDS
      let t = loop ? seconds % total : Math.min(seconds, total)
      let index = -1
      for (let i = 0; i < signs.length; i++) {
        const duration = SIGN_DURATIONS[signs[i]]
        if (t < duration) { index = i; break }
        t -= duration
      }
      if (index >= 0) library[signs[index]].apply(t)
      else library[signs[0] ?? 'hello'].idle()
      renderer.render(scene, camera)
      target.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE)
      target.drawImage(renderer.domElement, 0, 0, FRAME_SIZE, FRAME_SIZE)
      return index
    },
  }
}

function ensureEngine() {
  if (status !== 'idle') return
  setStatus('loading')
  createEngine()
    .then((created) => {
      engine = created
      setStatus('ready')
      const now = performance.now()
      entries.forEach((entry) => { entry.start = now })
      raf = requestAnimationFrame(tick)
    })
    .catch((error: unknown) => {
      console.error('Unable to load the Warm Hands signing character:', error)
      setStatus('fallback')
    })
}

function tick(now: number) {
  raf = requestAnimationFrame(tick)
  if (!engine || status !== 'ready' || document.hidden) return
  if (now - lastFrame < 1000 / FPS) return
  lastFrame = now
  for (const entry of entries.values()) {
    if (!entry.visible || !entry.signs.length) continue
    const index = engine.draw(entry.signs, (now - entry.start) / 1000, entry.loop, entry.ctx)
    if (index !== entry.lastIndex) {
      entry.lastIndex = index
      entry.onClip?.(index)
    }
  }
}

export type SignPlayback = { restart: () => void; dispose: () => void }

/** Start looping `signs` into `canvas` (sized FRAME_SIZE²). */
export function playSigns(canvas: HTMLCanvasElement, signs: SignId[], onClip?: (index: number) => void): SignPlayback {
  const ctx = canvas.getContext('2d')
  if (!ctx) return { restart() {}, dispose() {} }
  canvas.width = FRAME_SIZE
  canvas.height = FRAME_SIZE
  const entry: Entry = {
    ctx,
    signs,
    start: performance.now(),
    loop: !reducedMotion,
    visible: !observer,
    lastIndex: -2,
    onClip,
  }
  entries.set(canvas, entry)
  observer?.observe(canvas)
  ensureEngine()
  return {
    restart() { entry.start = performance.now() },
    dispose() {
      observer?.unobserve(canvas)
      entries.delete(canvas)
      if (!entries.size && raf && status !== 'ready') cancelAnimationFrame(raf)
    },
  }
}
