'use client'

import { useEffect, useState } from 'react'
import type { Locale } from '@/i18n-config'
import SearchProgress, { type SearchPhase } from './SearchProgress'
import styles from './knowledge.module.css'

export default function SearchLoading({ locale, query }: { locale: Locale; query: string }) {
  const [phase, setPhase] = useState<SearchPhase>(query ? 'recognizing' : 'idle')

  useEffect(() => {
    if (!query) return
    const timer = window.setTimeout(() => setPhase('matching'), 900)
    return () => window.clearTimeout(timer)
  }, [query])

  return <main className={styles.page} aria-busy="true">
    <div className={styles.container}>
      <header className={styles.header}><h1>{locale === 'zh' ? '搜索产品，比较后直接询盘' : 'Find products, compare and inquire'}</h1></header>
      <div className={styles.card}><p>{query}</p>{query ? <SearchProgress locale={locale} phase={phase} /> : <p role="status">{locale === 'zh' ? '输入需求后开始搜索。' : 'Enter a request to start searching.'}</p>}</div>
    </div>
  </main>
}
