'use client'

import { useEffect, useState, useCallback } from 'react'

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  const handleScroll = useCallback(() => {
    setIsVisible(window.scrollY > 100)
  }, [])

  const scrollToTop = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`scroll-to-target scroll-to-top${isVisible ? ' show' : ''}`}
      aria-label="Scroll to top"
    >
      <i className="icon-right-arrow"></i>
    </button>
  )
}
