'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import type { Locale } from '@/i18n-config'
import { agentRequest, type AgentResult, type AgentTurn } from '@/lib/agent-api'
import { consumeAgentStream, createAgentRequestId } from '@/lib/agent-stream'
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
  const [retry, setRetry] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [runId, setRunId] = useState('')
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const callback = useRef(onResults)
  callback.current = onResults

  const describeError = useCallback((failure: unknown) => {
    const details = failure as { code?: string; message?: string; requestId?: string; runId?: string; phase?: string }
    const code = details.code || details.message || 'NETWORK_ERROR'
    const labels: Record<string, string> = chinese
      ? { FORBIDDEN: '此访问地址未获允许', SESSION_NOT_FOUND: '会话已失效，请重试连接', AGENT_DISABLED: '智能搜索已关闭', AGENT_NOT_CONFIGURED: '模型或代理配置不完整', RUN_TIMEOUT: '本轮总执行超时', PHASE_TIMEOUT: '某个执行阶段超时', GATEWAY_TIMEOUT: '网站代理等待超时', AGENT_BUSY: '当前请求较多，请稍后重试', VISITOR_RATE_LIMIT: '请求过于频繁，请稍后重试', BACKEND_UNAVAILABLE: '网站暂时无法连接搜索服务' }
      : { FORBIDDEN: 'This site address is not allowed', SESSION_NOT_FOUND: 'Session expired; reconnect', RUN_TIMEOUT: 'Run timed out', PHASE_TIMEOUT: 'An execution stage timed out', AGENT_BUSY: 'Service busy; retry shortly' }
    const reference = details.runId || details.requestId
    return `${labels[code] || (chinese ? '本次请求未完成，请重试' : 'The request did not complete; retry')}（${code}）${details.phase ? ` · ${details.phase}` : ''}${reference ? ` · ID: ${reference}` : ''}`
  }, [chinese])

  useEffect(() => {
    mounted.current = true
    const abort = new AbortController()
    setSessionId(''); setHistory([]); setError('')
    const timeout = window.setTimeout(() => { setError(describeError({ code: 'GATEWAY_TIMEOUT', phase: 'session_init' })); abort.abort() }, 15000)
    agentRequest<{ id: string }>('sessions', { locale }, abort.signal)
      .then(async (session) => {
        const previous = await agentRequest<{ history: AgentTurn[] }>(`sessions/${session.id}`, undefined, abort.signal)
        if (!abort.signal.aborted) { setSessionId(session.id); setHistory(previous.history) }
      })
      .catch((failure) => { if (!abort.signal.aborted) setError(describeError(failure)) })
      .finally(() => window.clearTimeout(timeout))
    return () => { mounted.current = false; window.clearTimeout(timeout); abort.abort(); controller.current?.abort() }
  }, [locale, chinese, retry, describeError])

  useEffect(() => {
    if (!busy) return
    const started = Date.now()
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [busy])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || disabled || !input.trim() || !sessionId) return
    const message = input.trim()
    onBusyChange(true)
    const abort = new AbortController()
    controller.current = abort
    const timeout = window.setTimeout(() => abort.abort(), 80000)
    const requestId = createAgentRequestId()
    setBusy(true); setError(''); setStreamed(''); setPhase('connecting'); setRunId(''); setElapsed(0)
    let result: AgentResult | null = null
    try {
      const response = await fetch(`/api/agent/sessions/${sessionId}/messages`, {
        method: 'POST', credentials: 'same-origin', signal: abort.signal,
        headers: { 'Content-Type': 'application/json', 'x-cooyue-agent': '1' },
        body: JSON.stringify({ message, requestId }),
      })
      await consumeAgentStream(response, (name, payload) => {
        const data = payload as Record<string, unknown>
        if (name === 'meta' && typeof data.runId === 'string') setRunId(data.runId)
        if (name === 'message_delta' && typeof data.delta === 'string') flushSync(() => setStreamed((previous) => previous + data.delta))
        if (name === 'status' && typeof data.phase === 'string') setPhase(data.phase)
        if (name === 'results') result = payload as AgentResult
      })
      if (!result) throw new Error('INCOMPLETE_STREAM')
      const completed: AgentResult = result
      if (mounted.current) {
        setHistory((previous) => [...previous, { user: message, result: completed, createdAt: new Date().toISOString() }].slice(-10))
        callback.current(completed); setInput(''); setStreamed('')
      }
    } catch (failure) {
      if (mounted.current) setError(describeError(Object.assign(failure instanceof Error ? failure : new Error('NETWORK_ERROR'), { requestId })))
    } finally { window.clearTimeout(timeout); if (mounted.current) { setBusy(false); setPhase(''); onBusyChange(false) } }
  }

  const latest = history.at(-1)?.result
  const labels: Record<string, string> = chinese ? { connecting: '正在连接搜索服务…', accepted: '请求已接收…', understanding: '理解需求中…', searching: '检索公开内容中…', search_fallback: '模型较慢，切换只读检索…', explaining: '正在流式生成说明…', saving: '校验结果并保存记录…' }
    : { connecting: 'Connecting…', accepted: 'Request accepted…', understanding: 'Understanding…', searching: 'Searching public content…', search_fallback: 'Model is slow; using read-only search…', explaining: 'Streaming explanation…', saving: 'Validating and saving…' }
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
    {!sessionId && error && <button type="button" className={styles.restore} onClick={() => setRetry((value) => value + 1)}>{chinese ? '重试连接' : 'Reconnect'}</button>}
    {busy && <div className={styles.progress} role="status"><span className={styles.pulse} />{labels[phase] || phase} · {elapsed}s{runId && <small>Run ID: {runId}</small>}</div>}
    {(busy || streamed || latest) && <div className={styles.explanation} aria-live="polite" aria-busy={busy}>
      <p>{busy ? streamed || (chinese ? '已开始处理，将在这里实时显示说明。' : 'Processing your request. Live output will appear here.') : streamed || latest?.message}{busy && <span className={styles.cursor}>▍</span>}</p>
      {!busy && latest && <span className={styles.note}>{latest.retrieval.mode === 'hybrid' ? 'Embedding + Keyword' : chinese ? '关键词检索' : 'Keyword search'}{latest.retrieval.degraded ? chinese ? ' · 降级模式' : ' · degraded' : ''}</span>}
    </div>}
    {!busy && latest && <>
      {latest.products.length > 0 && <button type="button" className={styles.restore} disabled={disabled} onClick={() => callback.current(latest)}>{chinese ? '在下方展示本轮产品，手动对比 / 询盘' : 'Show this turn’s products below for manual comparison / inquiry'}</button>}
      {latest.news.length > 0 && <div className={styles.news}>{latest.news.map((item) => <article key={item.id}><h3><Link href={item.detailPath}>{item.title}</Link></h3><p>{item.description}</p></article>)}</div>}
    </>}
  </section>
}
