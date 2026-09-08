import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Locale } from '@/i18n-config'

export function generateMetadata({ params }: { params: { lang: Locale } }): Metadata {
  return {
    title: params.lang === 'zh' ? '气体红外成像选型验证 | Cooyue' : 'Gas Imaging Selection Lab | Cooyue',
    robots: { index: false, follow: true },
  }
}

export default function GasImagingPage({ params, searchParams }: {
  params: { lang: Locale }
  searchParams?: { query?: string | string[]; keywords?: string | string[] }
}) {
  if (!['zh', 'en'].includes(params.lang)) notFound()
  const value = searchParams?.query ?? searchParams?.keywords
  const query = (Array.isArray(value) ? value[0] || '' : value || '').trim()
  permanentRedirect(`/${params.lang}/search${query ? `?keywords=${encodeURIComponent(query)}` : ''}`)
}
