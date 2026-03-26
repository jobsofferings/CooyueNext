'use client'

import { useDictionary } from '@/hooks/useDictionary'

export default function SearchPopup() {
  const dict = useDictionary()
  
  return (
    <div className="search-popup">
      <div className="search-popup__overlay search-toggler"></div>
      <div className="search-popup__content">
        <form action="#">
          <label htmlFor="search" className="sr-only">
            {dict('search here')}
          </label>
          <input type="text" id="search" placeholder={dict('Search Here...')} />
          <button type="submit" aria-label="search submit" className="thm-btn">
            <i className="icon-magnifying-glass"></i>
          </button>
        </form>
      </div>
    </div>
  )
}
