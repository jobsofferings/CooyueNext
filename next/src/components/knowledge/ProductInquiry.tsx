'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n-config'
import { knowledgeRequest, type InquiryDraft, type KnowledgeProduct } from '@/lib/knowledge-api'
import styles from './agent.module.css'

export default function ProductInquiry({ locale, query, products, disabled, stale, onBusyChange }: {
  locale: Locale; query: string; products: KnowledgeProduct[]; disabled: boolean; stale: boolean; onBusyChange: (busy: boolean) => void
}) {
  const chinese = locale === 'zh'
  const prefix = useId()
  const [requirements, setRequirements] = useState('')
  const [draft, setDraft] = useState<InquiryDraft | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const notify = useRef(onBusyChange)
  notify.current = onBusyChange
  const fingerprint = JSON.stringify(products.map((product) => [product.slug, product.version]))
  const contentLength = query.length + requirements.length
  const locked = disabled || Boolean(busy) || stale

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (controller.current) { controller.current.abort(); notify.current(false) } }
  }, [])

  useEffect(() => { setDraft(null); setConsent(false); setSubmitted(false); setError('') }, [fingerprint, query])
  useEffect(() => { if (stale) { setDraft(null); setConsent(false) } }, [stale])

  async function run(operation: string, task: (signal: AbortSignal) => Promise<void>) {
    if (locked || controller.current) return
    const abort = new AbortController()
    controller.current = abort
    setBusy(operation); setError(''); notify.current(true)
    try { await task(abort.signal) } catch {
      if (mounted.current && !abort.signal.aborted) setError(operation === 'confirm'
        ? chinese ? '尚未确认邮件发送成功。请稍后重试同一份预览，不要重复新建询盘。' : 'Delivery is not confirmed. Retry this preview rather than creating another inquiry.'
        : chinese ? '暂时无法生成预览，请重试；若产品有更新，请重新搜索。' : 'Unable to prepare the preview. Please retry, or search again if the products changed.')
    } finally {
      controller.current = null
      if (mounted.current) { setBusy(''); notify.current(false) }
    }
  }

  async function preview(event: FormEvent) {
    event.preventDefault()
    if (!query || !products.length || contentLength > 1000) return
    await run('draft', async (signal) => {
      setDraft(null); setConsent(false)
      const result = await knowledgeRequest<InquiryDraft>('inquiries/draft', { locale, query, requirements, productSlugs: products.map((product) => product.slug) }, signal)
      if (!signal.aborted && mounted.current) setDraft(result)
    })
  }

  async function confirm(event: FormEvent) {
    event.preventDefault()
    if (!draft || !consent || !name.trim() || !email.trim() || submitted) return
    await run('confirm', async (signal) => {
      const result = await knowledgeRequest<{ delivery: string }>(`inquiries/${draft.id}/confirm`, { confirmationToken: draft.confirmationToken, confirmed: consent, name, email }, signal)
      if (result.delivery !== 'sent') throw new Error('DELIVERY_UNCONFIRMED')
      if (!signal.aborted && mounted.current) setSubmitted(true)
    })
  }

  return <div data-inquiry-form>
    <p className={styles.actionHint}>{chinese ? '仅在您预览、填写联系方式并确认后发送邮件，助手不会自动提交。' : 'Email is sent only after you preview it, provide contact details and confirm. The assistant never submits automatically.'}</p>
    <ul className={styles.inquiryProducts}>{products.map((product) => <li key={product.slug}>{product.name}</li>)}</ul>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {submitted ? <p role="status" className={styles.success}>{chinese ? '询盘邮件发送成功，请静待工作人员与您联系。' : 'Your inquiry email was sent. Our team will contact you.'}</p> : <>
      <form className={styles.inquiryForm} onSubmit={preview}>
        <label htmlFor={`${prefix}-query`}>{chinese ? '本轮需求' : 'Requirements from this turn'}</label><p id={`${prefix}-query`}>{query}</p>
        <label htmlFor={`${prefix}-requirements`}>{chinese ? '补充需求与待确认问题' : 'Additional requirements and questions'}</label>
        <textarea id={`${prefix}-requirements`} value={requirements} maxLength={Math.max(0, 1000 - query.length)} disabled={locked}
          onChange={(event) => { setRequirements(event.target.value); setDraft(null); setConsent(false) }} aria-describedby={`${prefix}-limit`} />
        <small id={`${prefix}-limit`}>{chinese ? '含本轮需求，手填内容最多 1000 字' : 'Up to 1,000 characters including this turn’s requirements'} · {contentLength}/1000</small>
        <button type="submit" className={styles.actionButton} disabled={locked || contentLength > 1000 || !query}>{busy === 'draft' ? chinese ? '正在生成预览…' : 'Preparing preview…' : chinese ? '预览询盘邮件' : 'Preview inquiry email'}</button>
      </form>
      {draft && <div className={styles.inquiryPreview}>
        <h4>{chinese ? '请核对邮件内容' : 'Review your email'}</h4><p>{draft.summary.query}</p>
        {draft.summary.requirements && <p>{draft.summary.requirements}</p>}
        <ul>{draft.summary.products.map((product) => <li key={product.slug}><Link href={`/${locale}/products/${product.slug}`} target="_blank" rel="noopener noreferrer">{product.name}</Link><span> · {product.categoryName}</span>{product.metrics.map((metric) => <small key={metric.label}>{metric.label}: {metric.value}</small>)}</li>)}</ul>
        <p className={styles.actionHint}>{chinese ? '预览有效至' : 'Preview expires'}: {new Date(draft.expiresAt).toLocaleString(chinese ? 'zh-CN' : 'en-US')}</p>
        <form className={styles.inquiryForm} onSubmit={confirm}>
          <label htmlFor={`${prefix}-name`}>{chinese ? '姓名' : 'Name'}</label><input id={`${prefix}-name`} autoComplete="name" value={name} required maxLength={100} disabled={locked} onChange={(event) => { setName(event.target.value); setConsent(false) }} />
          <label htmlFor={`${prefix}-email`}>{chinese ? '邮箱' : 'Email'}</label><input id={`${prefix}-email`} type="email" autoComplete="email" value={email} required maxLength={100} disabled={locked} onChange={(event) => { setEmail(event.target.value); setConsent(false) }} />
          <label className={styles.consent}><input type="checkbox" checked={consent} required disabled={locked} onChange={(event) => setConsent(event.target.checked)} />{chinese ? '我已核对所选产品和邮件内容，同意将这些内容及联系方式发送给 Cooyue 工作人员跟进。' : 'I reviewed the products and message and agree to email this information and my contact details to Cooyue for follow-up.'}</label>
          <button type="submit" className={styles.actionButton} disabled={locked || !consent}>{busy === 'confirm' ? chinese ? '正在发送…' : 'Sending…' : chinese ? '确认并发送询盘邮件' : 'Confirm and send inquiry email'}</button>
        </form>
      </div>}
    </>}
  </div>
}
