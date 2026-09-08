'use client'

import { useParams } from 'next/navigation'

export default function ProductError({ reset }: { reset: () => void }) {
  const { lang } = useParams()
  return <main className="container py-5" role="alert">
    <h1>{lang === 'zh' ? '产品资料暂时无法加载' : 'Product information is temporarily unavailable'}</h1>
    <p>{lang === 'zh' ? '请稍后重试，这不表示产品已经下架。' : 'Please retry shortly. This does not mean the product has been removed.'}</p>
    <button type="button" className="thm-btn" onClick={reset}>{lang === 'zh' ? '重试' : 'Retry'}</button>
  </main>
}
