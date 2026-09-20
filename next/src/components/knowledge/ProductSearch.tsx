'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'
import type { Locale } from '@/i18n-config'
import styles from './agent.module.css'

const AgentSearch = dynamic(() => import('./AgentSearch'), { ssr: false,
  loading: () => <div className={styles.loading} role="status" aria-label="Loading chat">···</div>,
})

export default function ProductSearch({ locale, initialQuery = '' }: { locale: Locale; initialQuery?: string }) {
  const pageRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const page = pageRef.current
    const header = document.querySelector('.main-header')
    if (!page || !header) return
    const updateHeight = () => page.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  return <main ref={pageRef} className={styles.page}><div className={styles.container}><AgentSearch locale={locale} initialQuery={initialQuery} /></div></main>
}
