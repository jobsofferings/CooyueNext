import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const endpoint = params.path.join('/')
  const allowed = request.method === 'POST'
    ? endpoint === 'sessions' || new RegExp(`^sessions/${uuid}/messages$`, 'i').test(endpoint)
    : request.method === 'GET' && new RegExp(`^sessions/${uuid}$`, 'i').test(endpoint)
  if (!allowed) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
  const origin = request.headers.get('origin')
  const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin : request.nextUrl.origin
  if (request.headers.get('x-cooyue-agent') !== '1'
    || request.headers.get('sec-fetch-site') === 'cross-site'
    || (origin && ![request.nextUrl.origin, publicOrigin].includes(origin))) {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 })
  }
  const secret = process.env.AGENT_PROXY_SECRET || ''
  if (secret.length < 32) return NextResponse.json({ ok: false, error: 'AGENT_NOT_CONFIGURED' }, { status: 503 })
  let body: string | undefined
  if (request.method === 'POST') {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 })
    const reader = request.body?.getReader()
    if (!reader) return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 })
    const decoder = new TextDecoder()
    let bytes = 0
    body = ''
    try {
      while (true) {
        const part = await reader.read()
        if (part.done) break
        bytes += part.value.byteLength
        if (bytes > 8192) { await reader.cancel(); return NextResponse.json({ ok: false, error: 'BODY_TOO_LARGE' }, { status: 413 }) }
        body += decoder.decode(part.value, { stream: true })
      }
      body += decoder.decode()
      JSON.parse(body)
    } catch { return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 }) }
  }
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (request.signal.aborted) controller.abort()
  request.signal.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, 65000)
  const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener('abort', abort) }
  try {
    const base = (process.env.AGENT_API_URL || process.env.SEO_API_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '')
    const cookie = request.cookies.get('cooyue_agent_visitor')
    const response = await fetch(`${base}/api/agent/${endpoint}`, {
      method: request.method, body, cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-agent-proxy-secret': secret,
        ...(cookie ? { Cookie: `cooyue_agent_visitor=${cookie.value}` } : {}) },
    })
    const headers = new Headers({ 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no',
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
        } catch (error) { cleanup(); output.error(error) }
      },
      async cancel() { abort(); cleanup(); await reader.cancel().catch(() => {}) },
    })
    return new Response(stream, { status: response.status, headers })
  } catch {
    cleanup()
    return NextResponse.json({ ok: false, error: 'AGENT_UNAVAILABLE' }, { status: 503 })
  }
}

export const GET = proxy
export const POST = proxy
