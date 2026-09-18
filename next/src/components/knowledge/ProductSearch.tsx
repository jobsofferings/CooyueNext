'use client'

import dynamic from 'next/dynamic'
import type { Locale } from '@/i18n-config'
import styles from './agent.module.css'

const AgentSearch = dynamic(() => import('./AgentSearch'), { ssr: false,
  loading: () => <div className={styles.loading} role="status" aria-label="Loading chat">···</div>,
})

export default function ProductSearch({ locale, initialQuery = '' }: { locale: Locale; initialQuery?: string }) {
  return <main className={styles.page}><div className={styles.container}><AgentSearch locale={locale} initialQuery={initialQuery} /></div></main>
}
