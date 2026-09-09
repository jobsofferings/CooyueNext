'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n-config'
import { knowledgeRequest, type KnowledgeProduct, type KnowledgeSearchResult, type InquiryDraft, type InitialProductSearch } from '@/lib/knowledge-api'
import SearchProgress, { type SearchPhase } from './SearchProgress'
import styles from './knowledge.module.css'

const copy = {
  zh: {
    title: '搜索产品，比较后直接询盘', intro: '不必先确定型号，用一句话说说你想找什么。相关产品会合并展示，方便比较和询盘。',
    query: '你想找什么产品？', placeholder: '例如：我想要一个 K10 的板子或者是红外镜头的目镜', search: '搜索产品',
    examples: ['K10 的板子或者红外镜头的目镜', '气体成像', '手持热像仪'],
    candidates: '相关产品', results: '个相关产品', select: '加入对比 / 询盘', selected: '已选产品',
    selectHint: '可跨搜索保留已选产品，最多选择 12 款；选择至少 2 款即可对比。',
    empty: '暂未找到相关产品，试试其他型号、部件名称或用途。', idle: '输入模糊需求、型号或部件名称，开始寻找产品。',
    detail: '产品详情', compare: '对比所选产品', remove: '移除', more: '显示更多产品',
    category: '产品分类', specs: '产品规格', gases: '已收录的目标气体', resolution: '红外分辨率', unknown: '待确认',
    caveat: '搜索结果按相关性合并，并非全部条件均已满足；未列参数、实际配置、适用工况与交期请在询盘中确认。',
    inquiry: '询盘所选产品', requirements: '补充需求与待确认问题', contentLimit: '手填内容（含搜索需求）最多 1000 字',
    preview: '预览询盘邮件', review: '请核对邮件内容', expires: '预览有效至', name: '姓名（最多 100 字符）', email: '邮箱（最多 100 字符）',
    consent: '我已核对所选产品和邮件内容，同意将这些内容及联系方式发送给 Cooyue 工作人员跟进。',
    submit: '确认并发送询盘邮件', submitted: '询盘邮件发送成功，请静待工作人员与您联系',
    loading: '处理中…', searching: '正在查找相关产品…', back: '返回产品目录', searchLabel: '搜索需求',
    failure: '请求失败，请稍后重试。', deliveryFailure: '尚未确认邮件发送成功，请稍后重试。', clear: '清空已选',
  },
  en: {
    title: 'Find products, compare and inquire', intro: 'Describe what you are looking for, even if you do not know the exact model. Explore related products together, compare and send an inquiry.',
    query: 'What are you looking for?', placeholder: 'For example: a K10 board or an eyepiece for an infrared lens', search: 'Search products',
    examples: ['A K10 board or an infrared lens eyepiece', 'Gas imaging', 'Handheld thermal cameras'],
    candidates: 'Related products', results: 'related products', select: 'Select for comparison / inquiry', selected: 'Selected products',
    selectHint: 'Keep selections across searches. Choose up to 12 products, or at least 2 to compare.',
    empty: 'No related products found. Try another model, component or application.', idle: 'Enter an approximate requirement, model or component to get started.',
    detail: 'Product details', compare: 'Compare selected products', remove: 'Remove', more: 'Show more products',
    category: 'Product category', specs: 'Specifications', gases: 'Documented target gases', resolution: 'Infrared resolution', unknown: 'To be confirmed',
    caveat: 'Results combine related matches, not verified compliance with every condition. Confirm missing specifications, configuration, suitability and lead time in your inquiry.',
    inquiry: 'Inquire about selected products', requirements: 'Additional requirements and questions', contentLimit: 'Up to 1,000 characters of user-written content, including your search',
    preview: 'Preview inquiry email', review: 'Review your email', expires: 'Preview expires', name: 'Name (up to 100 characters)', email: 'Email (up to 100 characters)',
    consent: 'I have reviewed the products and message and agree to email this information and my contact details to Cooyue staff for follow-up.',
    submit: 'Confirm and send inquiry email', submitted: 'Your inquiry email has been sent successfully. Please wait for our staff to contact you.',
    loading: 'Working…', searching: 'Finding related products…', back: 'Back to products', searchLabel: 'Search requirements',
    failure: 'The request failed. Please try again.', deliveryFailure: 'Email delivery has not been confirmed. Please try again shortly.', clear: 'Clear selection',
  },
}

const gasLabels: Record<string, { zh: string; en: string }> = {
  methane: { zh: '甲烷', en: 'Methane' }, sf6: { zh: '六氟化硫（SF6）', en: 'SF6' },
  voc: { zh: '部分挥发性有机化合物', en: 'Selected VOCs' }, ammonia: { zh: '氨', en: 'Ammonia' }, ethylene: { zh: '乙烯', en: 'Ethylene' },
}

export default function ProductSearch({ locale, initialQuery = '', initialSearch }: { locale: Locale; initialQuery?: string; initialSearch?: InitialProductSearch }) {
  const labels = copy[locale]
  const [input, setInput] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery.trim())
  const [products, setProducts] = useState<KnowledgeProduct[] | null>(initialSearch?.products ?? null)
  const [selected, setSelected] = useState<KnowledgeProduct[]>([])
  const [comparison, setComparison] = useState<KnowledgeProduct[] | null>(null)
  const [visibleCount, setVisibleCount] = useState(12)
  const [requirements, setRequirements] = useState('')
  const [draft, setDraft] = useState<InquiryDraft | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchPhase, setSearchPhase] = useState<SearchPhase>('idle')
  const [searchAttempt, setSearchAttempt] = useState(0)
  const [error, setError] = useState(initialSearch?.error || '')
  const [errorTarget, setErrorTarget] = useState('search')
  const disabled = Boolean(busy)
  const contentLength = query.length + requirements.length

  function resetDraft() { setDraft(null); setConsent(false); setSubmitted(false) }

  useEffect(() => {
    const syncQuery = (value: string) => {
      setInput(value); setQuery(value.trim()); setSearchAttempt((attempt) => attempt + 1); setDraft(null); setConsent(false); setSubmitted(false)
    }
    const externalSearch = (event: Event) => syncQuery((event as CustomEvent<{ keywords?: string }>).detail?.keywords || '')
    const historySearch = () => {
      const parameters = new URL(window.location.href).searchParams
      syncQuery(parameters.get('keywords') || parameters.get('query') || '')
    }
    window.addEventListener('cooyue:search-keywords', externalSearch)
    window.addEventListener('popstate', historySearch)
    return () => {
      window.removeEventListener('cooyue:search-keywords', externalSearch)
      window.removeEventListener('popstate', historySearch)
    }
  }, [])

  useEffect(() => {
    if (initialSearch && searchAttempt === 0 && query === initialQuery.trim()) return
    setProducts(null); setVisibleCount(12); setError(''); setErrorTarget('search')
    if (!query) { setSearching(false); setSearchPhase('idle'); return }
    const controller = new AbortController()
    setSearching(true)
    setSearchPhase('recognizing')
    const phaseTimer = window.setTimeout(() => setSearchPhase('matching'), 900)
    knowledgeRequest<KnowledgeSearchResult>('search', { query, locale }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setProducts(result.products); setSearchPhase('complete') } })
      .catch((failure) => { if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : labels.failure); setSearchPhase('idle') } })
      .finally(() => { if (!controller.signal.aborted) setSearching(false) })
    return () => { window.clearTimeout(phaseTimer); controller.abort() }
  }, [query, locale, searchAttempt, labels.failure, initialQuery, initialSearch])

  function searchFor(value: string) {
    if (disabled) return
    const nextQuery = value.trim()
    setInput(value); setQuery(nextQuery); setSearchAttempt((attempt) => attempt + 1); resetDraft()
    window.history.pushState({ keywords: nextQuery }, '', `/${locale}/search${nextQuery ? `?keywords=${encodeURIComponent(nextQuery)}` : ''}`)
  }

  function toggle(product: KnowledgeProduct) {
    setSelected((previous) => previous.some((item) => item.slug === product.slug)
      ? previous.filter((item) => item.slug !== product.slug)
      : previous.length < 12 ? [...previous, product] : previous)
    setComparison(null); resetDraft()
  }

  async function run(operation: string, task: () => Promise<void>) {
    if (busy) return
    setBusy(operation); setError(''); setErrorTarget(operation === 'confirm' || operation === 'draft' ? 'inquiry' : 'search')
    try { await task() } catch (failure) { setError(failure instanceof Error ? failure.message : labels.failure) }
    finally { setBusy('') }
  }

  async function compare() {
    await run('compare', async () => {
      const result = await knowledgeRequest<{ products: KnowledgeProduct[] }>('compare', { locale, productSlugs: selected.map((product) => product.slug) })
      setComparison(result.products)
      setTimeout(() => document.getElementById('product-comparison')?.scrollIntoView({ block: 'start' }), 0)
    })
  }

  async function preview(event: FormEvent) {
    event.preventDefault()
    await run('draft', async () => {
      resetDraft()
      setDraft(await knowledgeRequest<InquiryDraft>('inquiries/draft', { locale, query, requirements, productSlugs: selected.map((product) => product.slug) }))
    })
  }

  async function confirm(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    await run('confirm', async () => {
      const result = await knowledgeRequest<{ delivery: string }>(`inquiries/${draft.id}/confirm`, { confirmationToken: draft.confirmationToken, confirmed: consent, name, email })
      if (result.delivery !== 'sent') throw new Error(labels.deliveryFailure)
      setSubmitted(true)
    })
  }

  const metrics = Array.from(new Set(comparison?.flatMap((product) => product.metrics.map((metric) => metric.label)) || []))
  const rows: Array<{ label: string; value: (product: KnowledgeProduct) => string }> = [
    { label: labels.category, value: (product) => product.categoryName },
    { label: labels.specs, value: (product) => product.specs.join('\n') },
    ...(comparison?.some((product) => product.facts.gases.length) ? [{ label: labels.gases, value: (product: KnowledgeProduct) => product.facts.gases.map((gas) => gasLabels[gas]?.[locale] || gas).join(' / ') }] : []),
    ...(comparison?.some((product) => product.facts.resolution) ? [{ label: labels.resolution, value: (product: KnowledgeProduct) => product.facts.resolution }] : []),
    ...metrics.map((label) => ({ label, value: (product: KnowledgeProduct) => product.metrics.find((metric) => metric.label === label)?.value || '' })),
  ]

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link className={styles.back} href={`/${locale}/products`}>← {labels.back}</Link>
        <header className={styles.header}><span className={styles.badge}>COOYUE · PRODUCT SEARCH</span><h1>{labels.title}</h1><p>{labels.intro}</p></header>
        <form action={`/${locale}/search`} method="get" className={`${styles.card} ${styles.form}`} onSubmit={(event) => { event.preventDefault(); searchFor(input) }}>
          <label htmlFor="product-query">{labels.query}</label>
          <div className={styles.searchBar}><input id="product-query" name="keywords" type="search" value={input} maxLength={500} required disabled={disabled} placeholder={labels.placeholder} onChange={(event) => setInput(event.target.value)} /><button className={styles.primary} disabled={disabled || !input.trim()}>{labels.search}</button></div>
          <div className={styles.examples}>{labels.examples.map((example) => <button type="button" key={example} disabled={disabled} onClick={() => searchFor(example)}>{example}</button>)}</div>
        </form>
        {error && errorTarget === 'search' && <p role="alert" className={styles.error}>{error}</p>}
        <section className={styles.card} aria-labelledby="product-results-title" aria-busy={searching}>
          <h2 id="product-results-title">{labels.candidates}</h2><p>{labels.selectHint}</p>
          <p className={styles.hint}>{labels.caveat}</p>
          {searching ? <SearchProgress locale={locale} phase={searchPhase} /> : <p role="status">{products ? `${products.length} ${labels.results}` : !query ? labels.idle : ''}</p>}
          {products?.length === 0 && <p className={styles.notice}>{labels.empty}</p>}
          <div className={styles.grid}>{products?.slice(0, visibleCount).map((product) => {
            const checked = selected.some((item) => item.slug === product.slug)
            return <article key={product.slug} className={`${styles.product} ${checked ? styles.selected : ''}`}>
              <span className={styles.hint}>{product.categoryName}</span><h3>{product.name}</h3><p>{product.description}</p>
              <ul>{product.specs.slice(0, 4).map((spec) => <li key={spec}>{spec}</li>)}</ul>
              <div className={styles.links}><Link href={`/${locale}/products/${product.slug}`}>{labels.detail}</Link></div>
              <label className={styles.check}><input type="checkbox" checked={checked} disabled={disabled || (!checked && selected.length >= 12)} onChange={() => toggle(product)} />{labels.select}</label>
            </article>
          })}</div>
          {products && products.length > visibleCount && <button type="button" className={styles.secondary} onClick={() => setVisibleCount((count) => count + 12)}>{labels.more} ({products.length - visibleCount})</button>}
        </section>
        {selected.length > 0 && <aside className={styles.selectionBar} aria-label={labels.selected}>
          <strong>{labels.selected} ({selected.length}/12)</strong>
          <div className={styles.examples}>{selected.map((product) => <button type="button" key={product.slug} disabled={disabled} onClick={() => toggle(product)} aria-label={`${labels.remove} ${product.name}`}>{product.model} ×</button>)}</div>
          <div className={styles.actions}><button type="button" className={styles.primary} disabled={disabled || selected.length < 2} onClick={() => void compare()}>{busy === 'compare' ? labels.loading : labels.compare}</button><a href="#product-inquiry">{labels.inquiry}</a><button type="button" className={styles.secondary} disabled={disabled} onClick={() => { setSelected([]); setComparison(null); resetDraft() }}>{labels.clear}</button></div>
        </aside>}
        {comparison && <section id="product-comparison" className={styles.card}>
          <h2>{labels.compare}</h2>
          <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={labels.compare}><table>
            <caption>{labels.compare}</caption><thead><tr><th scope="col">{labels.selected}</th>{comparison.map((product) => <th scope="col" key={product.slug}>{product.name}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={`${row.label}:${index}`}><th scope="row">{row.label}</th>{comparison.map((product) => <td className={styles.preserve} key={product.slug}>{row.value(product) || labels.unknown}</td>)}</tr>)}
              <tr><th scope="row">{labels.detail}</th>{comparison.map((product) => <td key={product.slug}><Link href={`/${locale}/products/${product.slug}`} target="_blank" rel="noopener noreferrer">{labels.detail}</Link></td>)}</tr>
            </tbody>
          </table></div>
          <p className={styles.hint}>{labels.caveat}</p><a href="#product-inquiry">{labels.inquiry} ↓</a>
        </section>}
        {selected.length > 0 && <section id="product-inquiry" className={styles.card} aria-labelledby="product-inquiry-title">
          <h2 id="product-inquiry-title">{labels.inquiry}</h2>
          {error && errorTarget === 'inquiry' && <p role="alert" className={styles.error}>{error}</p>}
          {!submitted && <>
            <form className={styles.form} onSubmit={preview}>
              <label htmlFor="inquiry-requirements">{labels.requirements}</label>
              <textarea id="inquiry-requirements" maxLength={Math.max(0, 1000 - query.length)} value={requirements} disabled={disabled} onChange={(event) => { setRequirements(event.target.value); resetDraft() }} aria-describedby="inquiry-content-limit" />
              <small id="inquiry-content-limit">{labels.contentLimit} · {contentLength}/1000</small>
              <button className={styles.primary} disabled={disabled || contentLength > 1000 || !query}>{busy === 'draft' ? labels.loading : labels.preview}</button>
            </form>
            {draft && <div className={styles.preview}>
              <h3>{labels.review}</h3><p>{labels.searchLabel}: {draft.summary.query}</p>
              {draft.summary.requirements && <p className={styles.preserve}>{draft.summary.requirements}</p>}
              <ul>{draft.summary.products.map((product) => <li key={product.slug}><Link href={`/${locale}/products/${product.slug}`}>{product.name}</Link><span> · {product.categoryName}</span>{product.metrics.map((metric) => <small key={metric.label}>{metric.label}: {metric.value}</small>)}</li>)}</ul>
              <p className={styles.hint}>{labels.expires}: {new Date(draft.expiresAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</p>
              <form className={styles.form} onSubmit={confirm}>
                <label htmlFor="inquiry-name">{labels.name}</label><input id="inquiry-name" autoComplete="name" value={name} required maxLength={100} disabled={disabled} onChange={(event) => { setName(event.target.value); setConsent(false) }} />
                <label htmlFor="inquiry-email">{labels.email}</label><input id="inquiry-email" type="email" autoComplete="email" value={email} required maxLength={100} disabled={disabled} onChange={(event) => { setEmail(event.target.value); setConsent(false) }} />
                <label className={styles.check}><input type="checkbox" checked={consent} required disabled={disabled} onChange={(event) => setConsent(event.target.checked)} />{labels.consent}</label>
                <button className={styles.primary} disabled={disabled || !consent}>{busy === 'confirm' ? labels.loading : labels.submit}</button>
              </form>
            </div>}
          </>}
          {submitted && <div role="status" className={styles.success}>{labels.submitted}</div>}
        </section>}
      </div>
    </main>
  )
}
