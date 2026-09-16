'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n-config'
import { agentRequest, type AgentResult, type AgentTurn } from '@/lib/agent-api'
import { consumeAgentStream } from '@/lib/agent-stream'
import styles from './agent.module.css'

export default function AgentSearch({ locale, onResults, onBusyChange, disabled }: { locale: Locale; onResults: (result: AgentResult) => void; onBusyChange: (busy: boolean) => void; disabled: boolean }) {
  const chinese = locale === 'zh'
  const [sessionId, setSessionId] = useState('')
  const [history, setHistory] = useState<AgentTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [streamed, setStreamed] = useState('')
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const callback = useRef(onResults)
  callback.current = onResults

  useEffect(() => {
    mounted.current = true
    const abort = new AbortController()
    setSessionId(''); setHistory([]); setError('')
    agentRequest<{ id: string }>('sessions', { locale }, abort.signal)
      .then(async (session) => {
        const previous = await agentRequest<{ history: AgentTurn[] }>(`sessions/${session.id}`, undefined, abort.signal)
        if (!abort.signal.aborted) { setSessionId(session.id); setHistory(previous.history) }
      })
      .catch(() => { if (!abort.signal.aborted) setError(chinese ? '智能搜索尚未启用或暂不可用，请使用下方普通搜索。' : 'AI search is not enabled or is unavailable. Use regular search below.') })
    return () => { mounted.current = false; abort.abort(); controller.current?.abort() }
  }, [locale, chinese])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || disabled || !input.trim() || !sessionId) return
    const message = input.trim()
    onBusyChange(true)
    const abort = new AbortController()
    controller.current = abort
    const timeout = window.setTimeout(() => abort.abort(), 70000)
    setBusy(true); setError(''); setStreamed(''); setPhase('understanding')
    let result: AgentResult | null = null
    try {
      const response = await fetch(`/api/agent/sessions/${sessionId}/messages`, {
        method: 'POST', credentials: 'same-origin', signal: abort.signal,
        headers: { 'Content-Type': 'application/json', 'x-cooyue-agent': '1' },
        body: JSON.stringify({ message, requestId: crypto.randomUUID() }),
      })
      await consumeAgentStream(response, (name, payload) => {
        const data = payload as Record<string, unknown>
        if (name === 'message_delta' && typeof data.delta === 'string') setStreamed((previous) => previous + data.delta)
        if (name === 'status' && typeof data.phase === 'string') setPhase(data.phase)
        if (name === 'results') result = payload as AgentResult
      })
      if (!result) throw new Error('INCOMPLETE_STREAM')
      const completed: AgentResult = result
      if (mounted.current) {
        setHistory((previous) => [...previous, { user: message, result: completed, createdAt: new Date().toISOString() }].slice(-10))
        callback.current(completed); setInput(''); setStreamed('')
      }
    } catch {
      if (mounted.current) setError(chinese ? '本轮未完成（可能是超时、限流或服务异常）。请稍后重试；未执行任何询盘或业务修改。' : 'This turn did not complete. Retry later; no inquiry or business update was performed.')
    } finally { window.clearTimeout(timeout); if (mounted.current) { setBusy(false); setPhase(''); onBusyChange(false) } }
  }

  const latest = history.at(-1)?.result
  const labels: Record<string, string> = chinese ? { understanding: '理解需求中…', searching: '检索公开内容中…', explaining: '整理匹配说明中…' }
    : { understanding: 'Understanding…', searching: 'Searching public content…', explaining: 'Explaining matches…' }
  return <section className={styles.panel} aria-labelledby="agent-search-title">
    <h2 id="agent-search-title">{chinese ? '智能搜索 · 产品与新闻' : 'AI search · Products & news'}</h2>
    <p className={styles.note}>{chinese ? '同浏览器保留最近 10 轮、最长 30 天，不提供清空或跨设备同步。请勿输入姓名、邮箱、电话或密钥。AI 说明仅辅助检索，参数与适用性以审核资料及工程师确认为准。' : 'The latest 10 turns are retained in this browser for up to 30 days, without a clear-history option or cross-device sync. Do not enter personal data or credentials. AI explanations assist search; verify specifications and suitability.'}</p>
    {history.length > 0 && <details className={styles.history}><summary>{chinese ? `对话历史（${history.length}/10）` : `History (${history.length}/10)`}</summary>{history.map((turn, index) => <article key={`${turn.createdAt}-${index}`}><strong>{turn.user}</strong><p>{turn.result.message}</p></article>)}</details>}
    <form onSubmit={submit} className={styles.form}>
      <label htmlFor="agent-message">{chinese ? '描述需求，或继续补充条件' : 'Describe your needs or refine this search'}</label>
      <textarea id="agent-message" value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} rows={3} required disabled={disabled || busy || !sessionId}
        placeholder={chinese ? '我要找用于甲烷巡检的手持设备，帮我对比候选' : 'Find handheld devices for methane inspections; show candidates to compare.'} />
      <button type="submit" disabled={disabled || busy || !input.trim() || !sessionId}>{busy ? labels[phase] || '…' : chinese ? '智能搜索' : 'Search with AI'}</button>
    </form>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {(streamed || latest) && <div className={styles.explanation} aria-live="polite" aria-busy={busy}>
      <p>{streamed || latest?.message}</p>
      {!busy && latest && <span className={styles.note}>{latest.retrieval.mode === 'hybrid' ? 'Embedding + Keyword' : chinese ? '关键词检索' : 'Keyword search'}{latest.retrieval.degraded ? chinese ? ' · 降级模式' : ' · degraded' : ''}</span>}
    </div>}
    {!busy && latest && <>
      {latest.products.length > 0 && <button type="button" className={styles.restore} disabled={disabled} onClick={() => callback.current(latest)}>{chinese ? '在下方展示本轮产品，手动对比 / 询盘' : 'Show this turn’s products below for manual comparison / inquiry'}</button>}
      {latest.news.length > 0 && <div className={styles.news}>{latest.news.map((item) => <article key={item.id}><h3><Link href={item.detailPath}>{item.title}</Link></h3><p>{item.description}</p></article>)}</div>}
    </>}
  </section>
}
