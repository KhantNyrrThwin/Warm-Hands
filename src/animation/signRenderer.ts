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

export const FRAME_SIZE = 440
const FPS = 60
const PAUSE_SECONDS = 1.1

/**
 * The signing character. Set VITE_CHARACTER_MODEL (e.g. in .env.local) to a
 * GLB under /public to swap it, for example `models/Realistic_Human.glb`.
 */
const CHARACTER_FILE: string = import.meta.env.VITE_CHARACTER_MODEL || 'models/WarmHands_Character.glb'

const SIDE: Record<string, 'L' | 'R'> = { Left: 'L', Right: 'R' }
const BODY: Record<string, string> = { Hips: 'hips', Spine: 'spine', Spine1: 'spine1', Spine2: 'chest', Neck: 'neck', Head: 'head' }
const LIMB: Record<string, string> = { Shoulder: 'clavicle', Arm: 'upper_arm', ForeArm: 'forearm', Hand: 'hand', UpLeg: 'thigh', Leg: 'shin', Foot: 'foot' }

/** Map Mixamo / Ready Player Me humanoid bone names onto this project's rig names. */
export function canonicalBoneName(raw: string): string {
  const name = raw.replace(/^mixamorig\d*[:_]?/, '')
  if (BODY[name]) return BODY[name]
  const limb = /^(Left|Right)(Shoulder|Arm|ForeArm|Hand|UpLeg|Leg|Foot)$/.exec(name)
  if (limb) return `${LIMB[limb[2]]}.${SIDE[limb[1]]}`
  const finger = /^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)([1-3])$/.exec(name)
  if (finger) return `${finger[2].toLowerCase()}.0${finger[3]}.${SIDE[finger[1]]}`
  return raw
}

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
  /** Freeze playback at this many seconds (pose inspection). */
  at?: number
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
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
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

  const response = await fetch(`${import.meta.env.BASE_URL}${CHARACTER_FILE}`)
  if (!response.ok) throw new Error(`Character request failed: ${response.status}`)
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '')
  const model = gltf.scene
  model.traverse((object) => { if (object instanceof THREE.Bone) object.name = canonicalBoneName(object.name) })
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

  const bones: InstanceType<typeof THREE.Bone>[] = []
  model.traverse((object) => { if (object instanceof THREE.Bone) bones.push(object) })
  const findBone = (name: string) => bones.find((bone) => bone.name === name || bone.name === THREE.PropertyBinding.sanitizeNodeName(name))
  const chest = findBone('chest')
  const spine = findBone('spine')
  const neck = findBone('neck')
  const head = findBone('head')
  const snapshot = bones.map((bone) => bone.quaternion.clone())
  const turn = new THREE.Quaternion()
  const axisX = new THREE.Vector3(1, 0, 0)
  const axisY = new THREE.Vector3(0, 1, 0)
  const axisZ = new THREE.Vector3(0, 0, 1)
  const nudge = (bone: InstanceType<typeof THREE.Bone> | undefined, x: number, y: number, z: number) => {
    if (!bone) return
    bone.quaternion.multiply(turn.setFromAxisAngle(axisX, x))
    bone.quaternion.multiply(turn.setFromAxisAngle(axisY, y))
    bone.quaternion.multiply(turn.setFromAxisAngle(axisZ, z))
  }

  // Natural, never-frozen body: slow breathing, a little weight shift, and a
  // head that drifts and nods slightly, all on irrational periods so the loop
  // never looks mechanical.
  const alive = (clock: number, signing: number) => {
    const breath = Math.sin(clock * Math.PI * 2 / 4.2)
    nudge(spine, .006 * breath, .014 * Math.sin(clock * .73), .008 * Math.sin(clock * .51))
    nudge(chest, .012 * breath, .01 * Math.sin(clock * .61 + 1), 0)
    nudge(neck, .01 * Math.sin(clock * .9), .02 * Math.sin(clock * .47 + .4), .01 * Math.sin(clock * .37))
    // While signing the head nods gently with the rhythm of the hands.
    nudge(head, .03 * signing * Math.sin(clock * 2.6) + .012 * Math.sin(clock * 1.1), .025 * Math.sin(clock * .58 + 2), .012 * Math.sin(clock * .43 + 1))
    model.updateMatrixWorld(true)
  }

  // Inner sign boundaries skip most of the drop to rest and the rise back,
  // then cross-fade bone rotations so one sign flows into the next.
  const TRIM = .45
  const BLEND = .38
  const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
  const span = (signs: SignId[], i: number) => {
    const duration = SIGN_DURATIONS[signs[i]]
    const start = i > 0 ? TRIM : 0
    const end = i < signs.length - 1 ? duration - TRIM : duration
    return { start, end }
  }

  return {
    draw(signs, seconds, loop, target) {
      const total = signs.reduce((sum, _id, i) => { const { start, end } = span(signs, i); return sum + end - start }, 0) + PAUSE_SECONDS
      let t = loop ? seconds % total : Math.min(seconds, total)
      let index = -1
      for (let i = 0; i < signs.length; i++) {
        const { start, end } = span(signs, i)
        if (t < end - start) { index = i; t += start; break }
        t -= end - start
      }
      if (index >= 0) {
        const into = t - span(signs, index).start
        if (index > 0 && into < BLEND) {
          library[signs[index - 1]].apply(span(signs, index - 1).end)
          bones.forEach((bone, i) => snapshot[i].copy(bone.quaternion))
          library[signs[index]].apply(t)
          const k = ease(into / BLEND)
          bones.forEach((bone, i) => {
            const next = bone.quaternion.clone()
            bone.quaternion.copy(snapshot[i]).slerp(next, k)
          })
        } else library[signs[index]].apply(t)
      } else library[signs[0] ?? 'hello'].idle()
      alive(seconds, index >= 0 ? 1 : 0)
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
    const index = engine.draw(entry.signs, entry.at ?? (now - entry.start) / 1000, entry.loop, entry.ctx)
    if (index !== entry.lastIndex) {
      entry.lastIndex = index
      entry.onClip?.(index)
    }
  }
}

export type SignPlayback = { restart: () => void; dispose: () => void }

/** Start looping `signs` into `canvas` (sized FRAME_SIZE²). */
export function playSigns(canvas: HTMLCanvasElement, signs: SignId[], onClip?: (index: number) => void, at?: number): SignPlayback {
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
    at,
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
