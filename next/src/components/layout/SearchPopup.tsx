'use client'

import { FormEvent, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDictionary } from '@/hooks/useDictionary'

export default function SearchPopup() {
  const dict = useDictionary()
  const params = useParams()
  const router = useRouter()
  const lang = typeof params.lang === 'string' ? params.lang : 'en'
  const [keywords, setKeywords] = useState('')
  const searchPath = `/${lang}/search`

  const closeSearchPopup = () => {
    document.querySelector('.search-popup')?.classList.remove('active')
    document.body.classList.remove('locked')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const value = keywords.trim()
    if (!value) {
      return
    }

    closeSearchPopup()
    router.push(`${searchPath}?keywords=${encodeURIComponent(value)}`)
  }

  return (
    <div className="search-popup">
      <div className="search-popup__overlay"></div>
      <div className="search-popup__content">
        <form action={searchPath} method="get" onSubmit={handleSubmit}>
          <label htmlFor="search-popup-keywords" className="sr-only">
            {dict('search here')}
          </label>
          <input
            type="search"
            id="search-popup-keywords"
            name="keywords"
            placeholder={dict('Search Here...')}
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" aria-label={dict('search here')} className="thm-btn">
            <i className="icon-magnifying-glass"></i>
          </button>
        </form>
      </div>
    </div>
  )
}
