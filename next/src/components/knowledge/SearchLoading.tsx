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
      <header className={styles.header}><h1>{locale === 'zh' ? '查找红外设备，比较后发送询盘' : 'Find infrared equipment and send an inquiry'}</h1></header>
      <div className={styles.card}><p>{query}</p>{query ? <SearchProgress locale={locale} phase={phase} /> : <p role="status">{locale === 'zh' ? '输入应用、型号或技术需求后开始搜索。' : 'Enter an application, model or technical requirement to start.'}</p>}</div>
    </div>
  </main>
}
