import { NextRequest, NextResponse } from 'next/server'
import { i18n, Locale } from '@/i18n-config'
import { getProductCategories } from '@/lib/products-api'

function resolveLocale(locale: string | null): Locale {
  if (locale && i18n.locales.includes(locale as Locale)) {
    return locale as Locale
  }

  return i18n.defaultLocale
}

export async function GET(request: NextRequest) {
  const locale = resolveLocale(request.nextUrl.searchParams.get('locale'))
  const categories = await getProductCategories(locale)

  return NextResponse.json({
    ok: true,
    data: categories,
    total: categories.length,
  })
}
