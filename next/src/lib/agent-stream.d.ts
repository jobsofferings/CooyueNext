export function consumeAgentStream(response: Response, onEvent: (event: string, data: unknown) => void): Promise<void>
export function createAgentRequestId(cryptoProvider?: Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>>): string
export function agentError(code: string, details?: { requestId?: string; runId?: string; phase?: string }): Error & { code: string; requestId?: string; runId?: string; phase?: string }
