import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const requestId = randomUUID()
  const started = Date.now()
  const fail = (code: string, status: number, phase = 'gateway_access') => {
    console.warn('[agent:gateway]', { requestId, phase, code, status, durationMs: Date.now() - started })
    return NextResponse.json({ ok: false, error: code, phase, requestId }, { status, headers: { 'x-agent-request-id': requestId, 'Cache-Control': 'no-store' } })
  }
  const endpoint = params.path.join('/')
  const allowed = request.method === 'POST'
    ? endpoint === 'sessions' || new RegExp(`^sessions/${uuid}/(?:messages|contexts)$`, 'i').test(endpoint)
    : request.method === 'GET' && new RegExp(`^sessions/${uuid}$`, 'i').test(endpoint)
  if (!allowed) return fail('NOT_FOUND', 404)
  const origin = request.headers.get('origin')
  const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin : request.nextUrl.origin
  const httpOrigins = (process.env.AGENT_HTTP_SITE_ORIGINS || '').split(',').map(value => value.trim()).filter(value => {
    try { const url = new URL(value); return url.protocol === 'http:' && url.origin === value && !url.username && !url.password } catch { return false }
  })
  const host = request.headers.get('host') || request.nextUrl.host
  const insecureOrigin = httpOrigins.find(value => new URL(value).host === host)
  const protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'https:' : request.nextUrl.protocol
  const browserOrigin = insecureOrigin || (new URL(publicOrigin).host === host ? publicOrigin : `${protocol}//${host}`)
  if (request.headers.get('x-cooyue-agent') !== '1'
    || request.headers.get('sec-fetch-site') === 'cross-site'
    || (origin && origin !== browserOrigin)
    || (process.env.NODE_ENV === 'production' && browserOrigin.startsWith('http:') && !insecureOrigin)) {
    return fail('FORBIDDEN', 403)
  }
  const secret = process.env.AGENT_PROXY_SECRET || ''
  if (secret.length < 32) return fail('AGENT_NOT_CONFIGURED', 503)
  let body: string | undefined
  if (request.method === 'POST') {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return fail('INVALID_BODY', 400)
    const reader = request.body?.getReader()
    if (!reader) return fail('INVALID_BODY', 400)
    const decoder = new TextDecoder()
    let bytes = 0
    body = ''
    try {
      while (true) {
        const part = await reader.read()
        if (part.done) break
        bytes += part.value.byteLength
        if (bytes > 8192) { await reader.cancel(); return fail('BODY_TOO_LARGE', 413) }
        body += decoder.decode(part.value, { stream: true })
      }
      body += decoder.decode()
      JSON.parse(body)
    } catch { return fail('INVALID_BODY', 400) }
  }
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (request.signal.aborted) controller.abort()
  request.signal.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, 70000)
  const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener('abort', abort) }
  try {
    const base = (process.env.AGENT_API_URL || process.env.SEO_API_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '')
    const cookie = request.cookies.get('cooyue_agent_visitor')
    const response = await fetch(`${base}/api/agent/${endpoint}`, {
      method: request.method, body, cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'identity', 'x-agent-proxy-secret': secret, 'x-agent-browser-origin': browserOrigin,
        ...(cookie ? { Cookie: `cooyue_agent_visitor=${cookie.value}` } : {}) },
    })
    const headers = new Headers({ 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no', 'Content-Encoding': 'identity',
      'x-agent-request-id': response.headers.get('x-agent-request-id') || requestId,
      'Content-Type': response.headers.get('content-type') || 'application/json' })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) headers.set('set-cookie', setCookie)
    if (!response.body) { cleanup(); return new Response(null, { status: response.status, headers }) }
    const reader = response.body.getReader()
    const stream = new ReadableStream<Uint8Array>({
      async pull(output) {
        try {
          const part = await reader.read()
          if (part.done) { cleanup(); output.close() }
          else output.enqueue(part.value)
        } catch (error) {
          console.warn('[agent:gateway]', { requestId: headers.get('x-agent-request-id'), phase: 'gateway_stream', code: controller.signal.aborted ? 'GATEWAY_TIMEOUT_OR_CANCELLED' : 'UPSTREAM_STREAM_ERROR', durationMs: Date.now() - started })
          cleanup(); output.error(error)
        }
      },
      async cancel() { abort(); cleanup(); await reader.cancel().catch(() => {}) },
    })
    return new Response(stream, { status: response.status, headers })
  } catch {
    cleanup()
    return fail(controller.signal.aborted ? 'GATEWAY_TIMEOUT' : 'BACKEND_UNAVAILABLE', 503, 'gateway_connect')
  }
}

export const GET = proxy
export const POST = proxy
