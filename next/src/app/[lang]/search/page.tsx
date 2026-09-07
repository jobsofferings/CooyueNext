import { Metadata } from 'next'
import { PageHeader } from '@/components/layout'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import { getProducts, toProductDetail, type ProductRecord } from '@/lib/products-api'
import { extractSeoMeta, getSeoByPath } from '@/lib/seo-api'
import SearchProductsClient, {
  type SearchPageClientCopy,
  type SearchProduct,
} from './SearchProductsClient'

export const revalidate = 300

const searchCopy: Record<Locale, SearchPageClientCopy & { pageTitle: string }> = {
  zh: {
    pageTitle: '产品搜索',
    intro: '支持型号、分类、标签、规格和描述的模糊搜索。',
    inputLabel: '搜索关键词',
    placeholder: '输入型号、分类或规格',
    button: '开始搜索',
    viewDetail: '查看详情',
    idle: '输入关键词后即可查看匹配产品。',
    empty: '没有找到匹配的产品，请换个关键词试试。',
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
  },
}

interface SearchPageProps {
  params: { lang: Locale }
  searchParams?: {
    keywords?: string | string[]
  }
}

function getSearchKeywords(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return value || ''
}

function buildSearchFields(record: ProductRecord, detail: ReturnType<typeof toProductDetail>): SearchProduct['fields'] {
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
  ].map(({ value, weight }) => ({
    value: typeof value === 'string' ? value : '',
    weight,
  }))
}

function toSearchProduct(record: ProductRecord): SearchProduct {
  const detail = toProductDetail(record)

  return {
    id: detail.id,
    familyName: detail.familyName,
    model: detail.model,
    subtitle: detail.subtitle,
    description: detail.description,
    specs: detail.specs,
    order: record.display_order,
    fields: buildSearchFields(record, detail),
  }
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
  const products = (await getProducts(params.lang)).map(toSearchProduct)

  return (
    <>
      <PageHeader
        title={copy.pageTitle}
        breadcrumbs={[
          { label: dict('Home'), href: '/' },
          { label: copy.pageTitle },
        ]}
      />

      <SearchProductsClient
        lang={params.lang}
        copy={copy}
        initialKeywords={keywords}
        products={products}
      />
    </>
  )
}
