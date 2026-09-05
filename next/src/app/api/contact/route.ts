import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_API_URL = 'http://43.139.70.61:3001'

function getApiBaseUrl(): string {
  const apiUrl = process.env.SEO_API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
  return apiUrl.replace(/\/+$/, '')
}

export async function POST(request: NextRequest) {
  let body: unknown = null

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const response = await fetch(`${getApiBaseUrl()}/api/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
      'x-real-ip': request.headers.get('x-real-ip') || '',
      'referer': request.headers.get('referer') || '',
      'user-agent': request.headers.get('user-agent') || '',
      'x-request-id': request.headers.get('x-request-id') || '',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    return NextResponse.json(
      data || { ok: false, error: 'Failed to submit contact form' },
      { status: response.status }
    )
  }

  return NextResponse.json(data, { status: response.status })
}
