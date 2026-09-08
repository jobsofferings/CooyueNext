import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const endpoint = params.path.join('/')
  if (!['search', 'compare', 'answer', 'inquiries/draft'].includes(endpoint)
    && !/^inquiries\/[a-f0-9-]{36}\/confirm$/i.test(endpoint)) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }
  const reader = request.body?.getReader()
  if (!reader) return NextResponse.json({ ok: false, error: 'Missing request body' }, { status: 400 })
  const decoder = new TextDecoder()
  let body = ''
  let bytes = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      bytes += part.value.byteLength
      if (bytes > 16384) {
        await reader.cancel()
        return NextResponse.json({ ok: false, error: 'Request body too large' }, { status: 413 })
      }
      body += decoder.decode(part.value, { stream: true })
    }
    body += decoder.decode()
    JSON.parse(body)
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }
  const apiUrl = process.env.KNOWLEDGE_API_URL || process.env.SEO_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), endpoint.endsWith('/confirm') ? 120000 : 15000)
  try {
    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/knowledge/${endpoint}`, {
      method: 'POST', headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
        'x-real-ip': request.headers.get('x-real-ip') || '',
      }, body,
      cache: 'no-store', signal: controller.signal,
    })
    const payload = await response.json()
    return NextResponse.json(payload, { status: response.status, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false, error: 'Knowledge service unavailable; please retry later.' }, { status: 503 })
  } finally { clearTimeout(timeout) }
}
