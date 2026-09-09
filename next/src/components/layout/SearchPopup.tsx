'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useDictionary } from '@/hooks/useDictionary'
import { useNavigation } from './NavigationProvider'

type AgentMessage = {
  id: string
  role: 'agent' | 'user'
  content: string
}

type AgentStage = 'idle' | 'recognizing' | 'matching'

const agentCopy = {
  zh: {
    searchTitle: '产品搜索',
    searchPlaceholder: '搜索型号或关键词，例如 K10',
    close: '关闭搜索',
    title: 'Cooyue Agent',
    kicker: 'AI 产品助手',
    subtitle: '告诉我应用场景、型号或技术需求，我先帮你梳理产品方向。',
    welcome: '你好，我是 Cooyue Agent。你可以直接描述想找的产品，例如“我想找 K10 相关产品”。',
    placeholder: '问问 Cooyue Agent…',
    send: '发送问题',
    status: { idle: '在线', recognizing: '正在识别需求', matching: '正在匹配产品' },
    suggestions: ['我想找 K10 相关产品', '有没有适合气体成像的产品', '帮我比较 PV400 和 GF77'],
    catalog: '产品搜索与对比',
  },
  en: {
    searchTitle: 'Product search',
    searchPlaceholder: 'Search a model or keyword, e.g. K10',
    close: 'Close search',
    title: 'Cooyue Agent',
    kicker: 'AI PRODUCT GUIDE',
    subtitle: 'Describe your application, model, or technical need and I will map the product direction.',
    welcome: 'Hi, I am Cooyue Agent. Try a request such as “I want to find products related to K10.”',
    placeholder: 'Ask Cooyue Agent…',
    send: 'Send question',
    status: { idle: 'Online', recognizing: 'Understanding request', matching: 'Matching products' },
    suggestions: ['Find products related to K10', 'Products for gas imaging', 'Compare PV400 and GF77'],
    catalog: 'Search & compare products',
  },
} as const

function initialAgentMessage(locale: string): AgentMessage {
  const copy = locale === 'zh' ? agentCopy.zh : agentCopy.en
  return { id: 'agent-welcome', role: 'agent', content: copy.welcome }
}

function buildAgentReply(question: string, locale: string) {
  const chinese = locale === 'zh'
  if (/k10/i.test(question)) {
    return chinese
      ? '我会优先从产品型号、接口和应用描述中匹配 K10 相关内容，随后列出可选产品供你继续选择和对比。'
      : 'I will prioritize product models, interfaces, and application descriptions related to K10, then list products for you to select and compare.'
  }
  if (/气体|红外|gas|infrared|thermal/i.test(question)) {
    return chinese
      ? '我会根据目标气体、检测距离、设备形态和成像方式筛选候选，并展示已审核资料中的产品、来源和对比入口。'
      : 'I will filter candidates by target gas, detection distance, form factor, and imaging method, then show products from reviewed materials with sources and comparison actions.'
  }
  if (/比较|对比|compare/i.test(question)) {
    return chinese
      ? '可以。我会先识别需要比较的型号，再返回关键指标、适用场景和资料来源，同时保留产品勾选与对比功能。'
      : 'Sure. I will identify the models, return key metrics, use cases, and sources, while keeping the product selection and comparison flow.'
  }
  return chinese
    ? '我已收到你的需求。我会先识别意图，再匹配产品和审核资料，并将候选结果流式展示在这里。你也可以先从下方示例开始。'
    : 'I received your request. I will identify intent, match products and reviewed materials, and stream the candidates here. You can also start with one of the examples below.'
}

export default function SearchPopup() {
  const dict = useDictionary()
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const lang = typeof params.lang === 'string' ? params.lang : 'en'
  const [keywords, setKeywords] = useState('')
  const [agentQuestion, setAgentQuestion] = useState('')
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([initialAgentMessage(lang)])
  const [agentStreaming, setAgentStreaming] = useState(false)
  const [agentStage, setAgentStage] = useState<AgentStage>('idle')
  const { searchOpen: isOpen, setSearchOpen: setIsOpen, setMobileOpen } = useNavigation()
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const followMessagesRef = useRef(true)
  const agentTimersRef = useRef<number[]>([])
  const searchPath = `/${lang}/search`
  const copy = lang === 'zh' ? agentCopy.zh : agentCopy.en

  const closeSearchPopup = () => {
    setIsOpen(false)
  }

  useEffect(() => {
    setAgentMessages([initialAgentMessage(lang)])
    setAgentQuestion('')
    setAgentStreaming(false)
    setAgentStage('idle')
    agentTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer)
      window.clearInterval(timer)
    })
    agentTimersRef.current = []
  }, [lang])

  useEffect(() => () => {
    agentTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer)
      window.clearInterval(timer)
    })
  }, [])

  useEffect(() => {
    router.prefetch(searchPath)
  }, [router, searchPath])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null

      if (!target?.closest('.search-toggler')) {
        return
      }

      event.preventDefault()
      setIsOpen(true)
      setMobileOpen(false)
    }

    document.addEventListener('click', handleDocumentClick)

    return () => {
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [setIsOpen, setMobileOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusTimer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
      }

      if (event.key !== 'Tab') return

      const controls = contentRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')
      const firstControl = controls?.[0]
      const lastControl = controls?.[controls.length - 1]
      if (!firstControl || !lastControl) return

      if (!contentRef.current?.contains(document.activeElement)) {
        event.preventDefault()
        firstControl.focus()
      } else if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault()
        lastControl.focus()
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault()
        firstControl.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [isOpen, setIsOpen])

  useEffect(() => {
    const messages = messagesRef.current
    if (isOpen && messages && followMessagesRef.current) messages.scrollTop = messages.scrollHeight
  }, [agentMessages, isOpen])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const value = keywords.trim()
    if (!value) {
      return
    }

    closeSearchPopup()
    setKeywords('')

    const targetUrl = `${searchPath}?keywords=${encodeURIComponent(value)}`
    if (pathname === searchPath) {
      window.history.pushState({ keywords: value }, '', targetUrl)
      window.dispatchEvent(new CustomEvent('cooyue:search-keywords', { detail: { keywords: value } }))
      return
    }

    router.push(targetUrl)
  }

  const submitAgentQuestion = (question: string) => {
    const value = question.trim()
    if (!value || agentStreaming) return

    const messageId = `agent-${Date.now()}`
    const reply = buildAgentReply(value, lang)
    followMessagesRef.current = true
    setAgentMessages((messages) => [
      ...messages,
      { id: `user-${messageId}`, role: 'user', content: value },
    ])
    setAgentQuestion('')
    setAgentStreaming(true)
    setAgentStage('recognizing')

    const startTimer = window.setTimeout(() => {
      setAgentStage('matching')
      setAgentMessages((messages) => [...messages, { id: messageId, role: 'agent', content: '' }])
      let cursor = 0
      const streamTimer = window.setInterval(() => {
        cursor += 1
        setAgentMessages((messages) => messages.map((message) => (
          message.id === messageId ? { ...message, content: reply.slice(0, cursor) } : message
        )))
        if (cursor >= reply.length) {
          window.clearInterval(streamTimer)
          setAgentStreaming(false)
          setAgentStage('idle')
        }
      }, 24)
      agentTimersRef.current.push(streamTimer)
    }, 420)
    agentTimersRef.current.push(startTimer)
  }

  const handleAgentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitAgentQuestion(agentQuestion)
  }

  return (
    <div className={`search-popup${isOpen ? ' active' : ''}`} aria-hidden={!isOpen}>
      <div className="search-popup__overlay" onClick={closeSearchPopup} aria-hidden="true"></div>
      <div className="search-popup__content" ref={contentRef} role="dialog" aria-modal="true" aria-labelledby="search-popup-title">
        <div className="search-popup__toolbar">
          <h2 id="search-popup-title">{copy.searchTitle}</h2>
          <button type="button" className="search-popup__close" onClick={closeSearchPopup} aria-label={copy.close}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <form className="search-popup__query-form" action={searchPath} method="get" onSubmit={handleSubmit}>
          <label htmlFor="search-popup-keywords" className="sr-only">
            {dict('search here')}
          </label>
          <input
            type="search"
            id="search-popup-keywords"
            name="keywords"
            ref={inputRef}
            placeholder={copy.searchPlaceholder}
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" aria-label={dict('search here')} className="search-popup__search-submit">
            <i className="icon-magnifying-glass" aria-hidden="true"></i>
          </button>
        </form>
        <section className="search-popup__agent" aria-label={copy.title}>
          <div className="search-popup__agent-header">
            <div className="search-popup__agent-heading">
              <span className="search-popup__agent-avatar" aria-hidden="true">AI</span>
              <div>
                <span className="search-popup__agent-kicker">{copy.kicker}</span>
                <h3>{copy.title}</h3>
              </div>
            </div>
            <span className={`search-popup__agent-status search-popup__agent-status--${agentStage}`} role="status">
              <span aria-hidden="true"></span>{copy.status[agentStage]}
            </span>
          </div>
          <p className="search-popup__agent-subtitle">{copy.subtitle}</p>
          <div className="search-popup__agent-messages" ref={messagesRef} role="log" aria-live="polite" onScroll={(event) => {
            const messages = event.currentTarget
            followMessagesRef.current = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 48
          }}>
            {agentMessages.map((message) => (
              <div key={message.id} className={`search-popup__agent-message search-popup__agent-message--${message.role}`}>
                <span>{message.content}</span>
                {message.role === 'agent' && agentStreaming && message.id === agentMessages[agentMessages.length - 1]?.id && !message.content && (
                  <span className="search-popup__agent-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                )}
              </div>
            ))}
          </div>
          <div className="search-popup__agent-suggestions">
            {copy.suggestions.map((suggestion) => (
              <button key={suggestion} type="button" disabled={agentStreaming} onClick={() => submitAgentQuestion(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
          <form className="search-popup__agent-form" onSubmit={handleAgentSubmit}>
            <label htmlFor="search-popup-agent-question" className="sr-only">{copy.placeholder}</label>
            <input
              type="text"
              id="search-popup-agent-question"
              value={agentQuestion}
              onChange={(event) => setAgentQuestion(event.target.value)}
              placeholder={copy.placeholder}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="search-popup__agent-send" aria-label={copy.send} disabled={agentStreaming || !agentQuestion.trim()}>
              <i className="icon-right-arrow" aria-hidden="true"></i>
            </button>
          </form>
          <div className="search-popup__agent-footer">
            <button type="button" className="search-popup__agent-catalog" onClick={() => {
              closeSearchPopup()
              router.push(searchPath)
            }}>
              {copy.catalog}<i className="icon-right-arrow" aria-hidden="true"></i>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
