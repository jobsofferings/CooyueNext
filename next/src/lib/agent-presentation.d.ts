import type { AgentResult, AgentTurn } from './agent-api'

export interface ChatEntry { id: string; role: 'assistant' | 'user'; content: string; result?: AgentResult; contextId?: string }
export function chatHistory(history: AgentTurn[], currentContextId?: string): ChatEntry[]
export function appendChatTurn(entries: ChatEntry[], user: ChatEntry, assistant: ChatEntry): ChatEntry[]
export function createTextReveal(onChange: (text: string) => void, options?: { intervalMs?: number; reducedMotion?: boolean }): {
  push(delta: string): void
  finish(finalText?: string): Promise<void>
  cancel(): void
}
