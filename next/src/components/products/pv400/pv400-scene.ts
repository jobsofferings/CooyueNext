import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import type { ImagingMode, ModuleId } from './pv400-data'
import { drawThermalFrame } from './pv400-thermal'

export interface SceneState {
  explosion: number
  selected: ModuleId
  autoRotate: boolean
  mode: ImagingMode
  reducedMotion: boolean
}

interface SceneCallbacks {
  onSelect: (moduleId: ModuleId) => void
  onInteraction: () => void
  onProject: (moduleId: ModuleId, left: number, top: number, visible: boolean) => void
  onError: () => void
}

export interface Pv400SceneController {
  update: (state: SceneState) => void
  reset: () => void
  zoom: (direction: number) => void
  rotate: (horizontal: number, vertical: number) => void
  destroy: () => void
}

interface ModuleAssembly {
  id: ModuleId
  group: THREE.Group
  origin: THREE.Vector3
  offset: THREE.Vector3
  anchor: THREE.Vector3
}

export function createPv400Scene(host: HTMLDivElement, initialState: SceneState, callbacks: SceneCallbacks): Pv400SceneController {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80)
  const controls = new OrbitControls(camera, renderer.domElement)
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const moduleMaterials: { id: ModuleId; material: THREE.MeshStandardMaterial; color: THREE.Color; intensity: number }[] = []
  const assemblies: ModuleAssembly[] = []
  let state = initialState
  let destroyed = false
  let frameId = 0
  let visible = true
  let contextLost = false
  let explosion = initialState.explosion / 100
  let lastTime = 0
  let thermalTime = 0
  let lastThermalFrame = -1
  let previousMode: ImagingMode | null = null
  let stageWidth = 1
  let stageHeight = 1
  let previousAspect = 0
  let pointerStart: { left: number; top: number } | null = null
  let hovered = false

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)

  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.enablePan = false
  controls.autoRotateSpeed = 0.55
  controls.minPolarAngle = Math.PI * 0.15
  controls.maxPolarAngle = Math.PI * 0.64
  controls.minDistance = 5.5
  controls.maxDistance = 25
  controls.target.set(0, 0.35, 0)
  controls.addEventListener('start', callbacks.onInteraction)

  const environmentGenerator = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = environmentGenerator.fromScene(room, 0.04)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.55
  room.dispose()
  environmentGenerator.dispose()
  scene.add(new THREE.HemisphereLight(0xcadff0, 0x111d26, 1.2))
  const keyLight = new THREE.DirectionalLight(0xf3f6ee, 3)
  keyLight.position.set(3, 7, 6)
  scene.add(keyLight)
  const rimLight = new THREE.DirectionalLight(0x9bf7d0, 2.4)
  rimLight.position.set(-4, 3, -5)
  scene.add(rimLight)
  const fillLight = new THREE.DirectionalLight(0x729bc8, 1.3)
  fillLight.position.set(-3, 0, 5)
  scene.add(fillLight)

  const model = new THREE.Group()
  model.rotation.y = -0.15
  scene.add(model)

  const makeMaterial = (parameters: THREE.MeshStandardMaterialParameters) => {
    const material = new THREE.MeshStandardMaterial(parameters)
    materials.add(material)
    return material
  }
  const shell = makeMaterial({ color: 0x191e20, metalness: 0.24, roughness: 0.6 })
  const dark = makeMaterial({ color: 0x101619, metalness: 0.2, roughness: 0.6 })
  const rubber = makeMaterial({ color: 0x0c1113, metalness: 0.02, roughness: 0.87 })
  const metal = makeMaterial({ color: 0x667780, metalness: 0.82, roughness: 0.3 })
  const red = makeMaterial({ color: 0xc84644, metalness: 0.35, roughness: 0.3 })
  const copper = makeMaterial({ color: 0xbb8650, metalness: 0.82, roughness: 0.32 })
  const circuit = makeMaterial({ color: 0x173d34, metalness: 0.32, roughness: 0.5 })

  const addMesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number]) => {
    geometries.add(geometry)
    materials.add(material)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    parent.add(mesh)
    return mesh
  }
  const box = (parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material = shell, radius = 0.06) =>
    addMesh(parent, new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(dimension => dimension / 3))), material, position)
  const cylinder = (parent: THREE.Object3D, radius: number, length: number, position: [number, number, number], material: THREE.Material, axis: 'x' | 'y' | 'z' = 'x') => {
    const mesh = addMesh(parent, new THREE.CylinderGeometry(radius, radius, length, 48), material, position)
    if (axis === 'x') mesh.rotation.z = Math.PI / 2
    if (axis === 'z') mesh.rotation.x = Math.PI / 2
    return mesh
  }
  const ring = (parent: THREE.Object3D, radius: number, thickness: number, position: [number, number, number], material: THREE.Material) => {
    const mesh = addMesh(parent, new THREE.TorusGeometry(radius, thickness, 10, 64), material, position)
    mesh.rotation.y = Math.PI / 2
    return mesh
  }
  const register = (id: ModuleId, origin: [number, number, number], offset: [number, number, number], anchor: [number, number, number]) => {
    const group = new THREE.Group()
    group.position.set(...origin)
    group.userData.moduleId = id
    model.add(group)
    assemblies.push({ id, group, origin: new THREE.Vector3(...origin), offset: new THREE.Vector3(...offset), anchor: new THREE.Vector3(...anchor) })
    return group
  }

  const body = new THREE.Group()
  body.userData.moduleId = 'controls'
  model.add(body)
  box(body, [2.95, 0.22, 1.65], [0, -0.66, 0], dark)
  box(body, [2.95, 0.32, 1.65], [0, 0.94, 0])
  box(body, [0.28, 1.55, 1.64], [1.38, 0.13, 0])
  box(body, [0.24, 1.52, 1.62], [-1.34, 0.12, 0])
  const shellSides = [
    box(body, [2.8, 1.45, 0.15], [0, 0.16, -0.78]),
    box(body, [2.8, 1.45, 0.15], [0, 0.16, 0.78]),
  ]
  box(body, [1.55, 1.12, 0.06], [-0.2, 0.18, 0.884], dark)
  box(body, [0.9, 0.35, 0.07], [0.65, 0.52, 0.9], dark)
  for (let vent = 0; vent < 8; vent += 1) {
    box(body, [0.035, 0.24, 0.03], [0.67 + vent * 0.07, -0.35, 0.889], rubber, 0.008)
  }
  for (const left of [-1.14, 1.14]) {
    for (const top of [-0.4, 0.7]) {
      cylinder(body, 0.034, 0.028, [left, top, 0.885], metal, 'z')
      box(body, [0.037, 0.007, 0.005], [left, top, 0.904], dark, 0.001)
    }
  }

  const badgeCanvas = document.createElement('canvas')
  badgeCanvas.width = 512
  badgeCanvas.height = 180
  const badgeContext = badgeCanvas.getContext('2d')
  if (badgeContext) {
    badgeContext.fillStyle = '#191e21'
    badgeContext.fillRect(0, 0, 512, 180)
    badgeContext.fillStyle = '#e15b58'
    badgeContext.font = 'bold 68px Arial'
    badgeContext.fillText('G', 26, 86)
    badgeContext.fillStyle = '#d8dedb'
    badgeContext.font = 'bold 56px Arial'
    badgeContext.fillText('Guide', 84, 84)
    badgeContext.fillStyle = '#98a8aa'
    badgeContext.font = '24px monospace'
    badgeContext.fillText('PV400 / OPTICAL GAS IMAGING', 30, 139)
  }
  const badgeTexture = new THREE.CanvasTexture(badgeCanvas)
  badgeTexture.colorSpace = THREE.SRGBColorSpace
  textures.add(badgeTexture)
  const badgeMaterial = new THREE.MeshBasicMaterial({ map: badgeTexture, toneMapped: false })
  addMesh(body, new THREE.PlaneGeometry(1.24, 0.43), badgeMaterial, [-0.22, 0.41, 0.927])

  const optics = register('optics', [1.58, 0.24, 0], [1.7, 0.18, 0], [0.6, 0.52, 0.2])
  cylinder(optics, 0.71, 0.22, [0, 0, 0], shell)
  cylinder(optics, 0.66, 0.58, [0.28, 0, 0], rubber)
  cylinder(optics, 0.71, 0.13, [0.58, 0, 0], dark)
  ring(optics, 0.668, 0.018, [0.05, 0, 0], red)
  ring(optics, 0.659, 0.016, [0.49, 0, 0], metal)
  for (let rib = 0; rib < 40; rib += 1) {
    const angle = rib / 40 * Math.PI * 2
    const grip = box(optics, [0.31, 0.043, 0.037], [0.28, Math.cos(angle) * 0.66, Math.sin(angle) * 0.66], dark, 0.009)
    grip.rotation.x = angle
  }
  cylinder(optics, 0.57, 0.045, [0.661, 0, 0], rubber)
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x194e4f, metalness: 0.82, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05,
    emissive: 0x0c252b, emissiveIntensity: 0.2,
  })
  cylinder(optics, 0.491, 0.025, [0.69, 0, 0], glass)
  ring(optics, 0.491, 0.016, [0.712, 0, 0], copper)
  ring(optics, 0.39, 0.009, [0.71, 0, 0], metal)
  const reflectionMaterial = new THREE.MeshBasicMaterial({ color: 0xa4ecdf, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  const reflection = addMesh(optics, new THREE.CircleGeometry(0.29, 48, 0.3, 1.2), reflectionMaterial, [0.715, 0.1, 0.02])
  reflection.rotation.y = Math.PI / 2

  const detector = register('detector', [0.38, 0.19, 0], [0.33, 1.05, 0.55], [0.15, 0.52, 0.35])
  box(detector, [0.8, 0.82, 0.86], [0, 0, 0], copper)
  box(detector, [0.85, 0.62, 0.6], [0.02, 0, 0], metal)
  box(detector, [0.04, 0.54, 0.55], [0.46, 0, 0], dark)
  const sensorMaterial = makeMaterial({ color: 0x90ceb4, emissive: 0x51c4a1, emissiveIntensity: 0.35, metalness: 0.7, roughness: 0.19 })
  box(detector, [0.05, 0.33, 0.34], [0.495, 0, 0], sensorMaterial, 0.01)
  box(detector, [1.06, 0.08, 0.93], [-0.08, -0.48, 0], circuit, 0.015)
  for (let chip = 0; chip < 5; chip += 1) {
    box(detector, [0.14, 0.06, 0.18], [-0.46 + chip * 0.18, -0.4, 0.31], dark, 0.008)
  }
  cylinder(detector, 0.24, 0.48, [-0.58, 0, 0], metal)
  for (let fin = 0; fin < 7; fin += 1) {
    cylinder(detector, 0.295, 0.025, [-0.4 - fin * 0.064, 0, 0], metal)
  }

  const display = register('display', [-0.64, 0.05, 1.4], [-0.1, 0.16, 1.63], [-0.5, 0.67, 0.18])
  display.rotation.y = 0.36
  display.rotation.x = -0.15
  display.rotation.z = -0.04
  box(display, [1.67, 1.2, 0.16], [0, 0, 0], rubber, 0.09)
  box(display, [1.58, 1.12, 0.08], [0, 0, 0.055], shell, 0.06)
  cylinder(display, 0.11, 0.66, [0.79, 0.07, -0.23], metal, 'y')
  const thermalCanvas = document.createElement('canvas')
  thermalCanvas.width = 512
  thermalCanvas.height = 320
  const thermalContext = thermalCanvas.getContext('2d')
  const thermalTexture = new THREE.CanvasTexture(thermalCanvas)
  thermalTexture.colorSpace = THREE.SRGBColorSpace
  textures.add(thermalTexture)
  const screenMaterial = new THREE.MeshBasicMaterial({ map: thermalTexture, toneMapped: false })
  addMesh(display, new THREE.PlaneGeometry(1.39, 0.87), screenMaterial, [0, 0.04, 0.104])
  for (let button = 0; button < 3; button += 1) {
    box(display, [0.12, 0.025, 0.018], [-0.22 + button * 0.22, -0.49, 0.11], metal, 0.008)
  }
  cylinder(display, 0.022, 0.02, [0.63, -0.49, 0.11], sensorMaterial, 'z')

  const viewfinder = register('viewfinder', [-1.15, 1.22, -0.16], [-1.45, 0.95, -0.25], [-0.49, 0.28, 0.1])
  box(viewfinder, [0.72, 0.3, 0.44], [0.08, -0.18, 0], dark)
  cylinder(viewfinder, 0.29, 0.54, [-0.12, 0.04, 0], shell)
  cylinder(viewfinder, 0.33, 0.22, [-0.46, 0.04, 0], rubber)
  cylinder(viewfinder, 0.24, 0.025, [-0.585, 0.04, 0], glass)
  ring(viewfinder, 0.3, 0.015, [-0.28, 0.04, 0], red)
  ring(viewfinder, 0.33, 0.06, [-0.57, 0.04, 0], rubber)
  for (let ridge = 0; ridge < 6; ridge += 1) {
    ring(viewfinder, 0.292, 0.014, [-0.2 + ridge * 0.065, 0.04, 0], dark)
  }

  const controlModule = register('controls', [0, 1.13, 0], [0, 1.62, -0.28], [0.45, 0.8, 0.05])
  const handleShape = new THREE.Shape()
  handleShape.moveTo(-1.18, -0.1)
  handleShape.lineTo(-0.98, 0.59)
  handleShape.quadraticCurveTo(-0.93, 0.79, -0.65, 0.79)
  handleShape.lineTo(0.73, 0.74)
  handleShape.quadraticCurveTo(0.96, 0.74, 1.01, 0.48)
  handleShape.lineTo(1.18, -0.1)
  handleShape.lineTo(0.89, -0.1)
  handleShape.lineTo(0.71, 0.43)
  handleShape.lineTo(-0.69, 0.47)
  handleShape.lineTo(-0.87, -0.1)
  handleShape.closePath()
  addMesh(controlModule, new THREE.ExtrudeGeometry(handleShape, { depth: 0.3, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.055, bevelThickness: 0.055, curveSegments: 12 }), rubber, [0, 0, -0.15])
  box(controlModule, [1.26, 0.11, 0.39], [0.03, 0.69, 0], shell, 0.04)
  cylinder(controlModule, 0.15, 0.12, [0.8, -0.07, 0.48], dark, 'y')
  cylinder(controlModule, 0.075, 0.04, [0.79, 0.006, 0.48], metal, 'y')
  cylinder(controlModule, 0.068, 0.04, [-0.38, -0.02, 0.43], red, 'y')
  for (let control = 0; control < 3; control += 1) {
    box(controlModule, [0.15, 0.055, 0.14], [-0.06 + control * 0.2, -0.03, 0.47], rubber, 0.025)
  }

  const power = register('power', [-1.5, -0.11, 0], [-1.5, -0.65, 0.2], [-0.12, -0.1, 0.72])
  box(power, [0.45, 1.34, 1.47], [-0.07, 0, 0], dark, 0.1)
  box(power, [0.13, 1.06, 1.21], [-0.32, 0, 0], shell, 0.07)
  box(power, [0.15, 0.19, 0.58], [-0.38, 0.35, 0], rubber, 0.025)
  for (let groove = 0; groove < 4; groove += 1) {
    box(power, [0.02, 0.026, 0.77], [-0.396, -0.13 - groove * 0.09, 0], rubber, 0.008)
  }
  for (let contact = 0; contact < 4; contact += 1) {
    box(power, [0.015, 0.1, 0.08], [0.164, 0.43, -0.2 + contact * 0.13], copper, 0.004)
  }

  assemblies.forEach(assembly => {
    assembly.group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      object.userData.moduleId = assembly.id
      if (object.material instanceof THREE.MeshStandardMaterial) {
        const material = object.material.clone()
        materials.add(material)
        object.material = material
        moduleMaterials.push({ id: assembly.id, material, color: material.emissive.clone(), intensity: material.emissiveIntensity })
      }
    })
  })

  const connectorMaterial = new THREE.LineDashedMaterial({ color: 0x9abfae, transparent: true, opacity: 0, dashSize: 0.07, gapSize: 0.08, depthWrite: false })
  materials.add(connectorMaterial)
  const connectors = assemblies.map(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    geometries.add(geometry)
    const line = new THREE.Line(geometry, connectorMaterial)
    model.add(line)
    return line
  })

  const platformMaterial = new THREE.MeshBasicMaterial({ color: 0x15292d, transparent: true, opacity: 0.45 })
  cylinder(scene, 3.3, 0.075, [0, -1.44, 0], platformMaterial, 'y')
  const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x78a594, transparent: true, opacity: 0.21, depthWrite: false })
  for (const radius of [3.3, 3.5]) {
    const orbit = ring(scene, radius, 0.008, [0, -1.39, 0], orbitMaterial)
    orbit.rotation.set(Math.PI / 2, 0, 0)
  }
  const grid = new THREE.GridHelper(9, 24, 0x385447, 0x213d3e)
  grid.position.y = -1.5
  grid.material.transparent = true
  grid.material.opacity = 0.16
  geometries.add(grid.geometry)
  materials.add(grid.material)
  scene.add(grid)

  const projected = new THREE.Vector3()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  const setHighlight = () => {
    moduleMaterials.forEach(({ id, material, color, intensity }) => {
      material.emissive.copy(id === state.selected ? new THREE.Color(0x347762) : color)
      material.emissiveIntensity = id === state.selected ? 0.18 : intensity
    })
  }

  const reset = () => {
    const aspect = stageWidth / stageHeight
    const fit = Math.max(1, 1.2 / aspect)
    camera.position.set(6.8 * fit, 4.05 * fit, 7.8 * fit)
    controls.target.set(0, 0.35, 0)
    controls.update()
  }

  const resize = () => {
    stageWidth = Math.max(host.clientWidth, 1)
    stageHeight = Math.max(host.clientHeight, 1)
    const aspect = stageWidth / stageHeight
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    renderer.setSize(stageWidth, stageHeight)
    if (Math.abs(aspect - previousAspect) > 0.2) reset()
    previousAspect = aspect
  }

  const hitModule = (event: PointerEvent) => {
    const bounds = renderer.domElement.getBoundingClientRect()
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(model.children, true)
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object
      while (object) {
        if (object.userData.moduleId) return object.userData.moduleId as ModuleId
        object = object.parent
      }
    }
    return null
  }
  const pointerDown = (event: PointerEvent) => {
    pointerStart = event.isPrimary ? { left: event.clientX, top: event.clientY } : null
  }
  const pointerUp = (event: PointerEvent) => {
    if (!pointerStart || !event.isPrimary) return
    const distance = Math.hypot(event.clientX - pointerStart.left, event.clientY - pointerStart.top)
    pointerStart = null
    if (distance > 6) return
    const moduleId = hitModule(event)
    if (moduleId) callbacks.onSelect(moduleId)
  }
  const pointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || event.buttons !== 0) return
    const nextHovered = Boolean(hitModule(event))
    if (nextHovered !== hovered) {
      hovered = nextHovered
      renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab'
    }
  }
  const cancelPointer = () => { pointerStart = null }
  const loseContext = (event: Event) => {
    event.preventDefault()
    contextLost = true
    cancelAnimationFrame(frameId)
    callbacks.onError()
  }

  const renderFrame = (time: number) => {
    if (destroyed || contextLost) return
    frameId = requestAnimationFrame(renderFrame)
    if (!visible || document.hidden || time - lastTime < 1000 / 30) return
    const delta = Math.min((time - lastTime) / 1000, 0.05)
    lastTime = time
    if (!state.reducedMotion) thermalTime += delta
    const targetExplosion = state.explosion / 100
    explosion = state.reducedMotion ? targetExplosion : THREE.MathUtils.damp(explosion, targetExplosion, 5.5, delta)
    const scale = 1.22 - explosion * 0.28
    model.scale.setScalar(scale)
    assemblies.forEach((assembly, index) => {
      assembly.group.position.copy(assembly.origin).addScaledVector(assembly.offset, explosion)
      const positions = connectors[index].geometry.attributes.position as THREE.BufferAttribute
      positions.setXYZ(0, assembly.origin.x, assembly.origin.y, assembly.origin.z)
      positions.setXYZ(1, assembly.group.position.x, assembly.group.position.y, assembly.group.position.z)
      positions.needsUpdate = true
      connectors[index].computeLineDistances()
    })
    shellSides[0].position.z = -0.78 - explosion * 0.6
    shellSides[1].position.z = 0.78 + explosion * 0.24
    connectorMaterial.opacity = explosion * 0.42
    controls.autoRotate = state.autoRotate && !state.reducedMotion
    controls.update(delta)

    const textureFrame = Math.floor(thermalTime * 12)
    if (thermalContext && (textureFrame !== lastThermalFrame || state.mode !== previousMode)) {
      drawThermalFrame(thermalContext, state.mode, thermalTime)
      thermalTexture.needsUpdate = true
      lastThermalFrame = textureFrame
      previousMode = state.mode
    }
    renderer.render(scene, camera)
    assemblies.forEach(assembly => {
      projected.copy(assembly.anchor)
      assembly.group.localToWorld(projected)
      projected.project(camera)
      const left = (projected.x * 0.5 + 0.5) * stageWidth
      const top = (-projected.y * 0.5 + 0.5) * stageHeight
      callbacks.onProject(assembly.id, left, top, projected.z > -1 && projected.z < 1 && left > 15 && left < stageWidth - 15 && top > 20 && top < stageHeight - 40)
    })
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  const intersectionObserver = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false }, { rootMargin: '100px' })
  intersectionObserver.observe(host)
  renderer.domElement.addEventListener('pointerdown', pointerDown)
  renderer.domElement.addEventListener('pointerup', pointerUp)
  renderer.domElement.addEventListener('pointermove', pointerMove)
  renderer.domElement.addEventListener('pointercancel', cancelPointer)
  renderer.domElement.addEventListener('webglcontextlost', loseContext)
  resize()
  setHighlight()
  frameId = requestAnimationFrame(renderFrame)

  return {
    update(nextState) {
      const selectedChanged = state.selected !== nextState.selected
      state = nextState
      if (selectedChanged) setHighlight()
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
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointercancel', cancelPointer)
      renderer.domElement.removeEventListener('webglcontextlost', loseContext)
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      textures.forEach(texture => texture.dispose())
      environment.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
