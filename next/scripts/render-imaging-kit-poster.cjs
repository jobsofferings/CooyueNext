const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { chromium } = require('playwright')

const projectRoot = path.join(__dirname, '..')
const modelPath = path.join(projectRoot, 'public/assets/models/imaging-kit/imaging-kit.glb')
const html = `<!doctype html><html><head><style>html,body{margin:0}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script></head><body>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(1200, 900);
renderer.setPixelRatio(1);
renderer.setClearColor(0xeff3f6, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1200 / 900, 0.01, 100);
camera.position.set(-0.16, 0.11, 0.24);
camera.lookAt(0, 0, 0);
const generator = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
scene.environment = generator.fromScene(room, 0.04).texture;
scene.environmentIntensity = 0.7;
room.dispose();
generator.dispose();
scene.add(new THREE.HemisphereLight(0xffffff, 0x161616, 1.2));
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(-3, 5, 6);
scene.add(light);
const rim = new THREE.DirectionalLight(0xffffff, 2);
rim.position.set(2, 4, -5);
scene.add(rim);
const asset = await new GLTFLoader().loadAsync('/model.glb');
scene.add(asset.scene);
renderer.render(scene, camera);
window.cadReady = true;
</script></body></html>`

async function main() {
  const server = http.createServer((request, response) => {
    if (request.url === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); return }
    const relativePath = request.url?.startsWith('/three/') && !request.url.includes('..') ? request.url.slice(1) : null
    const target = request.url === '/model.glb' ? modelPath : relativePath ? path.join(projectRoot, 'node_modules', relativePath) : null
    if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) { response.writeHead(404); response.end(); return }
    response.setHeader('Content-Type', target.endsWith('.js') ? 'text/javascript' : 'model/gltf-binary')
    fs.createReadStream(target).pipe(response)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage'] })
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
    await page.goto(`http://127.0.0.1:${server.address().port}`)
    await page.waitForFunction(() => window.cadReady, { timeout: 60000 })
    const image = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/webp', 0.95).split(',')[1])
    const output = path.join(path.dirname(modelPath), 'imaging-kit.webp')
    fs.writeFileSync(output, Buffer.from(image, 'base64'))
    console.log(`Rendered CAD poster: ${output}`)
  } finally {
    if (browser) await browser.close()
    await new Promise(resolve => server.close(resolve))
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
