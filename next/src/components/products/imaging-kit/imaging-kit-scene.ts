import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { modelUrl, moduleIds } from './imaging-kit-data'
import type { ModuleId } from './imaging-kit-data'

export interface SceneState {
  selected: ModuleId
  explosion: number
  autoPlay: boolean
  reducedMotion: boolean
}

interface SceneCallbacks {
  onSelect: (moduleId: ModuleId) => void
  onInteraction: () => void
  onExplosion: (amount: number) => void
  onProject: (moduleId: ModuleId, left: number, top: number, visible: boolean) => void
  onError: () => void
}

export interface ImagingKitSceneController {
  update: (state: SceneState) => void
  reset: () => void
  zoom: (direction: number) => void
  rotate: (horizontal: number, vertical: number) => void
  destroy: () => void
}

const offsets: Record<ModuleId, [number, number, number]> = {
  lens: [-0.045, 0, 0], adapter: [-0.012, 0, 0], core: [0.018, 0, 0],
  k10: [0.07, 0.027, 0], housing: [0.07, -0.044, 0],
}

function disposeModel(model: THREE.Object3D) {
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach(material => material.dispose())
  })
}

export async function createImagingKitScene(host: HTMLDivElement, initialState: SceneState, callbacks: SceneCallbacks, signal: AbortSignal): Promise<ImagingKitSceneController> {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  let loadedModel: THREE.Group | undefined
  try {
    const response = await fetch(modelUrl, { signal })
    if (!response.ok) throw new Error(`CAD model request failed: ${response.status}`)
    const asset = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '')
    loadedModel = asset.scene
    signal.throwIfAborted()
    for (const moduleId of moduleIds) {
      if (!loadedModel.getObjectByName(moduleId)) throw new Error(`Missing CAD module: ${moduleId}`)
    }
  } catch (error) {
    if (loadedModel) disposeModel(loadedModel)
    renderer.dispose()
    renderer.forceContextLoss()
    throw error
  }

  const model = loadedModel
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
  const controls = new OrbitControls(camera, renderer.domElement)
  const materials = new Set<THREE.Material>()
  const selectable: THREE.Mesh[] = []
  const highlights: { moduleId: ModuleId; material: THREE.MeshStandardMaterial }[] = []
  let state = initialState
  let destroyed = false
  let contextLost = false
  let visible = false
  let dirty = true
  let frameId = 0
  let lastTime = 0
  let playbackTime = 3
  let lastProgressTime = 0
  let lastProgress = -1
  let explosion = initialState.explosion / 100
  let stageWidth = 1
  let stageHeight = 1
  let previousAspect = 0
  let pointerStart: { left: number; top: number; id: number } | null = null

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)

  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.autoRotateSpeed = 0.5
  controls.minDistance = 4.5
  controls.maxDistance = 26
  controls.minPolarAngle = Math.PI * 0.08
  controls.maxPolarAngle = Math.PI * 0.92
  controls.addEventListener('start', callbacks.onInteraction)
  function markDirty() { dirty = true }
  controls.addEventListener('change', markDirty)

  const environmentGenerator = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = environmentGenerator.fromScene(room, 0.04)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.7
  room.dispose()
  environmentGenerator.dispose()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x161616, 1.2))
  const keyLight = new THREE.DirectionalLight(0xffffff, 3)
  keyLight.position.set(-3, 5, 6)
  scene.add(keyLight)
  const rimLight = new THREE.DirectionalLight(0xffffff, 2)
  rimLight.position.set(2, 4, -5)
  scene.add(rimLight)
  scene.add(model)

  const lineMaterial = new THREE.LineDashedMaterial({ color: 0xa5c6d8, transparent: true, opacity: 0, dashSize: 0.003, gapSize: 0.002, depthWrite: false })
  const assemblies = moduleIds.map(moduleId => {
    const object = model.getObjectByName(moduleId)!
    const bounds = new THREE.Box3().setFromObject(object)
    const center = bounds.getCenter(new THREE.Vector3())
    const anchor = center.clone()
    anchor.y = moduleId === 'housing' ? bounds.min.y - 0.01 : bounds.max.y + (moduleId === 'adapter' ? 0.025 : 0.007)
    anchor.z = bounds.max.z + 0.007
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      child.userData.moduleId = moduleId
      selectable.push(child)
      const originals = Array.isArray(child.material) ? child.material : [child.material]
      const clones = originals.map(original => {
        materials.add(original)
        const material = original.clone() as THREE.MeshStandardMaterial
        materials.add(material)
        highlights.push({ moduleId, material })
        return material
      })
      child.material = Array.isArray(child.material) ? clones : clones[0]
    })
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([center, center]), lineMaterial)
    model.add(line)
    return { id: moduleId, object, center, anchor, offset: new THREE.Vector3(...offsets[moduleId]), line }
  })

  function highlight() {
    dirty = true
    highlights.forEach(({ moduleId, material }) => {
      material.emissive.set(moduleId === state.selected ? 0x222222 : 0x000000)
      material.emissiveIntensity = moduleId === state.selected ? 0.035 : 0
    })
  }

  function reset() {
    controls.target.set(0.1, 0, 0)
    const distance = Math.max(7.5, 12.4 / Math.max(camera.aspect, 0.65))
    camera.position.copy(controls.target).add(new THREE.Vector3(-0.55, 0.36, 1).normalize().multiplyScalar(distance))
    controls.update()
  }

  function resize() {
    dirty = true
    stageWidth = Math.max(host.clientWidth, 1)
    stageHeight = Math.max(host.clientHeight, 1)
    camera.aspect = stageWidth / stageHeight
    camera.updateProjectionMatrix()
    renderer.setSize(stageWidth, stageHeight, false)
    if (Math.abs(previousAspect - camera.aspect) > 0.25) reset()
    previousAspect = camera.aspect
  }

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const projected = new THREE.Vector3()
  function pointerDown(event: PointerEvent) {
    pointerStart = event.isPrimary ? { left: event.clientX, top: event.clientY, id: event.pointerId } : null
  }
  function cancelPointer() { pointerStart = null }
  function pointerUp(event: PointerEvent) {
    const start = pointerStart
    pointerStart = null
    if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.left, event.clientY - start.top) > 6) return
    const bounds = renderer.domElement.getBoundingClientRect()
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(selectable, false)[0]
    if (hit) callbacks.onSelect(hit.object.userData.moduleId as ModuleId)
  }
  function loseContext(event: Event) {
    event.preventDefault()
    contextLost = true
    callbacks.onError()
  }

  function renderFrame(time: number) {
    if (destroyed) return
    frameId = requestAnimationFrame(renderFrame)
    if (!visible || document.hidden || contextLost) { lastTime = time; return }
    if (time - lastTime < 1000 / 30) return
    const delta = Math.min((time - lastTime) / 1000, 0.1)
    lastTime = time
    const playing = state.autoPlay && !state.reducedMotion
    if (playing) playbackTime += delta
    const phase = playbackTime % 16
    let target = state.explosion / 100
    if (playing) {
      target = phase < 3 ? 0 : phase < 6 ? (phase - 3) / 3 : phase < 10 ? 1 : phase < 13 ? 1 - (phase - 10) / 3 : 0
      target = THREE.MathUtils.smoothstep(target, 0, 1)
    }
    const nextExplosion = state.reducedMotion || Math.abs(explosion - target) < 0.0005 ? target : THREE.MathUtils.damp(explosion, target, 6, delta)
    if (nextExplosion !== explosion) dirty = true
    explosion = nextExplosion
    controls.autoRotate = playing
    controls.update(delta)
    if (!dirty && !playing) return
    dirty = false
    model.scale.setScalar(32 * (1.35 - explosion * 0.45))
    assemblies.forEach(assembly => {
      assembly.object.position.copy(assembly.offset).multiplyScalar(explosion)
      const positions = assembly.line.geometry.attributes.position as THREE.BufferAttribute
      positions.setXYZ(0, assembly.center.x, assembly.center.y, assembly.center.z)
      positions.setXYZ(1, assembly.center.x + assembly.object.position.x, assembly.center.y + assembly.object.position.y, assembly.center.z + assembly.object.position.z)
      positions.needsUpdate = true
      assembly.line.computeLineDistances()
    })
    lineMaterial.opacity = explosion * 0.35
    renderer.render(scene, camera)
    assemblies.forEach(assembly => {
      projected.copy(assembly.anchor)
      assembly.object.localToWorld(projected)
      projected.project(camera)
      const left = (projected.x * 0.5 + 0.5) * stageWidth
      const top = (-projected.y * 0.5 + 0.5) * stageHeight
      callbacks.onProject(assembly.id, left, top, projected.z > -1 && projected.z < 1 && left > 22 && left < stageWidth - 22 && top > 22 && top < stageHeight - 45)
    })
    if (playing && time - lastProgressTime > 100) {
      const progress = Math.round(explosion * 100)
      if (progress !== lastProgress) callbacks.onExplosion(progress)
      lastProgress = progress
      lastProgressTime = time
    }
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  const intersectionObserver = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false }, { threshold: 0.05 })
  intersectionObserver.observe(host)
  renderer.domElement.addEventListener('pointerdown', pointerDown)
  renderer.domElement.addEventListener('pointerup', pointerUp)
  renderer.domElement.addEventListener('pointercancel', cancelPointer)
  renderer.domElement.addEventListener('webglcontextlost', loseContext)
  resize()
  highlight()
  frameId = requestAnimationFrame(renderFrame)

  return {
    update(nextState) {
      if (!state.autoPlay && nextState.autoPlay) { playbackTime = 3; lastProgress = -1 }
      state = nextState
      highlight()
    },
    reset,
    zoom(direction) {
      const offset = camera.position.clone().sub(controls.target)
      const distance = THREE.MathUtils.clamp(offset.length() * (direction > 0 ? 0.85 : 1.18), controls.minDistance, controls.maxDistance)
      camera.position.copy(controls.target).add(offset.setLength(distance))
      controls.update()
    },
    rotate(horizontal, vertical) {
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target))
      spherical.theta += horizontal
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, controls.minPolarAngle, controls.maxPolarAngle)
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical))
      controls.update()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      controls.removeEventListener('start', callbacks.onInteraction)
      controls.removeEventListener('change', markDirty)
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointercancel', cancelPointer)
      renderer.domElement.removeEventListener('webglcontextlost', loseContext)
      disposeModel(model)
      materials.forEach(material => material.dispose())
      assemblies.forEach(assembly => assembly.line.geometry.dispose())
      lineMaterial.dispose()
      environment.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
