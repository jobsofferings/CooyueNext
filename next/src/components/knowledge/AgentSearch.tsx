'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Locale } from '@/i18n-config'
import { agentRequest, type AgentContext, type AgentSession, type AgentTurn } from '@/lib/agent-api'
import AgentConversation from './AgentConversation'
import AgentHistory from './AgentHistory'
import styles from './agent.module.css'

export default function AgentSearch({ locale, initialQuery = '' }: { locale: Locale; initialQuery?: string }) {
  const chinese = locale === 'zh'
  const [sessionId, setSessionId] = useState('')
  const [contextId, setContextId] = useState('')
  const [contexts, setContexts] = useState<AgentContext[]>([])
  const [panes, setPanes] = useState<Record<string, { history: AgentTurn[]; query?: string; visited?: boolean }>>({})
  const [activity, setActivity] = useState<Record<string, boolean>>({})
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const active = useRef('')
  const running = useRef<Record<string, boolean>>({})
  const revision = useRef(-1)
  const lifecycle = useRef<AbortController | null>(null)
  const pendingActivation = useRef('')
  const activation = useRef<Promise<void> | null>(null)
  const creatingRef = useRef(false)
  const selection = useRef(0)
  const query = useRef(initialQuery)
  query.current = initialQuery

  useEffect(() => {
    const id = active.current
    if (id) setPanes((previous) => previous[id] ? { ...previous, [id]: { ...previous[id], query: initialQuery } } : previous)
  }, [initialQuery])

  const onActivity = useCallback((id: string, busy: boolean) => {
    running.current = { ...running.current, [id]: busy }
    setActivity((previous) => previous[id] === busy ? previous : { ...previous, [id]: busy })
  }, [])

  const onContexts = useCallback((next: AgentContext[], nextRevision?: number) => {
    if (nextRevision !== undefined && nextRevision < revision.current) return
    if (nextRevision !== undefined) revision.current = nextRevision
    setContexts((previous) => {
      const retained = previous.filter((context) => !next.some((item) => item.id === context.id) && (context.id === active.current || running.current[context.id]))
      return [...next.map((context) => {
        const local = previous.find((item) => item.id === context.id)
        return running.current[context.id] && !context.turnCount && local
          ? { ...context, title: local.title, turnCount: local.turnCount } : context
      }), ...retained]
    })
    setPanes((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) =>
      next.some((context) => context.id === id) || id === active.current || running.current[id])))
  }, [])

  const onStart = useCallback((id: string, message: string) => {
    setContexts((previous) => previous.map((context) => context.id === id && !context.turnCount
      ? { ...context, title: Array.from(message).slice(0, 30).join(''), turnCount: 1 } : context))
  }, [])

  useEffect(() => {
    const abort = new AbortController()
    lifecycle.current = abort
    const timeout = window.setTimeout(() => abort.abort(), 15000)
    active.current = ''; running.current = {}; revision.current = -1; pendingActivation.current = ''; activation.current = null; creatingRef.current = false
    setSessionId(''); setContextId(''); setContexts([]); setPanes({}); setActivity({}); setError(''); setCreating(false)
    agentRequest<{ id: string }>('sessions', { locale }, abort.signal).then(async (session) => {
      const previous = await agentRequest<AgentSession>(`sessions/${session.id}`, undefined, abort.signal)
      if (abort.signal.aborted) return
      active.current = previous.contextId; revision.current = previous.revision ?? -1
      setSessionId(session.id); setContextId(previous.contextId); setContexts(previous.contexts)
      setPanes(Object.fromEntries(previous.contexts.map((context) => [context.id, {
        history: previous.history.filter((turn) => (turn.contextId || previous.contextId) === context.id),
        query: context.id === previous.contextId ? query.current : '',
        visited: context.id === previous.contextId,
      }])))
    }).catch(() => {
      if (lifecycle.current === abort) setError(chinese ? '暂时无法连接助手，请稍后重试。' : 'Unable to connect. Please retry shortly.')
    }).finally(() => window.clearTimeout(timeout))
    return () => { window.clearTimeout(timeout); abort.abort(); if (lifecycle.current === abort) lifecycle.current = null }
  }, [locale, chinese, retry])

  const cached = Boolean(panes[contextId])
  useEffect(() => {
    if (!sessionId || !contextId || cached || !lifecycle.current) return
    const abort = new AbortController()
    const signal = AbortSignal.any([abort.signal, lifecycle.current.signal, AbortSignal.timeout(15000)])
    agentRequest<AgentSession>(`sessions/${sessionId}`, undefined, signal).then((snapshot) => {
      if (signal.aborted) return
      onContexts(snapshot.contexts, snapshot.revision)
      setPanes((previous) => ({ ...Object.fromEntries(snapshot.contexts.map((context) => [context.id,
        { history: snapshot.history.filter((turn) => turn.contextId === context.id), visited: context.id === active.current }])), ...previous }))
    }).catch(() => {
      if (!abort.signal.aborted) setError(chinese ? '暂时无法加载该对话，您仍可切换其他对话。' : 'Unable to load this conversation. You can still switch to another one.')
    })
    return () => abort.abort()
  }, [sessionId, contextId, cached, chinese, onContexts])

  function remember(target: string) {
    pendingActivation.current = target
    if (activation.current) return
    const lifetime = lifecycle.current
    const task = async () => {
      while (pendingActivation.current && lifetime && !lifetime.signal.aborted) {
        const next = pendingActivation.current
        pendingActivation.current = ''
        try {
          await agentRequest(`sessions/${sessionId}/contexts/${next}/activate`, { contextId: next }, AbortSignal.any([lifetime.signal, AbortSignal.timeout(8000)]))
        } catch {
          if (!lifetime.signal.aborted && active.current === next) setError(chinese ? '对话已切换，但暂未保存当前位置；您可以继续使用。' : 'Conversation switched, but the position could not be saved. You can continue chatting.')
        }
      }
    }
    const promise = task().finally(() => { if (activation.current === promise) activation.current = null })
    activation.current = promise
  }

  function switchContext(target: string) {
    if (!sessionId || target === active.current) return
    selection.current += 1
    const leaving = active.current
    active.current = target; setContextId(target); setError('')
    setPanes((previous) => Object.fromEntries(Object.entries(previous).map(([id, pane]) => [id, id === leaving || id === target ? { ...pane, visited: true } : pane])))
    remember(target)
  }

  async function newContext() {
    if (!sessionId || creatingRef.current || !lifecycle.current) return
    creatingRef.current = true; setCreating(true); setError('')
    const leaving = active.current
    setPanes((previous) => previous[leaving] ? { ...previous, [leaving]: { ...previous[leaving], visited: true } } : previous)
    const lifetime = lifecycle.current
    const selected = ++selection.current
    try {
      const next = await agentRequest<AgentSession>(`sessions/${sessionId}/contexts`, { contextId: active.current }, AbortSignal.any([lifetime.signal, AbortSignal.timeout(10000)]))
      if (lifetime.signal.aborted) return
      if (selection.current === selected) { active.current = next.contextId; setContextId(next.contextId) }
      onContexts(next.contexts, next.revision)
      setPanes((previous) => ({ ...previous, [next.contextId]: { history: [], visited: active.current === next.contextId } }))
      remember(active.current)
    } catch {
      if (!lifetime.signal.aborted) setError(chinese ? '暂时无法新建对话，现有对话仍可使用。' : 'Unable to create a conversation. Existing conversations remain available.')
    } finally {
      if (lifecycle.current === lifetime) { creatingRef.current = false; setCreating(false) }
    }
  }

  return <section className={styles.panel} data-agent-search aria-label={chinese ? '选型助手' : 'Product selection assistant'}>
    {error && <div className={styles.connectionError} role="alert">{error}{!sessionId && <button type="button" onClick={() => setRetry((value) => value + 1)}>{chinese ? '重新连接' : 'Reconnect'}</button>}</div>}
    <div className={styles.workspace}>
      <AgentHistory locale={locale} contexts={contexts} activity={activity} activeId={contextId} disabled={!sessionId} onSelect={switchContext}
        creating={creating} newContextDisabled={!sessionId || creating || !contexts.find((context) => context.id === contextId)?.turnCount} onNewContext={() => void newContext()} />
      <div className={styles.conversations}>
        {(!sessionId || !cached) && <p className={styles.connecting} role="status">{chinese ? '正在连接助手…' : 'Connecting…'}</p>}
        {Object.entries(panes).filter(([id, pane]) => id === contextId || pane.visited).map(([id, pane]) => <div key={`${sessionId}-${id}`} hidden={id !== contextId} data-agent-context={id} data-agent-active={id === contextId}>
          <AgentConversation locale={locale} sessionId={sessionId} contextId={id} history={pane.history} initialQuery={pane.query}
            visible={id === contextId} onContexts={onContexts} onActivity={onActivity} onStart={onStart} />
        </div>)}
      </div>
    </div>
  </section>
}
