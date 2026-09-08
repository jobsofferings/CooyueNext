import type { Locale } from '@/i18n-config'
import styles from './knowledge.module.css'

export default function SearchLoading({ locale, query }: { locale: Locale; query: string }) {
  return <main className={styles.page} aria-busy="true">
    <div className={styles.container}>
      <header className={styles.header}><h1>{locale === 'zh' ? '搜索产品，比较后直接询盘' : 'Find products, compare and inquire'}</h1></header>
      <div className={styles.card}><p>{query}</p><p role="status">{locale === 'zh' ? '正在查找相关产品…' : 'Finding related products…'}</p></div>
    </div>
  </main>
}
