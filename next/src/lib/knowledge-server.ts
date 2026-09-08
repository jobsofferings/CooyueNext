import 'server-only'
import { headers } from 'next/headers'
import type { Locale } from '@/i18n-config'
import type { InitialProductSearch, KnowledgeSearchResult } from './knowledge-api'

export async function getInitialProductSearch(query: string, locale: Locale): Promise<InitialProductSearch> {
  if (!query) return { products: null, error: '' }
  if (query.length > 500) return { products: null, error: locale === 'zh' ? '搜索需求最多 500 字符，请缩短后重试。' : 'Limit your search to 500 characters and try again.' }
  const requestHeaders = headers()
  const apiUrl = process.env.KNOWLEDGE_API_URL || process.env.SEO_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'
  try {
    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/knowledge/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': requestHeaders.get('x-forwarded-for') || '',
        'x-real-ip': requestHeaders.get('x-real-ip') || '',
      },
      body: JSON.stringify({ query, locale }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const payload = await response.json() as { ok: boolean; data?: KnowledgeSearchResult }
    if (!response.ok || !payload.ok || !Array.isArray(payload.data?.products)) throw new Error('Search unavailable')
    return { products: payload.data.products, error: '' }
  } catch {
    return { products: null, error: locale === 'zh' ? '首次搜索暂时不可用，请点击“搜索产品”重试。' : 'Initial search is unavailable. Select “Search products” to retry.' }
  }
}
