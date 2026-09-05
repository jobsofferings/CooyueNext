'use client'

import { FormEvent, useMemo, useState } from 'react'
import type { Locale } from '@/i18n-config'
import { submitContactMessage } from '@/lib/contact-api'

type ContactFormLabels = {
  name: string
  email: string
  message: string
  submit: string
}

type ContactFormInitialValues = {
  name: string
  email: string
  message: string
}

type ContactFormProps = {
  lang: Locale
  pagePath: string
  labels: ContactFormLabels
  initialValues: ContactFormInitialValues
}

const STATUS_COPY: Record<Locale, { sending: string; success: string; error: string; required: string }> = {
  en: {
    sending: 'Sending...',
    success: 'Message sent. We will reply soon.',
    error: 'Could not send your message. Try again later.',
    required: 'Please fill in your name, email, and message.',
  },
  zh: {
    sending: '发送中...',
    success: '留言已发送，我们会尽快回复。',
    error: '暂时无法发送，请稍后再试。',
    required: '请填写姓名、邮箱和留言。',
  },
}

type StatusState = {
  kind: 'idle' | 'sending' | 'success' | 'error'
  message: string
}

export function ContactForm({ lang, pagePath, labels, initialValues }: ContactFormProps) {
  const copy = useMemo(() => STATUS_COPY[lang] || STATUS_COPY.en, [lang])
  const [name, setName] = useState(initialValues.name)
  const [email, setEmail] = useState(initialValues.email)
  const [message, setMessage] = useState(initialValues.message)
  const [status, setStatus] = useState<StatusState>({ kind: 'idle', message: '' })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedMessage = message.trim()

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setStatus({ kind: 'error', message: copy.required })
      return
    }

    setStatus({ kind: 'sending', message: copy.sending })

    try {
      await submitContactMessage({
        name: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage,
        lang,
        pagePath,
      })

      setName('')
      setEmail('')
      setMessage('')
      setStatus({ kind: 'success', message: copy.success })
    } catch (error) {
      console.error('[ContactForm] submit failed:', error)
      setStatus({ kind: 'error', message: copy.error })
    }
  }

  const statusColor =
    status.kind === 'error' ? '#b42318' : status.kind === 'success' ? '#067647' : '#475467'

  return (
    <div className="contact-page__left">
      <div className="contact-page__form-box">
        <form className="contact-page__form" onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-xl-12">
              <div className="contact-page__input-box">
                <input
                  type="text"
                  placeholder={labels.name}
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                  disabled={status.kind === 'sending'}
                />
              </div>
            </div>
            <div className="col-xl-12">
              <div className="contact-page__input-box">
                <input
                  type="email"
                  placeholder={labels.email}
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  disabled={status.kind === 'sending'}
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-xl-12">
              <div className="contact-page__input-box text-message-box">
                <textarea
                  name="message"
                  placeholder={labels.message}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                  disabled={status.kind === 'sending'}
                ></textarea>
              </div>
              <div className="contact-page__btn-box">
                <button type="submit" className="thm-btn contact-page__btn" disabled={status.kind === 'sending'}>
                  {status.kind === 'sending' ? copy.sending : labels.submit}
                </button>
              </div>
              {status.message ? (
                <p
                  role="status"
                  aria-live="polite"
                  style={{
                    marginTop: '12px',
                    minHeight: '20px',
                    color: statusColor,
                    fontSize: '14px',
                    lineHeight: 1.5,
                  }}
                >
                  {status.message}
                </p>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
