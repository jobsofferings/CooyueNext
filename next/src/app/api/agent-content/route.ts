import { NextRequest, NextResponse } from 'next/server'
import { productGuides } from '@/content/guides'

export function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale')
  if (locale !== 'zh' && locale !== 'en') return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
  return NextResponse.json({ items: productGuides[locale].map((guide) => ({
    id: guide.id, title: guide.title, description: guide.intro,
    text: [guide.category, ...guide.sections.map((section) => `${section.title}\n${section.text}`), ...guide.checklist].join('\n'),
  })) }, { headers: { 'Cache-Control': 'public, max-age=60' } })
}
