'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useDictionary } from '@/hooks/useDictionary'

export default function SearchPopup() {
  const dict = useDictionary()
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const lang = typeof params.lang === 'string' ? params.lang : 'en'
  const [keywords, setKeywords] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchPath = `/${lang}/search`

  const closeSearchPopup = () => {
    setIsOpen(false)
    document.body.classList.remove('locked')
  }

  useEffect(() => {
    router.prefetch(searchPath)
  }, [router, searchPath])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null

      if (!target?.closest('.search-toggler')) {
        return
      }

      event.preventDefault()
      setIsOpen(true)
      document.querySelector('.mobile-nav__wrapper')?.classList.remove('expanded')
      document.body.classList.add('locked')
    }

    document.addEventListener('click', handleDocumentClick)

    return () => {
      document.removeEventListener('click', handleDocumentClick)
      document.body.classList.remove('locked')
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    window.setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        document.body.classList.remove('locked')
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const value = keywords.trim()
    if (!value) {
      return
    }

    closeSearchPopup()
    setKeywords('')

    const targetUrl = `${searchPath}?keywords=${encodeURIComponent(value)}`
    if (pathname === searchPath) {
      window.history.pushState({ keywords: value }, '', targetUrl)
      window.dispatchEvent(new CustomEvent('cooyue:search-keywords', { detail: { keywords: value } }))
      return
    }

    router.push(targetUrl)
  }

  return (
    <div className={`search-popup${isOpen ? ' active' : ''}`}>
      <div className="search-popup__overlay" onClick={closeSearchPopup}></div>
      <div className="search-popup__content">
        <form action={searchPath} method="get" onSubmit={handleSubmit}>
          <label htmlFor="search-popup-keywords" className="sr-only">
            {dict('search here')}
          </label>
          <input
            type="search"
            id="search-popup-keywords"
            name="keywords"
            ref={inputRef}
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
