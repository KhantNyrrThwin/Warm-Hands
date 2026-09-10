import { useEffect, useRef, useState } from 'react'
import type { Group, Material, Mesh, Texture, WebGLRenderer } from 'three'
import fallbackImage from '../assets/Main Character.png'
import './CharacterViewer.css'

type Props = {
  active: boolean
  greeting?: boolean
  onGreetingComplete?: () => void
  onStatusChange?: (status: 'loading' | 'ready' | 'fallback') => void
}

// Keep the large renderer out of the initial application bundle.
const loadThree = () => Promise.all([
  import('three'),
  import('three/addons/loaders/GLTFLoader.js'),
  import('../animation/mingalarbar'),
])

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

export default function CharacterViewer({ active, greeting = false, onGreetingComplete, onStatusChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(active)
  const greetingRef = useRef(greeting)
  const completedRef = useRef(onGreetingComplete)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')

  useEffect(() => { activeRef.current = active }, [active])
  useEffect(() => { greetingRef.current = greeting }, [greeting])
  useEffect(() => { completedRef.current = onGreetingComplete }, [onGreetingComplete])
  useEffect(() => { onStatusChange?.(status) }, [status, onStatusChange])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let failed = false
    let renderer: WebGLRenderer | undefined
    let model: Group | undefined
    let frame = 0
    let observer: ResizeObserver | undefined
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const controller = new AbortController()

    const fail = () => {
      if (disposed || failed) return
      failed = true
      cancelAnimationFrame(frame)
      if (model) { disposeModel(model); model = undefined }
      renderer?.dispose()
      renderer?.domElement.remove()
      setStatus('fallback')
      if (greetingRef.current) completedRef.current?.()
    }
    const onContextLost = (event: Event) => { event.preventDefault(); fail() }

    async function start() {
      const [THREE, { GLTFLoader }, { createMingalarbarAnimation }] = await loadThree()
      if (disposed) return
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.1
      renderer.setClearColor(0x000000, 0)
      renderer.domElement.setAttribute('aria-hidden', 'true')
      renderer.domElement.addEventListener('webglcontextlost', onContextLost)
      host!.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-2, 2, 3.5, -3.5, 0.1, 100)
      camera.position.set(0, 0, 12)
      camera.lookAt(0, 0, 0)
      scene.add(new THREE.HemisphereLight(0xfff4df, 0x8a827a, 2.5))
      const key = new THREE.DirectionalLight(0xffecd6, 3)
      key.position.set(-3, 5, 6)
      const fill = new THREE.DirectionalLight(0xe2edff, 1.5)
      fill.position.set(4, 2, 3)
      scene.add(key, fill)

      const modelUrl = `${import.meta.env.BASE_URL}models/WarmHands_Character.glb`
      const response = await fetch(modelUrl, { signal: controller.signal })
      if (!response.ok) throw new Error(`Character request failed: ${response.status}`)
      const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '')
      if (disposed || failed) { disposeModel(gltf.scene); return }
      model = gltf.scene
      const bounds = new THREE.Box3().setFromObject(model)
      const size = bounds.getSize(new THREE.Vector3())
      const center = bounds.getCenter(new THREE.Vector3())
      model.position.sub(center)
      scene.add(model)

      const greetingAnimation = createMingalarbarAnimation(model)

      // A matching blink target occurs on the white, iris, pupil and eyelids.
      const blinkTargets: Array<{ mesh: Mesh; index: number }> = []
      model.traverse((object) => {
        const mesh = object as Mesh
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return
        for (const name of ['eyeBlinkL', 'eyeBlinkR']) {
          const index = mesh.morphTargetDictionary[name]
          if (index !== undefined) blinkTargets.push({ mesh, index })
        }
      })
      const resize = () => {
        if (!renderer || disposed || failed) return
        const width = host!.clientWidth
        const height = host!.clientHeight
        if (!width || !height) return
        const aspect = width / height
        const halfHeight = Math.max(size.y * 0.535, size.x * 0.57 / aspect)
        camera.left = -halfHeight * aspect
        camera.right = halfHeight * aspect
        camera.top = halfHeight
        camera.bottom = -halfHeight
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
        renderer.render(scene, camera)
      }
      observer = new ResizeObserver(resize)
      observer.observe(host!)
      resize()
      setStatus('ready')

      let lastFrame = 0
      let wasRequested = false
      let playing = false
      let elapsed = 0

      const render = (now: number) => {
        if (disposed || failed) return
        frame = requestAnimationFrame(render)
        if (document.hidden || !activeRef.current) { lastFrame = now; return }
        if (now - lastFrame < 1000 / 30) return
        const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 0
        lastFrame = now
        const requested = greetingRef.current
        if (requested && !wasRequested) { playing = true; elapsed = 0 }
        if (!requested && wasRequested) { playing = false; greetingAnimation.reset() }
        wasRequested = requested
        if (playing) {
          elapsed += delta
          greetingAnimation.apply(elapsed)
          host!.dataset.greetingTime = elapsed.toFixed(2)
          if (elapsed >= greetingAnimation.duration) {
            playing = false
            completedRef.current?.()
          }
        }
        const phase = now / 1000 % 5.4
        const blink = !motion.matches && phase > 5.12 ? Math.sin((phase - 5.12) / 0.28 * Math.PI) : 0
        for (const { mesh, index } of blinkTargets) mesh.morphTargetInfluences![index] = blink

        renderer!.render(scene, camera)
      }
      frame = requestAnimationFrame(render)
    }

    void start().catch((error: unknown) => {
      if (disposed) return
      console.error('Unable to display the Warm Hands character:', error)
      fail()
    })

    return () => {
      disposed = true
      controller.abort()
      cancelAnimationFrame(frame)
      observer?.disconnect()
      if (model) disposeModel(model)
      if (renderer) {
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
        renderer.dispose()
        renderer.domElement.remove()
      }
    }
  }, [])

  return (
    <div className="character-viewer" hidden={!active} data-status={status}>
      <div ref={hostRef} className="character-canvas" role="img" aria-label="Warm Hands character with brown hair, an orange shirt and tan shorts" />
      {status !== 'ready' && <img className="character-fallback" src={fallbackImage} alt="Warm Hands character" />}
      <span className={status === 'ready' ? 'sr-only' : 'character-status'} role="status">
        {status === 'loading' ? 'Loading character…' : status === 'fallback' ? 'Showing character image. 3D view is unavailable.' : 'Character ready'}
      </span>
    </div>
  )
}
