export interface KnowledgeProduct {
  slug: string
  name: string
  category: string
  model: string
  categoryName: string
  description: string
  specs: string[]
  metrics: Array<{ label: string; value: string }>
  facts: { gases: string[]; formFactor: string; resolution: string }
  detailPath: string
  version: string
}

export interface KnowledgeAnswer {
  mode: 'extractive'
  status: 'evidence_found' | 'insufficient_evidence'
  answer: string
  passages: Array<{ text: string; citationId: string }>
  citations: Array<{ id: string; title: string; url: string; section: string; version: string; reviewedAt: string }>
}

export interface KnowledgeSearchResult {
  query: string
  matchMode: 'any'
  status: 'matches' | 'no_matches' | 'needs_clarification'
  products: KnowledgeProduct[]
  clarification: {
    term: string
    message: string
    suggestions: Array<{ label: string; query: string }>
  } | null
}

export interface InitialProductSearch {
  products: KnowledgeProduct[] | null
  error: string
}

export interface InquiryDraft {
  id: string
  confirmationToken: string
  expiresAt: string
  summary: { category: string; query: string; question: string; requirements: string; products: KnowledgeProduct[] }
}

export async function knowledgeRequest<Result>(path: string, body: unknown, signal?: AbortSignal): Promise<Result> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  else signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(() => controller.abort(), path.endsWith('/confirm') ? 125000 : 20000)
  try {
    const response = await fetch(`/api/knowledge/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'The knowledge service is temporarily unavailable.')
    return payload.data as Result
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
