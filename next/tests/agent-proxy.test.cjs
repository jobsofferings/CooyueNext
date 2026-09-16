const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { runInNewContext } = require('node:vm')
const { randomUUID } = require('node:crypto')
const typescript = require('typescript')
const { NextRequest, NextResponse } = require('next/server')

function gateway(fetcher, environment = {}) {
  const module = { exports: {} }
  const source = readFileSync(resolve(__dirname, '../src/app/api/agent/[...path]/route.ts'), 'utf8')
  const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 } }).outputText
  runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name) => { if (name !== 'next/server') throw new Error(name); return { NextRequest, NextResponse } },
    fetch: fetcher, process: { env: { AGENT_PROXY_SECRET: 's'.repeat(40), AGENT_API_URL: 'http://backend.test', ...environment } },
    URL, Response, Headers, ReadableStream, TextDecoder, AbortController, setTimeout, clearTimeout,
  })
  return module.exports
}

function request(path = 'sessions', body = { locale: 'zh' }, headers = {}) {
  return new NextRequest(`https://site.test/api/agent/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cooyue-agent': '1', origin: 'https://site.test', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

test('agent gateway denies cross-site requests, missing client headers and unavailable configuration', async () => {
  let calls = 0
  const route = gateway(async () => { calls += 1; return Response.json({ ok: true }) })
  for (const headers of [{ origin: 'https://attacker.test' }, { 'sec-fetch-site': 'cross-site' }, { 'x-cooyue-agent': '0' }]) {
    assert.equal((await route.POST(request('sessions', { locale: 'zh' }, headers), { params: { path: ['sessions'] } })).status, 403)
  }
  const disabled = gateway(async () => { calls += 1 }, { AGENT_PROXY_SECRET: '' })
  assert.equal((await disabled.POST(request(), { params: { path: ['sessions'] } })).status, 503)
  assert.equal(calls, 0)
})

test('agent gateway does not forward admin, arbitrary URLs, unsupported methods or oversized bodies', async () => {
  let calls = 0
  const route = gateway(async () => { calls += 1; return Response.json({ ok: true }) })
  for (const path of [['admin', 'runs'], ['http:', '', 'private'], ['sessions', 'not-a-uuid', 'messages'], ['sessions', '..', 'mail']]) {
    assert.equal((await route.POST(request(), { params: { path } })).status, 404)
  }
  const large = await route.POST(request('sessions', { message: '字'.repeat(4000) }), { params: { path: ['sessions'] } })
  assert.equal(large.status, 413)
  assert.equal(route.DELETE, undefined)
  assert.equal(route.PUT, undefined)
  assert.equal(calls, 0)
})

test('gateway forwards only anonymous cookie and service credential, never admin cookie or client IP', async () => {
  let seen
  const route = gateway(async (url, options) => {
    seen = { url, options }
    return Response.json({ ok: true, data: { id: randomUUID() } }, { headers: { 'set-cookie': 'cooyue_agent_visitor=signed; Path=/api/agent; HttpOnly; SameSite=Lax' } })
  })
  const response = await route.POST(request('sessions', { locale: 'zh' }, {
    cookie: 'cooyue_agent_visitor=visitor; cooyue_admin_session=admin-secret', 'x-forwarded-for': '203.0.113.1',
  }), { params: { path: ['sessions'] } })
  assert.equal(response.status, 200)
  assert.equal(seen.url, 'http://backend.test/api/agent/sessions')
  assert.equal(seen.options.headers.Cookie, 'cooyue_agent_visitor=visitor')
  assert.equal(seen.options.headers['x-agent-proxy-secret'], 's'.repeat(40))
  assert.equal(seen.options.headers['x-forwarded-for'], undefined)
  assert.equal(seen.options.redirect, 'error')
  assert.match(response.headers.get('set-cookie'), /HttpOnly/)
  assert.equal((await response.json()).ok, true)
})

test('gateway streams bytes immediately and cancellation aborts upstream', async () => {
  let upstreamSignal
  let output
  const route = gateway(async (_url, options) => {
    upstreamSignal = options.signal
    return new Response(new ReadableStream({ start(controller) { output = controller } }), { headers: { 'content-type': 'text/event-stream' } })
  })
  const sessionId = randomUUID()
  const path = ['sessions', sessionId, 'messages']
  const response = await route.POST(request(path.join('/'), { requestId: randomUUID(), message: '甲烷' }), { params: { path } })
  const reader = response.body.getReader()
  output.enqueue(new TextEncoder().encode('event: status\ndata: {"phase":"searching"}\n\n'))
  const chunk = await reader.read()
  assert.match(new TextDecoder().decode(chunk.value), /searching/)
  assert.equal(response.headers.get('x-accel-buffering'), 'no')
  assert.equal(upstreamSignal.aborted, false)
  await reader.cancel()
  assert.equal(upstreamSignal.aborted, true)
})
