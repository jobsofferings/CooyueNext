export interface KnowledgeProduct {
  slug: string
  name: string
  category: string
  facts: { name: string; gases: string[]; formFactor: string; resolution: string }
  price: number | null
  currency: string
  source: { title: string; url: string; version: string; reviewedAt: string }
}

export interface KnowledgeAnswer {
  mode: 'extractive'
  status: 'evidence_found' | 'insufficient_evidence'
  answer: string
  passages: Array<{ text: string; citationId: string }>
  citations: Array<{ id: string; title: string; url: string; section: string; version: string; reviewedAt: string }>
}

export interface InquiryDraft {
  id: string
  confirmationToken: string
  expiresAt: string
  summary: { category: string; query: string; question: string; requirements: string; products: KnowledgeProduct[] }
}

export async function knowledgeRequest<Result>(path: string, body: unknown): Promise<Result> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(`/api/knowledge/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'The knowledge service is temporarily unavailable.')
    return payload.data as Result
  } finally { clearTimeout(timeout) }
}
