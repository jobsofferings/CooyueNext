import type { Locale } from '@/i18n-config'
import styles from './knowledge.module.css'

export type SearchPhase = 'recognizing' | 'matching' | 'complete' | 'idle'

const labels = {
  zh: { recognizing: '正在识别应用需求', matching: '正在匹配红外设备' },
  en: { recognizing: 'Understanding your application', matching: 'Matching infrared equipment' },
}

export default function SearchProgress({ locale, phase }: { locale: Locale; phase: SearchPhase }) {
  const copy = labels[locale]
  const matching = phase === 'matching'
  const complete = phase === 'complete'

  return (
    <p className={styles.progress} role="status" aria-live="polite">
      <span className={`${styles.progressStep} ${phase === 'recognizing' ? styles.progressActive : complete || matching ? styles.progressComplete : ''}`}>
        {copy.recognizing}
      </span>
      <span className={styles.progressArrow} aria-hidden="true">→</span>
      <span className={`${styles.progressStep} ${matching ? styles.progressActive : complete ? styles.progressComplete : ''}`}>
        {copy.matching}
        {matching && <span className={styles.progressDots} aria-hidden="true">...</span>}
      </span>
    </p>
  )
}
