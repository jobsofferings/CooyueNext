'use client'

import { createContext, useContext, useEffect, useRef, useState, type FormEvent } from 'react'
import { CopilotChatView, type CopilotChatInput, type CopilotChatMessageView } from '@copilotkit/react-core/v2'
import Link from 'next/link'
import type { Locale } from '@/i18n-config'
import { agentRequest, type AgentResult, type AgentTurn } from '@/lib/agent-api'
import { consumeAgentStream, createAgentRequestId } from '@/lib/agent-stream'
import { chatHistory, createTextReveal, type ChatEntry } from '@/lib/agent-presentation'
import type { KnowledgeProduct } from '@/lib/knowledge-api'
import ProductCards from './ProductCards'
import '@copilotkit/react-core/v2/styles.css'
import styles from './agent.module.css'

interface ChatState {
  locale: Locale; entries: ChatEntry[]; busy: boolean; activeId: string; phase: string; elapsed: number
  input: string; ready: boolean; error: string; disabled: boolean; selected: KnowledgeProduct[]
  onInput: (value: string) => void; onSubmit: (event: FormEvent) => void; onRetry: () => void; onToggle: (product: KnowledgeProduct) => void
}

const ChatContext = createContext<ChatState | null>(null)

function ChatMessages() {
  const state = useContext(ChatContext)!
  const chinese = state.locale === 'zh'
  const phase = ['connecting', 'accepted', 'understanding'].includes(state.phase)
    ? chinese ? '正在理解您的需求' : 'Understanding your needs'
    : state.phase === 'explaining' ? chinese ? '正在整理候选说明' : 'Preparing candidate details'
      : chinese ? '正在查找相关内容' : 'Finding relevant content'
  return <div className={styles.messages} role="log" aria-label={chinese ? '选型助手对话' : 'Product assistant conversation'} aria-live="polite" aria-relevant="additions text">
    <article className={styles.assistant} data-role="assistant">
      <span className={styles.avatar} aria-hidden="true">C</span>
      <div className={styles.bubble}><strong>Cooyue {chinese ? '选型助手' : 'Assistant'}</strong><p>{chinese ? '您好！告诉我使用场景、目标气体或产品型号，我会帮您找到相关产品和资料。' : 'Hello! Tell me the application, target gas or model. I’ll help you find relevant products and information.'}</p></div>
    </article>
    {state.entries.map((entry) => {
      const active = state.busy && entry.id === state.activeId
      return <article key={entry.id} className={entry.role === 'user' ? styles.user : styles.assistant} data-role={entry.role} data-message-id={entry.id}>
        {entry.role === 'assistant' && <span className={styles.avatar} aria-hidden="true">C</span>}
        <div className={styles.bubble}>
          <span className={styles.speaker}>{entry.role === 'user' ? chinese ? '您' : 'You' : chinese ? '选型助手' : 'Assistant'}</span>
          {entry.content && <p className={styles.messageText} data-stream-text>{entry.content}{active && <span className={styles.cursor} aria-hidden="true">▍</span>}</p>}
          {active && <div className={styles.progress} role="status"><span className={styles.pulse} aria-hidden="true" />{phase}<span>{state.elapsed}s</span></div>}
          {entry.result && <div className={styles.results}>
            {entry.result.products.length > 0 && <><h3>{chinese ? '候选产品' : 'Candidate products'} · {entry.result.products.length}</h3><ProductCards products={entry.result.products} locale={state.locale} selected={state.selected} disabled={state.disabled || state.busy} onToggle={state.onToggle} /></>}
            {entry.result.news.length > 0 && <div className={styles.news}>{entry.result.news.map((item) => <article key={item.id}><h3><Link href={item.detailPath}>{item.title}</Link></h3><p>{item.description}</p></article>)}</div>}
          </div>}
        </div>
      </article>
    })}
  </div>
}

function ChatInput() {
  const state = useContext(ChatContext)!
  const chinese = state.locale === 'zh'
  const disabled = !state.ready || state.disabled || state.busy
  return <div className={styles.composer}>
    {state.error && <div className={styles.error} role="alert">{state.error}{!state.ready && <button type="button" onClick={state.onRetry}>{chinese ? '重新连接' : 'Reconnect'}</button>}</div>}
    <form onSubmit={state.onSubmit}>
      <label htmlFor="agent-message" className={styles.inputLabel}>{chinese ? '描述需求，或继续补充条件' : 'Describe your needs or add a detail'}</label>
      <div className={styles.inputRow}>
        <textarea id="agent-message" rows={2} maxLength={1000} required disabled={disabled} value={state.input} onChange={(event) => state.onInput(event.target.value)}
          placeholder={chinese ? '例如：我要找用于甲烷巡检的手持设备' : 'For example: handheld devices for methane inspections'}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!disabled && state.input.trim()) event.currentTarget.form?.requestSubmit() } }} />
        <button type="submit" disabled={disabled || !state.input.trim()} aria-label={chinese ? '发送消息' : 'Send message'}>{state.busy ? '···' : chinese ? '发送 ↑' : 'Send ↑'}</button>
      </div>
    </form>
    <p className={styles.note}>{chinese ? '同一浏览器保留最近 10 轮、最长 30 天。请勿输入个人信息或密钥。' : 'Keeps the last 10 turns for up to 30 days in this browser. Avoid personal information or credentials.'}</p>
  </div>
}

export default function AgentSearch({ locale, onResults, onBusyChange, disabled, selected, onToggle }: {
  locale: Locale; onResults: (result: AgentResult) => void; onBusyChange: (busy: boolean) => void; disabled: boolean
  selected: KnowledgeProduct[]; onToggle: (product: KnowledgeProduct) => void
}) {
  const chinese = locale === 'zh'
  const [sessionId, setSessionId] = useState('')
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [activeId, setActiveId] = useState('')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const callbacks = useRef({ onResults, onBusyChange })
  callbacks.current = { onResults, onBusyChange }

  useEffect(() => {
    mounted.current = true
    let disposed = false
    const abort = new AbortController()
    const timeout = window.setTimeout(() => abort.abort(), 15000)
    setSessionId(''); setEntries([]); setError('')
    agentRequest<{ id: string }>('sessions', { locale }, abort.signal).then(async (session) => {
      const previous = await agentRequest<{ history: AgentTurn[] }>(`sessions/${session.id}`, undefined, abort.signal)
      if (abort.signal.aborted) return
      setSessionId(session.id); setEntries(chatHistory(previous.history))
      const latest = previous.history.at(-1)?.result
      if (latest) callbacks.current.onResults(latest)
    }).catch(() => {
      if (!disposed) setError(chinese ? '暂时无法连接助手，请稍后重试。普通搜索仍可使用。' : 'Unable to connect. Please retry, or use keyword search below.')
    }).finally(() => window.clearTimeout(timeout))
    return () => { disposed = true; mounted.current = false; window.clearTimeout(timeout); abort.abort(); controller.current?.abort() }
  }, [locale, chinese, retry])

  useEffect(() => {
    if (!busy) return
    const started = Date.now()
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [busy])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || disabled || controller.current || !input.trim() || !sessionId) return
    const message = input.trim()
    const requestId = createAgentRequestId()
    const assistantId = `${requestId}-assistant`
    const abort = new AbortController()
    controller.current = abort
    const timeout = window.setTimeout(() => abort.abort(), 80000)
    const updateEntry = (patch: Partial<ChatEntry>) => { if (mounted.current) setEntries((previous) => previous.map((entry) => entry.id === assistantId ? { ...entry, ...patch } : entry)) }
    const reveal = createTextReveal((content) => updateEntry({ content }), { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    abort.signal.addEventListener('abort', reveal.cancel, { once: true })
    setEntries((previous) => [...previous.slice(-18), { id: `${requestId}-user`, role: 'user', content: message }, { id: assistantId, role: 'assistant', content: '' }])
    setInput(''); setBusy(true); setPhase('connecting'); setActiveId(assistantId); setElapsed(0); setError('')
    callbacks.current.onBusyChange(true)
    let result: AgentResult | undefined
    try {
      const response = await fetch(`/api/agent/sessions/${sessionId}/messages`, {
        method: 'POST', credentials: 'same-origin', signal: abort.signal,
        headers: { 'Content-Type': 'application/json', 'x-cooyue-agent': '1' }, body: JSON.stringify({ message, requestId }),
      })
      await consumeAgentStream(response, (name, payload) => {
        if (abort.signal.aborted || !mounted.current) return
        const data = payload as Record<string, unknown>
        if (name === 'message_delta' && typeof data.delta === 'string') reveal.push(data.delta)
        if (name === 'status' && typeof data.phase === 'string') setPhase(data.phase)
        if (name === 'results') {
          result = payload as AgentResult
          updateEntry({ result })
          callbacks.current.onResults(result)
        }
      })
      window.clearTimeout(timeout)
      await reveal.finish(result?.message)
    } catch (failure) {
      reveal.cancel()
      if (mounted.current) {
        setError(chinese ? '这次搜索未完成，请稍后重试。您也可以使用下方普通搜索。' : 'This search could not finish. Please retry or use keyword search below.')
        setInput(message)
        const detail = failure as { code?: string; phase?: string; runId?: string }
        console.warn('[agent:chat]', { requestId, code: detail.code || 'NETWORK_ERROR', phase: detail.phase, runId: detail.runId })
      }
    } finally {
      window.clearTimeout(timeout); reveal.cancel(); controller.current = null
      abort.signal.removeEventListener('abort', reveal.cancel)
      if (mounted.current) { setBusy(false); callbacks.current.onBusyChange(false) }
    }
  }

  const state: ChatState = { locale, entries, busy, activeId, phase, elapsed, input, ready: Boolean(sessionId), error, disabled, selected,
    onInput: setInput, onSubmit: submit, onRetry: () => setRetry((value) => value + 1), onToggle }
  return <section className={styles.panel} aria-labelledby="agent-search-title">
    <header className={styles.heading}><div><span className={styles.eyebrow}>COOYUE ASSISTANT</span><h2 id="agent-search-title">{chinese ? '聊聊您的选型需求' : 'Let’s find the right candidates'}</h2></div><span className={styles.readOnly}>{chinese ? '产品 · 资料' : 'Products · Guides'}</span></header>
    <ChatContext.Provider value={state}>
      <CopilotChatView className={styles.chat} messages={entries} isRunning={busy} autoScroll="pin-to-bottom" welcomeScreen={false}
        messageView={ChatMessages as unknown as typeof CopilotChatMessageView} input={ChatInput as unknown as typeof CopilotChatInput} />
    </ChatContext.Provider>
  </section>
}
