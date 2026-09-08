const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { runInNewContext } = require('node:vm')
const typescript = require('typescript')

function loadModule(filename, fetcher, mocks = {}) {
  const module = { exports: {} }
  const source = readFileSync(resolve(__dirname, '../src/lib', filename), 'utf8')
  const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 } }).outputText
  const dependencies = { 'server-only': {}, react: { cache: (operation) => operation }, ...mocks }
  runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`)
      return dependencies[name]
    },
    fetch: fetcher, process: { env: { SEO_API_URL: 'http://fixture.invalid' } },
    console: { warn: () => {} }, AbortController, AbortSignal, setTimeout, clearTimeout,
  })
  return module.exports
}

const categories = [
  { slug: 'infrared', parent_slug: null, locale: 'zh', visibility: 'published' },
  { slug: 'cores', parent_slug: 'infrared', locale: 'zh', visibility: 'published' },
  { slug: 'hidden', parent_slug: null, locale: 'zh', visibility: 'draft' },
  { slug: 'hidden-child', parent_slug: 'hidden', locale: 'zh', visibility: 'published' },
]
const product = { slug: 'example', locale: 'zh', category_slug: 'cores', visibility: 'published' }

function productsApi(record = product, status = 200) {
  return loadModule('products-api.ts', async (url, options) => {
    assert.equal(options.next.revalidate, 300)
    assert.ok(options.signal)
    if (url.includes('/categories')) return Response.json({ ok: true, data: categories })
    if (status !== 200) return new Response('', { status })
    return Response.json({ ok: true, data: record })
  })
}

test('product detail accepts only the requested language and published category ancestry', async () => {
  assert.equal((await productsApi().getProductBySlug('zh', 'example')).slug, 'example')
  for (const change of [{ visibility: 'draft' }, { locale: 'en' }, { category_slug: 'hidden-child' }, { category_slug: 'missing' }]) {
    assert.equal(await productsApi({ ...product, ...change }).getProductBySlug('zh', 'example'), null)
  }
})

test('missing products are 404 candidates, outages and corrupt payloads must fail regeneration', async () => {
  assert.equal(await productsApi(null, 404).getProductBySlug('zh', 'example'), null)
  await assert.rejects(() => productsApi(null, 503).getProductBySlug('zh', 'example'))
  await assert.rejects(() => productsApi(null, 429).getProductBySlug('zh', 'example'))
  await assert.rejects(() => productsApi({}).getProductBySlug('zh', 'example'))
  await assert.rejects(() => productsApi({ ...product, slug: 'wrong' }).getProductBySlug('zh', 'example'))
})

test('catalog fetches all pages in bounded batches and removes hidden records', async () => {
  let active = 0
  let peak = 0
  const pages = []
  const api = loadModule('products-api.ts', async (url) => {
    if (url.includes('/categories')) return Response.json({ ok: true, data: categories })
    const page = Number(new URL(url).searchParams.get('page'))
    pages.push(page)
    active += 1
    peak = Math.max(peak, active)
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5))
    active -= 1
    const data = Array.from({ length: page === 5 ? 3 : 100 }, (_item, offset) => ({ ...product, slug: `product-${page}-${offset}` }))
    if (page === 5) data[2].category_slug = 'hidden-child'
    return Response.json({ ok: true, data, total: 403 })
  })
  assert.equal((await api.getProducts('zh')).length, 402)
  assert.deepEqual(pages, [1, 2, 3, 4, 5])
  assert.equal(peak, 3)
})

test('catalog does not cache a partial list after a later page fails', async () => {
  const api = loadModule('products-api.ts', async (url) => {
    if (url.includes('/categories')) return Response.json({ ok: true, data: categories })
    if (new URL(url).searchParams.get('page') === '1') return Response.json({ ok: true, data: [product], total: 101 })
    return new Response('', { status: 503 })
  })
  await assert.rejects(() => api.getProducts('zh'))
})

function searchApi(fetcher) {
  return loadModule('knowledge-server.ts', fetcher, { 'next/headers': { headers: () => new Headers({ 'x-forwarded-for': '192.0.2.1' }) } })
}

test('server search starts one no-store request with query and client address only', async () => {
  let calls = 0
  const api = searchApi(async (url, options) => {
    calls += 1
    assert.equal(url, 'http://fixture.invalid/api/knowledge/search')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.headers['x-forwarded-for'], '192.0.2.1')
    assert.deepEqual(JSON.parse(options.body), { query: 'K10', locale: 'zh' })
    return Response.json({ ok: true, data: { products: [product] } })
  })
  const result = await api.getInitialProductSearch('K10', 'zh')
  assert.equal(result.products.length, 1)
  assert.equal(result.error, '')
  assert.equal(calls, 1)
})

test('blank and oversized initial queries do not call the search service', async () => {
  const api = searchApi(() => { throw new Error('Must not fetch') })
  assert.equal((await api.getInitialProductSearch('', 'zh')).error, '')
  assert.match((await api.getInitialProductSearch('x'.repeat(501), 'en')).error, /500/)
})

test('server search failures become retryable UI errors, not empty successful searches', async () => {
  for (const fetcher of [async () => { throw new Error('timeout') }, async () => new Response('', { status: 503 }), async () => Response.json({ ok: true, data: {} })]) {
    const result = await searchApi(fetcher).getInitialProductSearch('K10', 'zh')
    assert.equal(result.products, null)
    assert.match(result.error, /重试/)
  }
})
