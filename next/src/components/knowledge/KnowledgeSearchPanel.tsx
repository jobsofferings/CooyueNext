'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Locale } from '@/i18n-config'
import { knowledgeRequest, type KnowledgeSearchResult } from '@/lib/knowledge-api'
import styles from './knowledge.module.css'

interface Props {
  locale: Locale
  query: string
  onQueryChange: (query: string) => void
}

export default function KnowledgeSearchPanel({ locale, query, onQueryChange }: Props) {
  const [result, setResult] = useState<KnowledgeSearchResult | null>(null)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const isChinese = locale === 'zh'

  useEffect(() => {
    if (!query.trim()) return
    const controller = new AbortController()
    let active = true
    setPending(true)
    setFailed(false)
    setResult(null)
    knowledgeRequest<KnowledgeSearchResult>('search', { locale, query }, controller.signal)
      .then((response) => { if (active) setResult(response) })
      .catch(() => { if (active) setFailed(true) })
      .finally(() => { if (active) setPending(false) })
    return () => { active = false; controller.abort() }
  }, [locale, query])

  if (!query.trim()) return null
  if (pending) return <p role="status">{isChinese ? '正在查询已审核气体成像资料…' : 'Searching reviewed gas imaging evidence…'}</p>
  if (failed) return <p role="alert">{isChinese ? '知识检索暂时不可用，目录关键词搜索仍可使用。请稍后重新搜索。' : 'Knowledge search is unavailable. Catalog keyword search is still available; please retry later.'}</p>
  if (!result || result.query !== query.trim() || (!result.products.length && !result.clarification)) return null

  return (
    <section className={styles.card} aria-label={isChinese ? '知识库检索结果' : 'Knowledge search results'} aria-live="polite">
      <h2>{isChinese ? '气体成像 · 已审核资料' : 'Gas imaging · Reviewed evidence'}</h2>
      {result.clarification ? <div className={styles.notice}>
        <p>{result.clarification.message}</p>
        <div className={styles.examples}>{result.clarification.suggestions.map((suggestion) => (
          <button type="button" key={suggestion.query} onClick={() => onQueryChange(suggestion.query)}>
            {isChinese ? '按此补全重新搜索：' : 'Confirm and search: '}{suggestion.query}
          </button>
        ))}</div>
      </div> : <>
        <p>{isChinese ? `找到 ${result.products.length} 款有已审核依据的候选。气体与镜头配置仍需核对。` : `${result.products.length} candidates have reviewed evidence. Confirm the target gas and lens configuration.`}</p>
        <div className={styles.grid}>{result.products.map((product) => <article key={product.slug} className={styles.product}>
          <h3>{product.name}</h3>
          <p>{isChinese ? '红外分辨率' : 'Infrared resolution'}: {product.facts.resolution}</p>
          <a href={product.source.url} target="_blank" rel="noreferrer">{product.source.title} ↗</a>
        </article>)}</div>
        <Link className={styles.primary} href={`/${locale}/gas-imaging-assistant?query=${encodeURIComponent(query)}`}>
          {isChinese ? '继续对比、问答与询盘' : 'Continue to comparison, questions and inquiry'}
        </Link>
      </>}
    </section>
  )
}
