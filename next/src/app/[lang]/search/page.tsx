import type { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { i18n, type Locale } from '@/i18n-config'
import { extractSeoMeta, getSeoByPath } from '@/lib/seo-api'
import ProductSearch from '@/components/knowledge/ProductSearch'
import SearchLoading from '@/components/knowledge/SearchLoading'
import { Suspense } from 'react'
import { getInitialProductSearch } from '@/lib/knowledge-server'
import type { InitialProductSearch } from '@/lib/knowledge-api'

export const dynamic = 'force-dynamic'

interface SearchPageProps {
  params: { lang: Locale }
  searchParams?: { keywords?: string | string[]; query?: string | string[] }
}

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const seoData = await getSeoByPath('/search', params.lang)
  const seoMeta = extractSeoMeta(seoData, {
    title: siteConfig.seo.titleTemplate(params.lang === 'zh' ? '产品搜索、对比与询盘' : 'Product Search, Comparison and Inquiry'),
    description: params.lang === 'zh' ? '描述需求，查找相关产品，比较参数并发送询盘邮件。' : 'Find related products, compare specifications and send an inquiry email.',
  })
  return {
    title: seoMeta.title, description: seoMeta.description, robots: { index: false, follow: true },
    alternates: {
      canonical: `/${params.lang}/search`,
      languages: Object.fromEntries(i18n.locales.map((locale) => [locale, `/${locale}/search`])),
    },
  }
}

export default function SearchPage({ params, searchParams }: SearchPageProps) {
  const value = searchParams?.keywords ?? searchParams?.query
  const initialQuery = (Array.isArray(value) ? value[0] || '' : value || '').trim()
  const result = getInitialProductSearch(initialQuery, params.lang)
  return <Suspense key={`${params.lang}:${initialQuery}`} fallback={<SearchLoading locale={params.lang} query={initialQuery} />}>
    <SearchResults locale={params.lang} query={initialQuery} result={result} />
  </Suspense>
}

async function SearchResults({ locale, query, result }: { locale: Locale; query: string; result: Promise<InitialProductSearch> }) {
  return <ProductSearch key={`${locale}:${query}`} locale={locale} initialQuery={query} initialSearch={await result} />
}
