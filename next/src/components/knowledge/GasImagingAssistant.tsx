'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n-config'
import { knowledgeRequest, type KnowledgeProduct, type KnowledgeAnswer, type KnowledgeSearchResult, type InquiryDraft } from '@/lib/knowledge-api'
import styles from './knowledge.module.css'

const copy = {
  zh: {
    badge: 'COOYUE · KNOWLEDGE LAB', title: '从使用场景，到有依据的选型',
    intro: '气体红外成像验证专区：找产品、比较已核实参数、查阅来源，再确认你的询盘。',
    notice: '当前为关键词 / 同义词检索与资料摘述模式，未接入大模型或向量数据库。搜索条件按交集（AND）筛选，无法判定的限制不会被忽略；候选仍需核对实际配置和工况。',
    steps: ['描述需求', '对比候选', '查阅证据', '确认询盘'], search: '搜索已审核资料',
    query: '你想检测什么气体，如何使用设备？', placeholder: '例如：用于甲烷泄漏巡检的手持气体成像相机',
    examples: ['甲烷泄漏巡检，手持设备', '变电站六氟化硫 SF6 成像', '气体红外成像相机'],
    candidates: '候选产品', selectHint: '选择 1–3 款进行问答和询盘，至少 2 款可对比。仅展示已有审核资料的型号。',
    empty: '没有找到同时匹配全部条件的已审核资料，不会退回部分匹配。请核对条件；资料未覆盖不等于产品不支持。',
    select: '加入候选', detail: '产品详情', source: '官方来源', compare: '对比所选产品',
    gases: '已收录的目标气体', form: '形态', resolution: '红外分辨率', price: '目录价格', unknown: '待确认', handheld: '手持式',
    caveat: 'GF77 的气体适用性依镜头配置而定。价格、交期、检测距离及未列参数需由工程师确认，不能用相似度替代硬性参数判断。',
    question: '向资料提问', questionPlaceholder: '例如：PV400 的红外分辨率是多少？', ask: '查找有来源的回答',
    questionHint: '可询问目标气体、分辨率、形态与已记录的用途。资料不足时会明确说明，不推测未核实能力。',
    inquiry: '准备询盘', requirements: '补充工况与待确认问题（请勿填写敏感信息）', preview: '生成询盘预览',
    review: '请核对将要提交的内容', expires: '预览有效至', name: '联系人', email: '联系邮箱',
    consent: '我已核对选型摘要，同意提交这些内容及联系方式供 Cooyue 跟进。', submit: '确认并提交询盘',
    submitted: '询盘已保存，可凭编号跟进。本验证流程不自动发送邮件。', inquiryId: '询盘编号',
    loading: '处理中…', back: '返回产品目录', versions: '资料版本', selection: '已选产品', searchLabel: '搜索需求',
  },
  en: {
    badge: 'COOYUE · KNOWLEDGE LAB', title: 'From your application to evidence-led selection',
    intro: 'Explore gas imaging products, compare verified facts, inspect sources, then review your inquiry.',
    notice: 'Keyword / synonym retrieval and reviewed excerpts, without an LLM or vector database. Conditions use AND, and uncheckable restrictions are not ignored. Candidates still require configuration and application verification.',
    steps: ['Describe', 'Compare', 'Inspect evidence', 'Confirm inquiry'], search: 'Search reviewed evidence',
    query: 'Which gas do you need to detect, and how?', placeholder: 'For example: handheld imaging for methane leak inspections',
    examples: ['Handheld methane leak inspection', 'SF6 imaging at substations', 'Optical gas imaging cameras'],
    candidates: 'Candidate products', selectHint: 'Choose 1–3 for questions and inquiries, or at least 2 to compare. Only models with reviewed evidence are shown.',
    empty: 'No reviewed evidence matches all conditions; partial matches are not substituted. Check the conditions. Missing evidence does not mean a product is incompatible.',
    select: 'Select candidate', detail: 'Product details', source: 'Official source', compare: 'Compare selected products',
    gases: 'Documented target gases', form: 'Form factor', resolution: 'Infrared resolution', price: 'Catalog price', unknown: 'To be confirmed', handheld: 'Handheld',
    caveat: 'GF77 gas compatibility depends on the lens configuration. Pricing, lead times, detection distance and undocumented specifications require engineering confirmation.',
    question: 'Ask the evidence', questionPlaceholder: 'For example: what is the infrared resolution of PV400?', ask: 'Find a sourced answer',
    questionHint: 'Ask about gases, resolution, form factor or documented applications. Missing evidence is reported instead of guessing.',
    inquiry: 'Prepare an inquiry', requirements: 'Additional conditions and questions (do not include sensitive information)', preview: 'Create inquiry preview',
    review: 'Review exactly what will be submitted', expires: 'Preview expires', name: 'Contact name', email: 'Contact email',
    consent: 'I have reviewed the summary and agree to submit it and my contact details for Cooyue to follow up.', submit: 'Confirm and submit inquiry',
    submitted: 'Your inquiry is saved for follow-up using its reference. This validation workflow does not automatically send email.', inquiryId: 'Inquiry reference',
    loading: 'Working…', back: 'Back to products', versions: 'Source version', selection: 'Selected products', searchLabel: 'Search requirements',
  },
}

const gasLabels: Record<string, { zh: string; en: string }> = {
  methane: { zh: '甲烷', en: 'Methane' }, sf6: { zh: '六氟化硫（SF6）', en: 'SF6' },
  voc: { zh: '部分挥发性有机化合物', en: 'Selected VOCs' }, ammonia: { zh: '氨', en: 'Ammonia' }, ethylene: { zh: '乙烯', en: 'Ethylene' },
}

export default function GasImagingAssistant({ locale, initialQuery = '' }: { locale: Locale; initialQuery?: string }) {
  const labels = copy[locale]
  const [query, setQuery] = useState(initialQuery)
  const [products, setProducts] = useState<KnowledgeProduct[] | null>(null)
  const [clarification, setClarification] = useState<KnowledgeSearchResult['clarification']>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [comparison, setComparison] = useState<KnowledgeProduct[] | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<KnowledgeAnswer | null>(null)
  const [requirements, setRequirements] = useState('')
  const [draft, setDraft] = useState<InquiryDraft | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!initialQuery.trim()) return
    const controller = new AbortController()
    let active = true
    setBusy('search')
    knowledgeRequest<KnowledgeSearchResult>('search', { query: initialQuery, locale }, controller.signal)
      .then((result) => { if (active) { setProducts(result.products); setClarification(result.clarification) } })
      .catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : 'Request failed') })
      .finally(() => { if (active) setBusy('') })
    return () => { active = false; controller.abort() }
  }, [initialQuery, locale])

  function resetDraft() { setDraft(null); setConsent(false); setSubmitted(null) }
  function editQuery(value: string) {
    setQuery(value); setProducts(null); setClarification(null); setSelected([]); setComparison(null); setAnswer(null); resetDraft()
  }
  async function run(operation: string, task: () => Promise<void>) {
    if (busy) return
    setBusy(operation); setError('')
    try { await task() } catch (failure) { setError(failure instanceof Error ? failure.message : 'Request failed') }
    finally { setBusy('') }
  }
  async function search(event: FormEvent) {
    event.preventDefault()
    await searchFor(query)
  }
  async function searchFor(nextQuery: string) {
    await run('search', async () => {
      setQuery(nextQuery); setSelected([]); setComparison(null); setAnswer(null); setClarification(null); resetDraft()
      const result = await knowledgeRequest<KnowledgeSearchResult>('search', { query: nextQuery, locale })
      setProducts(result.products)
      setClarification(result.clarification)
    })
  }
  function toggle(slug: string) {
    setSelected((previous) => previous.includes(slug) ? previous.filter((value) => value !== slug) : [...previous, slug])
    setComparison(null); setAnswer(null); resetDraft()
  }
  function gases(product: KnowledgeProduct) { return product.facts.gases.map((gas) => gasLabels[gas]?.[locale] || gas).join(' / ') }
  function price(product: KnowledgeProduct) { return product.price === null ? labels.unknown : `${product.currency} ${product.price}` }
  const buttonText = (operation: string, idle: string) => busy === operation ? labels.loading : idle

  return (
    <main className={styles.page} aria-busy={Boolean(busy)}>
      <div className={styles.container}>
        <Link className={styles.back} href={`/${locale}/products`}>← {labels.back}</Link>
        <header className={styles.header}>
          <span className={styles.badge}>{labels.badge}</span>
          <h1>{labels.title}</h1><p>{labels.intro}</p>
          <ol className={styles.steps}>{labels.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
        </header>
        <p className={styles.notice}>{labels.notice}</p>
        <section className={styles.card} aria-labelledby="knowledge-search-title">
          <h2 id="knowledge-search-title">01 / {labels.steps[0]}</h2>
          <form onSubmit={search} className={styles.form}>
            <label htmlFor="knowledge-query">{labels.query}</label>
            <textarea id="knowledge-query" value={query} onChange={(event) => editQuery(event.target.value)} required maxLength={500} placeholder={labels.placeholder} disabled={Boolean(busy)} />
            <div className={styles.examples}>{labels.examples.map((example) => <button type="button" key={example} onClick={() => editQuery(example)} disabled={Boolean(busy)}>{example}</button>)}</div>
            <button className={styles.primary} disabled={Boolean(busy) || !query.trim()}>{buttonText('search', labels.search)}</button>
          </form>
        </section>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {products && <section className={styles.card} aria-labelledby="knowledge-candidates-title" aria-live="polite">
          <h2 id="knowledge-candidates-title">02 / {labels.candidates}</h2><p>{labels.selectHint}</p>
          {clarification && <div className={styles.notice}>
            <p>{clarification.message}</p>
            <div className={styles.examples}>{clarification.suggestions.map((suggestion) => <button type="button" key={suggestion.query} disabled={Boolean(busy)} onClick={() => searchFor(suggestion.query)}>
              {locale === 'zh' ? '按此补全重新搜索：' : 'Confirm and search: '}{suggestion.query}
            </button>)}</div>
          </div>}
          {!products.length && !clarification && <p className={styles.notice}>{labels.empty}</p>}
          <div className={styles.grid}>{products.map((product) => <article key={product.slug} className={`${styles.product} ${selected.includes(product.slug) ? styles.selected : ''}`}>
            <h3>{product.name}</h3><p>{gases(product)}</p><p>{labels.resolution}: {product.facts.resolution}</p>
            <div className={styles.links}><Link href={`/${locale}/products/${product.slug}`}>{labels.detail}</Link><a href={product.source.url} target="_blank" rel="noreferrer">{labels.source} ↗</a></div>
            <label className={styles.check}><input type="checkbox" checked={selected.includes(product.slug)} onChange={() => toggle(product.slug)} disabled={Boolean(busy) || (!selected.includes(product.slug) && selected.length === 3)} />{labels.select}</label>
          </article>)}</div>
          {!!products.length && <>
            <p className={styles.hint}>{labels.caveat}</p>
            <button className={styles.primary} disabled={Boolean(busy) || selected.length < 2} onClick={() => run('compare', async () => {
              const result = await knowledgeRequest<{ products: KnowledgeProduct[] }>('compare', { locale, productSlugs: selected }); setComparison(result.products)
            })}>{buttonText('compare', labels.compare)} ({selected.length})</button>
          </>}
          {comparison && <div className={styles.tableScroll}><table><caption>{labels.compare}</caption><thead><tr><th scope="col">{labels.selection}</th>{comparison.map((product) => <th scope="col" key={product.slug}>{product.name}</th>)}</tr></thead>
            <tbody>{[
              { label: labels.gases, value: gases }, { label: labels.form, value: () => labels.handheld },
              { label: labels.resolution, value: (product: KnowledgeProduct) => product.facts.resolution }, { label: labels.price, value: price },
            ].map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{comparison.map((product) => <td key={product.slug}>{row.value(product)}</td>)}</tr>)}
              <tr><th scope="row">{labels.source}</th>{comparison.map((product) => <td key={product.slug}><a href={product.source.url} target="_blank" rel="noreferrer">{product.source.title}</a><small>{product.source.version}</small></td>)}</tr>
            </tbody></table></div>}
        </section>}
        {selected.length > 0 && <>
          <section className={styles.card} aria-labelledby="knowledge-question-title">
            <h2 id="knowledge-question-title">03 / {labels.question}</h2><p>{labels.questionHint}</p>
            <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void run('answer', async () => {
              setAnswer(null); const result = await knowledgeRequest<KnowledgeAnswer>('answer', { locale, question, productSlugs: selected }); setAnswer(result)
            }) }}>
              <label htmlFor="knowledge-question">{labels.question}</label>
              <textarea id="knowledge-question" value={question} required maxLength={1000} placeholder={labels.questionPlaceholder} disabled={Boolean(busy)} onChange={(event) => { setQuestion(event.target.value); setAnswer(null); resetDraft() }} />
              <button className={styles.primary} disabled={Boolean(busy) || !question.trim()}>{buttonText('answer', labels.ask)}</button>
            </form>
            {answer && <div className={styles.answer} aria-live="polite"><p>{answer.answer}</p>{answer.passages.map((passage, index) => {
              const citation = answer.citations.find((item) => item.id === passage.citationId)
              return <blockquote key={passage.citationId}><p>{passage.text}</p>{citation && <footer><a href={citation.url} target="_blank" rel="noreferrer">[{index + 1}] {citation.title} · {citation.section}</a><small>{labels.versions}: {citation.version}</small></footer>}</blockquote>
            })}</div>}
          </section>
          <section className={styles.card} aria-labelledby="knowledge-inquiry-title">
            <h2 id="knowledge-inquiry-title">04 / {labels.inquiry}</h2>
            <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void run('draft', async () => {
              resetDraft(); const result = await knowledgeRequest<InquiryDraft>('inquiries/draft', { locale, query, question, requirements, productSlugs: selected }); setDraft(result)
            }) }}>
              <label htmlFor="knowledge-requirements">{labels.requirements}</label>
              <textarea id="knowledge-requirements" maxLength={2000} value={requirements} disabled={Boolean(busy)} onChange={(event) => { setRequirements(event.target.value); resetDraft() }} />
              <button className={styles.primary} disabled={Boolean(busy)}>{buttonText('draft', labels.preview)}</button>
            </form>
            {draft && !submitted && <div className={styles.preview}>
              <h3>{labels.review}</h3><p>{labels.searchLabel}: {draft.summary.query}</p>
              {draft.summary.question && <p>{labels.question}: {draft.summary.question}</p>}
              {draft.summary.requirements && <p className={styles.preserve}>{draft.summary.requirements}</p>}
              <ul>{draft.summary.products.map((product) => <li key={product.slug}><strong>{product.name}</strong> · {gases(product)} · {product.facts.resolution} · {price(product)}<br /><a href={product.source.url} target="_blank" rel="noreferrer">{product.source.title}</a> ({product.source.version})</li>)}</ul>
              <p className={styles.hint}>{labels.expires}: {new Date(draft.expiresAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</p>
              <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void run('confirm', async () => {
                const result = await knowledgeRequest<{ id: string }>(`inquiries/${draft.id}/confirm`, { confirmationToken: draft.confirmationToken, confirmed: consent, name, email }); setSubmitted(result.id)
              }) }}>
                <label htmlFor="knowledge-name">{labels.name}</label><input id="knowledge-name" autoComplete="name" value={name} required maxLength={100} disabled={Boolean(busy)} onChange={(event) => { setName(event.target.value); setConsent(false) }} />
                <label htmlFor="knowledge-email">{labels.email}</label><input id="knowledge-email" type="email" autoComplete="email" value={email} required maxLength={254} disabled={Boolean(busy)} onChange={(event) => { setEmail(event.target.value); setConsent(false) }} />
                <label className={styles.check}><input type="checkbox" checked={consent} required disabled={Boolean(busy)} onChange={(event) => setConsent(event.target.checked)} />{labels.consent}</label>
                <button className={styles.primary} disabled={Boolean(busy) || !consent}>{buttonText('confirm', labels.submit)}</button>
              </form>
            </div>}
            {submitted && <div role="status" className={styles.success}><p>{labels.submitted}</p><strong>{labels.inquiryId}: {submitted}</strong></div>}
          </section>
        </>}
      </div>
    </main>
  )
}
