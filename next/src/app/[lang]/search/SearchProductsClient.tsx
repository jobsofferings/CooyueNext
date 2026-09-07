'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Locale } from '@/i18n-config'

type SearchField = {
  value: string
  weight: number
}

export type SearchProduct = {
  id: string
  familyName: string
  model: string
  subtitle: string
  description: string
  specs: string[]
  order: number
  fields: SearchField[]
}

export type SearchPageClientCopy = {
  intro: string
  inputLabel: string
  placeholder: string
  button: string
  viewDetail: string
  idle: string
  empty: string
}

type SearchResult = {
  product: SearchProduct
  score: number
}

interface SearchProductsClientProps {
  lang: Locale
  copy: SearchPageClientCopy
  initialKeywords: string
  products: SearchProduct[]
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.normalize('NFKC').toLowerCase().trim()
}

function tokenizeKeywords(keywords: string): string[] {
  const cjkPattern = /[\u3400-\u9fff]/

  return normalizeText(keywords)
    .split(/[\s,，;；|/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 || cjkPattern.test(token))
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (!needle || !haystack || needle.length > haystack.length) {
    return false
  }

  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) {
      index += 1
      if (index === needle.length) {
        return true
      }
    }
  }

  return false
}

function scoreField(field: string, token: string, weight: number): number {
  if (!field || !token) {
    return 0
  }

  if (field === token) {
    return weight * 4
  }

  if (field.startsWith(token)) {
    return weight * 3
  }

  if (field.includes(token)) {
    return weight * 2
  }

  if (isSubsequence(token, field)) {
    return Math.max(1, Math.round(weight * 0.8))
  }

  return 0
}

function scoreProduct(product: SearchProduct, tokens: string[]): number {
  let score = 0
  let matchedTokens = 0

  for (const token of tokens) {
    let tokenScore = 0

    for (const field of product.fields) {
      tokenScore = Math.max(tokenScore, scoreField(field.value, token, field.weight))
    }

    if (tokenScore > 0) {
      matchedTokens += 1
      score += tokenScore
    }
  }

  if (matchedTokens === 0) {
    return 0
  }

  return score + matchedTokens * 12
}

function searchProducts(products: SearchProduct[], keywords: string): SearchResult[] {
  const tokens = tokenizeKeywords(keywords)

  if (tokens.length === 0) {
    return []
  }

  return products
    .map((product) => ({
      product,
      score: scoreProduct(product, tokens),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.order - b.product.order || a.product.model.localeCompare(b.product.model))
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
    return `为「${keywords}」找到 ${count} 个匹配产品。`
  }

  return `Found ${count} matching products for "${keywords}".`
}

export default function SearchProductsClient({
  lang,
  copy,
  initialKeywords,
  products,
}: SearchProductsClientProps) {
  const [inputKeywords, setInputKeywords] = useState(initialKeywords)
  const [keywords, setKeywords] = useState(initialKeywords.trim())
  const indexedProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        fields: product.fields.map((field) => ({
          ...field,
          value: normalizeText(field.value),
        })),
      })),
    [products]
  )
  const results = useMemo(() => searchProducts(indexedProducts, keywords), [indexedProducts, keywords])
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextKeywords = inputKeywords.trim()
    setKeywords(nextKeywords)
    pushSearchUrl(lang, nextKeywords)
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
          />
          <button type="submit" className="thm-btn search-page__submit">
            <i className="icon-magnifying-glass"></i>
            <span>{copy.button}</span>
          </button>
        </form>

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
