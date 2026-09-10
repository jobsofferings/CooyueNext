import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Locale } from '@/i18n-config'

export function generateMetadata({ params }: { params: { lang: Locale } }): Metadata {
  return {
    title: params.lang === 'zh' ? '气体红外成像产品与询盘 | Cooyue Tech' : 'Gas Imaging Products and Inquiry | Cooyue Tech',
    description: params.lang === 'zh'
      ? '根据目标气体、检测距离和使用环境查找气体红外成像产品，并通过邮件确认适用条件。'
      : 'Find gas imaging products by target gas, detection distance and operating environment, then confirm suitability by email.',
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
