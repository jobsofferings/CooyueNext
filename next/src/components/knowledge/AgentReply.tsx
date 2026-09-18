'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n-config'
import type { ChatEntry } from '@/lib/agent-presentation'
import { knowledgeRequest, type KnowledgeProduct } from '@/lib/knowledge-api'
import ProductCards from './ProductCards'
import ProductComparison from './ProductComparison'
import ProductInquiry from './ProductInquiry'
import styles from './agent.module.css'

export default function AgentReply({ entry, locale, active, phase, elapsed, disabled, onBusyChange }: {
  entry: ChatEntry; locale: Locale; active: boolean; phase: string; elapsed: number; disabled: boolean; onBusyChange: (busy: boolean) => void
}) {
  const chinese = locale === 'zh'
  const [selected, setSelected] = useState<KnowledgeProduct[]>([])
  const [comparison, setComparison] = useState<KnowledgeProduct[] | null>(null)
  const [comparedSelection, setComparedSelection] = useState('')
  const [inquiry, setInquiry] = useState<KnowledgeProduct[] | null>(null)
  const [actions, setActions] = useState<Array<'compare' | 'inquiry'>>([])
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const notify = useRef(onBusyChange)
  notify.current = onBusyChange
  const signature = (products: KnowledgeProduct[]) => JSON.stringify(products.map((product) => [product.slug, product.version]).sort())
  const selection = signature(selected)
  const staleComparison = Boolean(comparison && comparedSelection !== selection)
  const staleInquiry = Boolean(inquiry && signature(inquiry) !== selection)
  const locked = disabled || comparing

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (controller.current) { controller.current.abort(); notify.current(false) } }
  }, [])

  function show(action: 'compare' | 'inquiry') { setActions((previous) => previous.includes(action) ? previous : [...previous, action]) }

  function toggle(product: KnowledgeProduct) {
    if (locked) return
    setSelected((previous) => previous.some((item) => item.slug === product.slug)
      ? previous.filter((item) => item.slug !== product.slug) : previous.length < 12 ? [...previous, product] : previous)
  }

  async function compare() {
    if (locked || controller.current || selected.length < 2) return
    const abort = new AbortController()
    controller.current = abort
    show('compare'); setComparing(true); setError(''); notify.current(true)
    try {
      const result = await knowledgeRequest<{ products: KnowledgeProduct[] }>('compare', { locale, productSlugs: selected.map((product) => product.slug) }, abort.signal)
      if (!abort.signal.aborted && mounted.current) { setComparison(result.products); setComparedSelection(selection) }
    } catch {
      if (mounted.current && !abort.signal.aborted) setError(chinese ? '暂时无法生成对比，请重试；若产品已下架，请重新搜索。' : 'Unable to compare. Please retry, or search again if products were unpublished.')
    } finally {
      controller.current = null
      if (mounted.current) { setComparing(false); notify.current(false) }
    }
  }

  return <article className={styles.assistant} data-role="assistant" data-message-id={entry.id}>
    <span className={styles.avatar} aria-hidden="true">C</span>
    <div className={styles.messageColumn}>
      <div className={styles.bubble}>
        <span className={styles.speaker}>{chinese ? '选型助手' : 'Assistant'}</span>
        {entry.content && <p className={styles.messageText} data-stream-text>{entry.content}{active && <span className={styles.cursor} aria-hidden="true">▍</span>}</p>}
        {active && <div className={styles.progress} role="status"><span className={styles.pulse} aria-hidden="true" />{phase}<span>{elapsed}s</span></div>}
        {entry.result && <div className={styles.results}>
          {entry.result.products.length > 0 && <><h3>{chinese ? '候选产品' : 'Candidate products'} · {entry.result.products.length}</h3><ProductCards products={entry.result.products} locale={locale} selected={selected} disabled={locked} onToggle={toggle} /></>}
          {entry.result.news.length > 0 && <div className={styles.news}>{entry.result.news.map((item) => <article key={item.id}><h3><Link href={item.detailPath}>{item.title}</Link></h3><p>{item.description}</p></article>)}</div>}
        </div>}
      </div>
      {Boolean(entry.result?.products.length) && <div className={styles.turnActions} data-message-actions role="group" aria-label={chinese ? '本轮产品操作' : 'Actions for this result'}>
        <button type="button" className={styles.floatingButton} disabled={locked || selected.length < 2} onClick={() => void compare()} aria-controls={`${entry.id}-compare`}>
          <span aria-hidden="true">⇄</span>{comparison ? chinese ? '更新对比' : 'Update comparison' : chinese ? '对比所选产品' : 'Compare selected products'}
        </button>
        <button type="button" className={styles.floatingButton} disabled={locked || !selected.length} onClick={() => { setInquiry([...selected]); show('inquiry') }} aria-controls={`${entry.id}-inquiry`}>
          <span aria-hidden="true">✉</span>{inquiry ? chinese ? '更新询盘' : 'Update inquiry' : chinese ? '询盘所选产品' : 'Inquire about selected products'}
        </button>
        <span className={styles.selectionCount}>{chinese ? '本轮已选' : 'Selected'} {selected.length}/12 · {chinese ? '至少 2 款可对比' : 'Select 2+ to compare'}</span>
      </div>}
      {actions.length > 0 && <div className={styles.followups} data-message-followups>{actions.map((action) => <section key={action} id={`${entry.id}-${action}`} className={styles.followup} data-chat-action={action} aria-labelledby={`${entry.id}-${action}-title`}>
        <div className={styles.followupHeading}><span aria-hidden="true">↳</span><h3 id={`${entry.id}-${action}-title`}>{action === 'compare' ? chinese ? '产品对比' : 'Product comparison' : chinese ? '产品询盘' : 'Product inquiry'}</h3></div>
        {action === 'compare' ? <>
          {comparing && <p role="status" className={styles.actionHint}>{chinese ? '正在读取公开参数…' : 'Loading public specifications…'}</p>}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {staleComparison && <p role="status" className={styles.stale}>{chinese ? '已选产品有变化。这里仍是上一次对比，请点击“更新对比”。' : 'Your selection changed. This is the previous comparison; click “Update comparison”.'}</p>}
          {comparison && <ProductComparison products={comparison} locale={locale} />}
        </> : inquiry && <>
          {staleInquiry && <p role="status" className={styles.stale}>{chinese ? '已选产品有变化，请点击“更新询盘”后重新预览。旧预览已失效。' : 'Your selection changed. Click “Update inquiry” and preview again. The previous preview is invalid.'}</p>}
          <ProductInquiry locale={locale} query={(entry.result?.query || '').slice(0, 500)} products={inquiry} disabled={locked} stale={staleInquiry} onBusyChange={onBusyChange} />
        </>}
      </section>)}</div>}
    </div>
  </article>
}
