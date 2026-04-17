import 'server-only'
import { Locale } from '@/i18n-config'

type Visibility = 'published' | 'draft'

export interface ProductCategoryRecord {
  slug: string
  parent_slug: string | null
  locale: Locale
  name: string
  description: string | null
  display_order: number
  visibility: Visibility
}

export interface ProductRecord {
  slug: string
  category_slug: string | null
  locale: Locale
  name: string
  short_description: string | null
  description: string | null
  price: number | null
  original_price?: number | null
  currency: string
  images: string[]
  tags: string[]
  specifications: Record<string, unknown>
  display_order: number
  visibility: Visibility
  extra: Record<string, unknown>
  category_name?: string | null
  created_at?: string
  updated_at?: string
}

interface ApiListResponse<T> {
  ok: boolean
  data: T[]
  total?: number
}

interface ApiItemResponse<T> {
  ok: boolean
  data: T
}

export interface ProductMetric {
  value: string
  label: string
}

export interface ProductListCard {
  id: string
  model: string
  subtitle: string
  description: string
  specs: string[]
}

export interface ProductFamilySection {
  id: string
  name: string
  lead: string
  products: ProductListCard[]
}

export interface ProductDetailView {
  id: string
  familyId: string
  familyName: string
  model: string
  subtitle: string
  description: string
  specs: string[]
  image: string
  intro: string
  highlights: string[]
  applications: string[]
  metrics: ProductMetric[]
}

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  cores: '/assets/images/services/services-1-1.jpg',
  lenses: '/assets/images/services/services-1-2.jpg',
  eyepieces: '/assets/images/services/services-1-3.jpg',
  systems: '/assets/images/services/services-1-4.jpg',
}

const PRODUCT_IMAGE_FALLBACK = '/assets/images/services/services-details-benefit-img.jpg'
const DEFAULT_API_URL = 'http://43.139.70.61:3001'

const getApiBaseUrl = (): string | null => {
  const apiUrl = process.env.SEO_API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
  if (!apiUrl) {
    return null
  }

  return apiUrl.replace(/\/+$/, '')
}

async function fetchFromApi<T>(path: string): Promise<T | null> {
  const apiBaseUrl = getApiBaseUrl()
  if (!apiBaseUrl) {
    return null
  }

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Products API error: ${response.status}`)
    }

    return (await response.json()) as T
  } catch (error) {
    console.warn(`[Products API] Failed to fetch ${path}.`, error)
    return null
  }
}

export async function getProductCategories(locale: Locale): Promise<ProductCategoryRecord[]> {
  const response = await fetchFromApi<ApiListResponse<ProductCategoryRecord>>(
    `/api/products/categories?locale=${locale}`
  )
  return response?.data || []
}

export async function getProducts(locale: Locale): Promise<ProductRecord[]> {
  const response = await fetchFromApi<ApiListResponse<ProductRecord>>(`/api/products?locale=${locale}&pageSize=100`)
  return response?.data || []
}

export async function getProductBySlug(locale: Locale, slug: string): Promise<ProductRecord | null> {
  const response = await fetchFromApi<ApiItemResponse<ProductRecord>>(
    `/api/products/${encodeURIComponent(slug)}?locale=${locale}`
  )
  return response?.data || null
}

export async function getRelatedProducts(locale: Locale, slug: string): Promise<ProductRecord[]> {
  const response = await fetchFromApi<ApiListResponse<ProductRecord>>(
    `/api/products/${encodeURIComponent(slug)}/related?locale=${locale}&limit=3`
  )
  return response?.data || []
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean)
  }
  return []
}

function asMetricArray(value: unknown): ProductMetric[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const metric = item as Record<string, unknown>
      const metricValue = metric.value ? String(metric.value) : ''
      const metricLabel = metric.label ? String(metric.label) : ''

      if (!metricValue || !metricLabel) {
        return null
      }

      return {
        value: metricValue,
        label: metricLabel,
      }
    })
    .filter((item): item is ProductMetric => Boolean(item))
}

function getSpecs(record: ProductRecord): string[] {
  const specifications = asRecord(record.specifications)
  const cards = asStringArray(specifications.cards)
  if (cards.length > 0) {
    return cards
  }

  const metrics = asMetricArray(specifications.metrics)
  if (metrics.length > 0) {
    return metrics.map((metric) => `${metric.label}: ${metric.value}`)
  }

  if (record.tags.length > 0) {
    return record.tags.slice(0, 4)
  }

  return []
}

function getMetrics(record: ProductRecord): ProductMetric[] {
  const extra = asRecord(record.extra)
  const extraMetrics = asMetricArray(extra.metrics)
  if (extraMetrics.length > 0) {
    return extraMetrics
  }

  const specifications = asRecord(record.specifications)
  const specMetrics = asMetricArray(specifications.metrics)
  if (specMetrics.length > 0) {
    return specMetrics
  }

  return getSpecs(record).slice(0, 3).map((item, index) => ({
    value: item,
    label: `Spec ${index + 1}`,
  }))
}

function getImage(record: ProductRecord): string {
  const extra = asRecord(record.extra)
  if (typeof extra.cover_image === 'string' && extra.cover_image) {
    return extra.cover_image
  }
  if (record.images[0]) {
    return record.images[0]
  }
  if (record.category_slug && CATEGORY_IMAGE_MAP[record.category_slug]) {
    return CATEGORY_IMAGE_MAP[record.category_slug]
  }
  return PRODUCT_IMAGE_FALLBACK
}

export function toProductFamilySections(
  categories: ProductCategoryRecord[],
  products: ProductRecord[]
): ProductFamilySection[] {
  const categoryMap = new Map(categories.map((category) => [category.slug, category]))

  return categories
    .filter((category) => category.parent_slug !== null || products.some((item) => item.category_slug === category.slug))
    .map((category) => {
      const categoryProducts = products
        .filter((product) => product.category_slug === category.slug)
        .sort((a, b) => a.display_order - b.display_order)

      return {
        id: category.slug,
        name: category.name,
        lead: category.description || '',
        products: categoryProducts.map((record) => {
          const extra = asRecord(record.extra)
          return {
            id: record.slug,
            model: typeof extra.model === 'string' && extra.model ? extra.model : record.name,
            subtitle:
              typeof extra.subtitle === 'string' && extra.subtitle
                ? extra.subtitle
                : record.short_description || record.name,
            description:
              typeof extra.card_description === 'string' && extra.card_description
                ? extra.card_description
                : record.short_description || record.description || '',
            specs: getSpecs(record),
          }
        }),
      }
    })
    .filter((section) => section.products.length > 0 || categoryMap.has(section.id))
}

export function toProductDetail(record: ProductRecord): ProductDetailView {
  const extra = asRecord(record.extra)
  const highlights = asStringArray(extra.highlights)
  const applications = asStringArray(extra.applications)

  return {
    id: record.slug,
    familyId: record.category_slug || 'products',
    familyName:
      (typeof extra.family_name === 'string' && extra.family_name) ||
      record.category_name ||
      record.category_slug ||
      'Products',
    model: (typeof extra.model === 'string' && extra.model) || record.name,
    subtitle:
      (typeof extra.subtitle === 'string' && extra.subtitle) ||
      record.short_description ||
      record.name,
    description:
      (typeof extra.card_description === 'string' && extra.card_description) ||
      record.short_description ||
      record.description ||
      '',
    specs: getSpecs(record),
    image: getImage(record),
    intro: record.description || record.short_description || record.name,
    highlights: highlights.length > 0 ? highlights : getSpecs(record),
    applications: applications.length > 0 ? applications : record.tags.slice(0, 4),
    metrics: getMetrics(record),
  }
}

export function getCategoryImage(slug: string): string {
  return CATEGORY_IMAGE_MAP[slug] || PRODUCT_IMAGE_FALLBACK
}
