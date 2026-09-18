import type { KnowledgeProduct } from './knowledge-api'
import { agentError } from './agent-stream'

export interface AgentResult {
  query: string
  status: 'matches' | 'no_matches' | 'needs_clarification'
  message: string
  products: Array<KnowledgeProduct & { id: string; type: 'product'; matchReasons: string[]; caveat: string }>
  news: Array<{ id: string; type: 'news'; title: string; description: string; detailPath: string }>
  clarification: { question: string; remaining: number } | null
}

export interface AgentTurn { user: string; result: AgentResult; createdAt: string; contextId?: string }

export async function agentRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/agent/${path}`, {
    method: body === undefined ? 'GET' : 'POST', cache: 'no-store', credentials: 'same-origin', signal,
    headers: { 'Content-Type': 'application/json', 'x-cooyue-agent': '1' }, body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) throw agentError(payload?.error || 'AGENT_UNAVAILABLE', payload || {})
  return payload.data as T
}
