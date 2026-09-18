'use client'

import { createContext, useContext, useEffect, useRef, useState, type FormEvent } from 'react'
import { CopilotChatView, type CopilotChatInput, type CopilotChatMessageView } from '@copilotkit/react-core/v2'
import type { Locale } from '@/i18n-config'
import { type AgentContext, type AgentResult, type AgentTurn } from '@/lib/agent-api'
import { consumeAgentStream, createAgentRequestId } from '@/lib/agent-stream'
import { appendChatTurn, chatHistory, createTextReveal, type ChatEntry } from '@/lib/agent-presentation'
import { scrollChatTarget } from '@/lib/agent-scroll'
import AgentReply from './AgentReply'
import '@copilotkit/react-core/v2/styles.css'
import styles from './agent.module.css'

interface ChatState {
  contextId: string; visible: boolean
  locale: Locale; entries: ChatEntry[]; busy: boolean; activeId: string; phase: string; elapsed: number
  input: string; ready: boolean; error: string; disabled: boolean
  onInput: (value: string) => void; onSubmit: (event: FormEvent) => void; onRetry: () => void; onActionBusy: (busy: boolean) => void
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
      if (entry.role === 'assistant') return <AgentReply key={entry.id} entry={entry} locale={state.locale} active={active} phase={phase} elapsed={state.elapsed} disabled={state.disabled || state.busy} onBusyChange={state.onActionBusy} />
      return <article key={entry.id} className={styles.user} data-role="user" data-message-id={entry.id}>
        <div className={styles.bubble}>
          <span className={styles.speaker}>{chinese ? '您' : 'You'}</span>
          <p className={styles.messageText}>{entry.content}</p>
        </div>
      </article>
    })}
  </div>
}

function ChatInput() {
  const state = useContext(ChatContext)!
  const chinese = state.locale === 'zh'
  const disabled = !state.ready || state.disabled || state.busy
  const inputId = state.visible ? 'agent-message' : `agent-message-${state.contextId}`
  return <div className={styles.composer}>
    {state.error && <div className={styles.error} role="alert">{state.error}{!state.ready && <button type="button" onClick={state.onRetry}>{chinese ? '重新连接' : 'Reconnect'}</button>}</div>}
    <form onSubmit={state.onSubmit}>
      <label htmlFor={inputId} className={styles.inputLabel}>{chinese ? '描述需求，或继续补充条件' : 'Describe your needs or add a detail'}</label>
      <div className={styles.inputRow}>
        <textarea id={inputId} rows={2} maxLength={1000} required disabled={disabled} value={state.input} onChange={(event) => state.onInput(event.target.value)}
          placeholder={chinese ? '例如：我要找用于甲烷巡检的手持设备' : 'For example: handheld devices for methane inspections'}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!disabled && state.input.trim()) event.currentTarget.form?.requestSubmit() } }} />
        <button type="submit" disabled={disabled || !state.input.trim()} aria-label={chinese ? '发送消息' : 'Send message'}>{state.busy ? '···' : chinese ? '发送 ↑' : 'Send ↑'}</button>
      </div>
    </form>
    <p className={styles.note}>{chinese ? '同一浏览器保留最近 10 轮、最长 30 天。请勿输入个人信息或密钥。' : 'Keeps the last 10 turns for up to 30 days in this browser. Avoid personal information or credentials.'}</p>
  </div>
}

export default function AgentConversation({ locale, sessionId, contextId, history, initialQuery = '', visible, onContexts, onActivity, onStart }: {
  locale: Locale; sessionId: string; contextId: string; history: AgentTurn[]; initialQuery?: string; visible: boolean
  onContexts: (contexts: AgentContext[], revision?: number) => void
  onActivity: (contextId: string, busy: boolean) => void
  onStart: (contextId: string, message: string) => void
}) {
  const chinese = locale === 'zh'
  const [entries, setEntries] = useState<ChatEntry[]>(() => chatHistory(history, contextId))
  const [input, setInput] = useState(initialQuery)
  const [actionBusy, setActionBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [activeId, setActiveId] = useState('')
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)

  useEffect(() => { setInput(initialQuery.slice(0, 1000)) }, [initialQuery])
  useEffect(() => {
    if (!visible) return
    const externalSearch = (event: Event) => setInput(((event as CustomEvent<{ keywords?: string }>).detail?.keywords || '').slice(0, 1000))
    const historySearch = () => {
      const parameters = new URL(window.location.href).searchParams
      setInput((parameters.get('keywords') || parameters.get('query') || '').slice(0, 1000))
    }
    window.addEventListener('cooyue:search-keywords', externalSearch)
    window.addEventListener('popstate', historySearch)
    return () => { window.removeEventListener('cooyue:search-keywords', externalSearch); window.removeEventListener('popstate', historySearch) }
  }, [visible])

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; controller.current?.abort() }
  }, [])

  useEffect(() => { onActivity(contextId, busy || actionBusy) }, [contextId, busy, actionBusy, onActivity])

  useEffect(() => {
    if (!activeId || !visible) return
    return scrollChatTarget(document.querySelector<HTMLElement>(`[data-message-id="${activeId}"]`), { focus: false, bottom: true })
  }, [activeId, visible])

  useEffect(() => {
    if (!busy) return
    const started = Date.now()
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [busy])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || actionBusy || controller.current || !input.trim() || !sessionId || !contextId) return
    const message = input.trim()
    const requestId = createAgentRequestId()
    const assistantId = `${requestId}-assistant`
    const abort = new AbortController()
    controller.current = abort
    const timeout = window.setTimeout(() => abort.abort(), 80000)
    const updateEntry = (patch: Partial<ChatEntry>) => { if (mounted.current) setEntries((previous) => previous.map((entry) => entry.id === assistantId ? { ...entry, ...patch } : entry)) }
    const reveal = createTextReveal((content) => updateEntry({ content }), { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    abort.signal.addEventListener('abort', reveal.cancel, { once: true })
    setEntries((previous) => appendChatTurn(previous, { id: `${requestId}-user`, role: 'user', content: message, contextId }, { id: assistantId, role: 'assistant', content: '', contextId }))
    setInput(''); setBusy(true); setPhase('connecting'); setActiveId(assistantId); setElapsed(0); setError('')
    onStart(contextId, message)
    let result: AgentResult | undefined
    try {
      const response = await fetch(`/api/agent/sessions/${sessionId}/messages`, {
        method: 'POST', credentials: 'same-origin', signal: abort.signal,
        headers: { 'Content-Type': 'application/json', 'x-cooyue-agent': '1' }, body: JSON.stringify({ message, requestId, contextId }),
      })
      await consumeAgentStream(response, (name, payload) => {
        if (abort.signal.aborted || !mounted.current) return
        const data = payload as Record<string, unknown>
        if (name === 'message_delta' && typeof data.delta === 'string') reveal.push(data.delta)
        if (name === 'status' && typeof data.phase === 'string') setPhase(data.phase)
        if (name === 'context' && Array.isArray(data.contexts)) onContexts(data.contexts as AgentContext[], data.revision as number | undefined)
        if (name === 'results') {
          result = payload as AgentResult
          updateEntry({ result })
        }
      })
      window.clearTimeout(timeout)
      await reveal.finish(result?.message)
    } catch (failure) {
      reveal.cancel()
      if (mounted.current) {
        const detail = failure as { code?: string; phase?: string; runId?: string }
        setError(detail.code === 'VISITOR_CONCURRENT_LIMIT' || detail.code === 'AGENT_BUSY'
          ? chinese ? '已有任务正在处理，请稍后重试；您仍可切换对话。' : 'Other tasks are running. Retry shortly; you can still switch conversations.'
          : chinese ? '这次搜索未完成，请稍后重试。' : 'This search could not finish. Please retry shortly.')
        setInput(message)
        console.warn('[agent:chat]', { requestId, code: detail.code || 'NETWORK_ERROR', phase: detail.phase, runId: detail.runId })
      }
    } finally {
      window.clearTimeout(timeout); reveal.cancel(); controller.current = null
      abort.signal.removeEventListener('abort', reveal.cancel)
      if (mounted.current) setBusy(false)
    }
  }

  const state: ChatState = { locale, contextId, visible, entries, busy, activeId, phase, elapsed, input, ready: true, error, disabled: actionBusy,
    onInput: setInput, onSubmit: submit, onRetry: () => setError(''), onActionBusy: setActionBusy }
  return <ChatContext.Provider value={state}>
    <CopilotChatView className={styles.chat} messages={entries} isRunning={busy} autoScroll="pin-to-bottom" welcomeScreen={false}
      messageView={ChatMessages as unknown as typeof CopilotChatMessageView} input={ChatInput as unknown as typeof CopilotChatInput} />
  </ChatContext.Provider>
}
