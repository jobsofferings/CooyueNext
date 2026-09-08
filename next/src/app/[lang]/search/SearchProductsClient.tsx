'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Locale } from '@/i18n-config'
import KnowledgeSearchPanel from '@/components/knowledge/KnowledgeSearchPanel'
import { searchProducts, type SearchProduct } from '@/lib/catalog-search'

export type { SearchProduct } from '@/lib/catalog-search'

export type SearchPageClientCopy = {
  intro: string
  inputLabel: string
  placeholder: string
  button: string
  viewDetail: string
  idle: string
  empty: string
}

interface SearchProductsClientProps {
  lang: Locale
  copy: SearchPageClientCopy
  initialKeywords: string
  products: SearchProduct[]
}

function getUrlKeywords(): string {
  return new URL(window.location.href).searchParams.get('keywords') || ''
}

function pushSearchUrl(lang: Locale, keywords: string) {
  const query = keywords.trim()
  const url = query ? `/${lang}/search?keywords=${encodeURIComponent(query)}` : `/${lang}/search`
  window.history.pushState({ keywords: query }, '', url)
}

function getSummary(lang: Locale, keywords: string, count: number): string {
  if (lang === 'zh') {
    return `目录关键词匹配（全部条件 / AND）：为「${keywords}」找到 ${count} 个产品。`
  }

  return `Catalog matches (all keywords / AND): ${count} products for "${keywords}".`
}

export default function SearchProductsClient({
  lang,
  copy,
  initialKeywords,
  products,
}: SearchProductsClientProps) {
  const [inputKeywords, setInputKeywords] = useState(initialKeywords)
  const [keywords, setKeywords] = useState(initialKeywords.trim())
  const results = useMemo(() => searchProducts(products, keywords), [products, keywords])
  const hasKeywords = keywords.length > 0

  useEffect(() => {
    const handleExternalSearch = (event: Event) => {
      const nextKeywords = (event as CustomEvent<{ keywords?: string }>).detail?.keywords || ''

      setInputKeywords(nextKeywords)
      setKeywords(nextKeywords.trim())
    }

    const handlePopState = () => {
      const nextKeywords = getUrlKeywords()

      setInputKeywords(nextKeywords)
      setKeywords(nextKeywords.trim())
    }

    window.addEventListener('cooyue:search-keywords', handleExternalSearch)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('cooyue:search-keywords', handleExternalSearch)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const applySearch = (value: string) => {
    const nextKeywords = value.trim()
    setInputKeywords(nextKeywords)
    setKeywords(nextKeywords)
    pushSearchUrl(lang, nextKeywords)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    applySearch(inputKeywords)
  }

  return (
    <section className="search-page">
      <div className="container">
        <p className="search-page__intro">{copy.intro}</p>
        <form className="search-page__form" onSubmit={handleSubmit}>
          <label htmlFor="search-page-keywords" className="sr-only">
            {copy.inputLabel}
          </label>
          <input
            id="search-page-keywords"
            name="keywords"
            type="search"
            placeholder={copy.placeholder}
            value={inputKeywords}
            onChange={(event) => setInputKeywords(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={500}
          />
          <button type="submit" className="thm-btn search-page__submit">
            <i className="icon-magnifying-glass"></i>
            <span>{copy.button}</span>
          </button>
        </form>

        <KnowledgeSearchPanel locale={lang} query={keywords} onQueryChange={applySearch} />

        {hasKeywords ? (
          <>
            <p className="search-page__summary">{getSummary(lang, keywords, results.length)}</p>
            {results.length > 0 ? (
              <div className="row search-page__grid">
                {results.map(({ product }) => (
                  <div key={product.id} className="col-xl-4 col-lg-4 col-md-6">
                    <Link
                      href={`/${lang}/products/${product.id}`}
                      className="products-catalog__card"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="products-catalog__card-label">{product.familyName}</span>
                      <h4 className="products-catalog__card-model">{product.model}</h4>
                      <p className="products-catalog__card-subtitle">{product.subtitle}</p>
                      <p className="products-catalog__card-description">{product.description}</p>
                      <ul className="products-catalog__specs list-unstyled">
                        {product.specs.slice(0, 4).map((spec) => (
                          <li key={spec}>
                            <span className="fa fa-check-circle"></span>
                            {spec}
                          </li>
                        ))}
                      </ul>
                      <span className="products-catalog__detail-link">
                        {copy.viewDetail}
                        <span className="fa fa-angle-right"></span>
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="search-page__empty">{copy.empty}</p>
            )}
          </>
        ) : (
          <p className="search-page__empty">{copy.idle}</p>
        )}
      </div>
    </section>
  )
}
