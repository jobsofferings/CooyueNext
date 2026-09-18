'use client'

import { useEffect, useState } from 'react'
import type { Locale } from '@/i18n-config'
import type { AgentContext } from '@/lib/agent-api'
import styles from './agent.module.css'

export default function AgentHistory({ locale, contexts, activeId, disabled, onSelect }: {
  locale: Locale; contexts: AgentContext[]; activeId: string; disabled: boolean; onSelect: (id: string) => void
}) {
  const chinese = locale === 'zh'
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(false) }, [activeId])
  return <aside className={styles.history} aria-label={chinese ? '历史会话' : 'Conversation history'}>
    <h2>{chinese ? '历史会话' : 'Conversations'}</h2>
    <button type="button" className={styles.historyToggle} aria-expanded={open} aria-controls="agent-history-list" onClick={() => setOpen(!open)}>
      {chinese ? '历史会话' : 'Conversations'} <span>{contexts.filter((context) => context.turnCount).length} · {open ? '−' : '＋'}</span>
    </button>
    <nav id="agent-history-list" className={`${styles.historyList} ${open ? styles.historyListOpen : ''}`} aria-label={chinese ? '切换会话' : 'Switch conversation'}>
      {contexts.map((context) => <button key={context.id} type="button" className={styles.historyItem} data-history-context={context.id}
        aria-current={context.id === activeId ? 'true' : undefined} aria-label={context.title} title={context.title}
        disabled={disabled || context.id === activeId} onClick={() => onSelect(context.id)}>
        <span>{context.title}</span><small>{context.turnCount ? chinese ? `${context.turnCount} 轮对话` : `${context.turnCount} turns` : chinese ? '尚未发送消息' : 'No messages yet'}</small>
      </button>)}
      <p>{chinese ? '同一浏览器保留最近 10 轮，最长 30 天。切换会话后可继续提问。' : 'Keeps the last 10 turns across conversations for up to 30 days in this browser. Switch to continue a conversation.'}</p>
    </nav>
  </aside>
}
