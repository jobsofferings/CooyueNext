'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function HtmlLangSync() {
  const params = useParams()
  const lang = typeof params.lang === 'string' ? params.lang : 'en'

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return null
}
