import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { Locale } from '@/i18n-config'
import GasImagingAssistant from '@/components/knowledge/GasImagingAssistant'

export function generateMetadata({ params }: { params: { lang: Locale } }): Metadata {
  return {
    title: params.lang === 'zh' ? '气体红外成像选型验证 | Cooyue' : 'Gas Imaging Selection Lab | Cooyue',
    robots: { index: false, follow: true },
  }
}

export default function GasImagingPage({ params, searchParams }: {
  params: { lang: Locale }
  searchParams?: { query?: string | string[] }
}) {
  if (!['zh', 'en'].includes(params.lang)) notFound()
  const initialQuery = typeof searchParams?.query === 'string' ? searchParams.query.trim() : ''
  return <GasImagingAssistant key={`${params.lang}:${initialQuery}`} locale={params.lang} initialQuery={initialQuery} />
}
