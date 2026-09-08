export interface SearchProduct {
  id: string
  familyName: string
  model: string
  subtitle: string
  description: string
  specs: string[]
  order: number
  fields: Array<{ value: string; weight: number }>
}

export function normalizeText(value: unknown): string
export function tokenizeKeywords(keywords: string): string[]
export function searchProducts(products: SearchProduct[], keywords: string): Array<{ product: SearchProduct; score: number }>
