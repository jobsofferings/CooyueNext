import Link from 'next/link'
import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import { getProducts, toProductDetail, type ProductDetailView, type ProductRecord } from '@/lib/products-api'
import { extractSeoMeta, getSeoByPath } from '@/lib/seo-api'

export const revalidate = 300

const searchCopy: Record<
  Locale,
  {
    pageTitle: string
    intro: string
    inputLabel: string
    placeholder: string
    button: string
    viewDetail: string
    idle: string
    empty: string
    summary: (keywords: string, count: number) => string
  }
> = {
  zh: {
    pageTitle: '产品搜索',
    intro: '支持型号、分类、标签、规格和描述的模糊搜索。',
    inputLabel: '搜索关键词',
    placeholder: '输入型号、分类或规格',
    button: '开始搜索',
    viewDetail: '查看详情',
    idle: '输入关键词后即可查看匹配产品。',
    empty: '没有找到匹配的产品，请换个关键词试试。',
    summary: (keywords, count) => `为「${keywords}」找到 ${count} 个匹配产品。`,
  },
  en: {
    pageTitle: 'Search Products',
    intro: 'Fuzzy search works across models, categories, tags, specs, and descriptions.',
    inputLabel: 'Search keywords',
    placeholder: 'Search by model, category, or spec',
    button: 'Search',
    viewDetail: 'View Detail',
    idle: 'Enter keywords to see matching products.',
    empty: 'No products matched. Try a different keyword.',
    summary: (keywords, count) => `Found ${count} matching products for "${keywords}".`,
  },
}

interface SearchPageProps {
  params: { lang: Locale }
  searchParams?: {
    keywords?: string | string[]
  }
}

type SearchResult = {
  detail: ProductDetailView
  score: number
  order: number
}

function getSearchKeywords(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return value || ''
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

function buildSearchFields(record: ProductRecord, detail: ProductDetailView): Array<{ value: string; weight: number }> {
  return [
    { value: detail.model, weight: 80 },
    { value: record.slug, weight: 72 },
    { value: detail.subtitle, weight: 44 },
    { value: detail.familyName, weight: 30 },
    { value: record.category_name || '', weight: 24 },
    { value: record.category_slug || '', weight: 20 },
    { value: detail.description, weight: 22 },
    { value: detail.specs.join(' '), weight: 24 },
    { value: detail.highlights.join(' '), weight: 18 },
    { value: detail.applications.join(' '), weight: 18 },
    { value: record.tags.join(' '), weight: 16 },
    { value: JSON.stringify(record.extra), weight: 12 },
    { value: JSON.stringify(record.specifications), weight: 12 },
  ].map((item) => ({
    value: normalizeText(item.value),
    weight: item.weight,
  }))
}

function scoreProduct(record: ProductRecord, detail: ProductDetailView, tokens: string[]): number {
  const fields = buildSearchFields(record, detail)
  let score = 0
  let matchedTokens = 0

  for (const token of tokens) {
    let tokenScore = 0

    for (const field of fields) {
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

function searchProducts(products: ProductRecord[], keywords: string): SearchResult[] {
  const tokens = tokenizeKeywords(keywords)

  if (tokens.length === 0) {
    return []
  }

  return products
    .map((record) => {
      const detail = toProductDetail(record)
      return {
        detail,
        score: scoreProduct(record, detail, tokens),
        order: record.display_order,
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order || a.detail.model.localeCompare(b.detail.model))
}

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const copy = searchCopy[params.lang]
  const seoData = await getSeoByPath('/search', params.lang)
  const seoMeta = extractSeoMeta(seoData, {
    title: siteConfig.seo.titleTemplate(copy.pageTitle),
    description: copy.intro,
  })

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: seoMeta.canonical || `/${params.lang}/search`,
      languages: Object.fromEntries(i18n.locales.map((locale) => [locale, `/${locale}/search`])),
    },
  }
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const dict = await getDictionary(params.lang)
  const copy = searchCopy[params.lang]
  const keywords = getSearchKeywords(searchParams?.keywords)
  const products = await getProducts(params.lang)
  const results = searchProducts(products, keywords)
  const query = keywords.trim()

  return (
    <>
      <PageHeader
        title={copy.pageTitle}
        breadcrumbs={[
          { label: dict('Home'), href: '/' },
          { label: copy.pageTitle },
        ]}
      />

      <section className="search-page">
        <div className="container">
          <p className="search-page__intro">{copy.intro}</p>
          <form className="search-page__form" action={`/${params.lang}/search`} method="get">
            <label htmlFor="search-page-keywords" className="sr-only">
              {copy.inputLabel}
            </label>
            <input
              id="search-page-keywords"
              name="keywords"
              type="search"
              placeholder={copy.placeholder}
              defaultValue={keywords}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="thm-btn search-page__submit">
              <i className="icon-magnifying-glass"></i>
              <span>{copy.button}</span>
            </button>
          </form>

          {query ? (
            <>
              <p className="search-page__summary">{copy.summary(query, results.length)}</p>
              {results.length > 0 ? (
                <div className="row search-page__grid">
                  {results.map(({ detail }) => (
                    <div key={detail.id} className="col-xl-4 col-lg-4 col-md-6">
                      <Link
                        href={`/${params.lang}/products/${detail.id}`}
                        className="products-catalog__card"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="products-catalog__card-label">{detail.familyName}</span>
                        <h4 className="products-catalog__card-model">{detail.model}</h4>
                        <p className="products-catalog__card-subtitle">{detail.subtitle}</p>
                        <p className="products-catalog__card-description">{detail.description}</p>
                        <ul className="products-catalog__specs list-unstyled">
                          {detail.specs.slice(0, 4).map((spec) => (
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
    </>
  )
}
