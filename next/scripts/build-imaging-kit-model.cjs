const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const sourceUrl = 'https://whale-core-infra.oss-cn-shanghai.aliyuncs.com/20260421_proto/GLA07512K-T2%20ITZ1212IP%20p240921.stp'
const sourceSha256 = 'c57a0880d81327860d8fecfcd0fb109d7628f575416fb09929c911a4aa61a7b0'
const triangulation = { linearUnit: 'millimeter', linearDeflectionType: 'absolute_value', linearDeflection: 0.12, angularDeflection: 0.3 }
const modules = {
  lens: [44, 45, 46, 47, 48, 49, 50, 51, 52, 59, 64, 65, 66, 67],
  adapter: [55, 60, 61, 62, 63],
  core: [9, 16, 23, 24, 26, 29, 30, 39, 40, 54, 58],
  k10: [0, 2, 3, 4, 6, 7, 8, 10, 12, 13, 14, 15, 17, 19, 20, 21, 25, 28, 31, 32, 34, 35, 36, 37, 38, 41, 42, 43, 53, 56, 57],
  housing: [1, 5, 11, 18, 22, 27, 33, 68],
}
const materialDefinitions = [
  { name: 'Matte black structures', color: [0.007, 0.007, 0.007, 1], metallic: 0, roughness: 0.96 },
  { name: 'Opaque black mirror optics', color: [0.025, 0.025, 0.025, 1], metallic: 1, roughness: 0.025 },
]

function materialFor(moduleId, bodyIndex) {
  return moduleId === 'lens' && [44, 51, 52].includes(bodyIndex) ? 1 : 0
}

function boundsFor(positions) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let vertex = 0; vertex < positions.length; vertex += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[vertex + axis])
      max[axis] = Math.max(max[axis], positions[vertex + axis])
    }
  }
  return { min, max }
}

async function main() {
  const sourcePath = process.argv[2]
  if (!sourcePath) throw new Error('Usage: NODE_PATH=<occt-install>/node_modules node next/scripts/build-imaging-kit-model.cjs <source.stp>')
  const source = fs.readFileSync(sourcePath)
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), sourceSha256, 'Source CAD changed; review the body mapping before conversion')
  const imported = (await require('occt-import-js')()).ReadStepFile(source, triangulation)
  assert.equal(imported.success, true)
  assert.equal(imported.meshes.length, 69)
  const bodyIds = Object.values(modules).flat().sort((left, right) => left - right)
  assert.deepEqual(bodyIds, Array.from({ length: imported.meshes.length }, (_, index) => index), 'Every CAD body must belong to exactly one module')

  const document = {
    asset: { version: '2.0', generator: 'Cooyue STEP conversion / occt-import-js 0.0.23', extras: { sourceUrl, sourceSha256, units: 'meters', grouping: 'Functional interpretation of unnamed CAD bodies; not a manufacturer BOM' } },
    scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], buffers: [], bufferViews: [], accessors: [],
    materials: materialDefinitions.map(material => ({ name: material.name, alphaMode: 'OPAQUE', pbrMetallicRoughness: { baseColorFactor: material.color, metallicFactor: material.metallic, roughnessFactor: material.roughness } })),
  }
  const chunks = []
  let byteLength = 0
  let triangleCount = 0
  const moduleSummary = []

  function accessorFor(array, type, componentType, bounds) {
    const buffer = Buffer.from(array.buffer, array.byteOffset, array.byteLength)
    const padding = (4 - buffer.byteLength % 4) % 4
    const bufferView = document.bufferViews.length
    document.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: buffer.byteLength })
    chunks.push(buffer, Buffer.alloc(padding))
    byteLength += buffer.byteLength + padding
    const accessor = document.accessors.length
    document.accessors.push({ bufferView, componentType, count: array.length / (type === 'VEC3' ? 3 : 1), type, ...bounds })
    return accessor
  }

  for (const [moduleId, indices] of Object.entries(modules)) {
    const batches = new Map()
    let moduleTriangles = 0
    for (const bodyIndex of indices) {
      const mesh = imported.meshes[bodyIndex]
      const material = materialFor(moduleId, bodyIndex)
      if (!batches.has(material)) batches.set(material, { positions: [], normals: [], indices: [] })
      const batch = batches.get(material)
      const vertexOffset = batch.positions.length / 3
      const positions = mesh.attributes.position.array
      const normals = mesh.attributes.normal.array
      for (let vertex = 0; vertex < positions.length; vertex += 3) {
        batch.positions.push(-(positions[vertex + 2] - 26.685) / 1000, positions[vertex + 1] / 1000, positions[vertex] / 1000)
        batch.normals.push(-normals[vertex + 2], normals[vertex + 1], normals[vertex])
      }
      for (const vertexIndex of mesh.index.array) batch.indices.push(vertexIndex + vertexOffset)
      moduleTriangles += mesh.index.array.length / 3
    }
    const primitives = []
    for (const [material, batch] of batches) {
      const positions = new Float32Array(batch.positions)
      const normals = new Float32Array(batch.normals)
      const IndexArray = positions.length / 3 > 65535 ? Uint32Array : Uint16Array
      const indices = new IndexArray(batch.indices)
      assert.ok(batch.positions.every(Number.isFinite))
      assert.ok(batch.indices.every(vertex => vertex >= 0 && vertex < positions.length / 3))
      primitives.push({
        attributes: { POSITION: accessorFor(positions, 'VEC3', 5126, boundsFor(positions)), NORMAL: accessorFor(normals, 'VEC3', 5126) },
        indices: accessorFor(indices, 'SCALAR', IndexArray === Uint32Array ? 5125 : 5123), material,
      })
    }
    document.scenes[0].nodes.push(document.nodes.length)
    document.nodes.push({ name: moduleId, mesh: document.meshes.length, extras: { moduleId, sourceBodyIndices: indices } })
    document.meshes.push({ name: moduleId, primitives })
    moduleSummary.push({ id: moduleId, sourceBodyIndices: indices, triangleCount: moduleTriangles })
    triangleCount += moduleTriangles
  }

  document.buffers.push({ byteLength })
  const json = Buffer.from(JSON.stringify(document))
  const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)])
  const binaryChunk = Buffer.concat(chunks)
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binaryChunk.length, 8)
  function chunkHeader(length, type) {
    const buffer = Buffer.alloc(8)
    buffer.writeUInt32LE(length, 0)
    buffer.writeUInt32LE(type, 4)
    return buffer
  }
  const output = path.join(__dirname, '..', 'public', 'assets', 'models', 'imaging-kit')
  fs.mkdirSync(output, { recursive: true })
  fs.writeFileSync(path.join(output, 'imaging-kit.glb'), Buffer.concat([header, chunkHeader(jsonChunk.length, 0x4e4f534a), jsonChunk, chunkHeader(binaryChunk.length, 0x004e4942), binaryChunk]))
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({ sourceUrl, sourceSha256, sourceFilename: 'GLA07512K-T2 ITZ1212IP p240921.stp', cadTimestamp: '2024-09-21T12:07:24+08:00', converterVersion: 'occt-import-js@0.0.23', triangulation, bodyCount: bodyIds.length, triangleCount, modules: moduleSummary }, null, 2) + '\n')
  console.log(`Converted ${bodyIds.length} bodies into ${moduleSummary.length} modules / ${triangleCount} triangles / ${(header.readUInt32LE(8) / 1024 / 1024).toFixed(2)} MiB`)
}

main().catch(error => { console.error(error); process.exitCode = 1 })
