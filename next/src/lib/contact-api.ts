export interface ContactSubmissionInput {
  name: string
  email: string
  message: string
  lang: string
  pagePath: string
}

export interface ContactSubmissionResponse {
  ok: boolean
  message?: string
  error?: string
  requestId?: string
  data?: {
    taskId?: string | null
    messageId?: string
    logged?: boolean
  }
}

export async function submitContactMessage(
  input: ContactSubmissionInput
): Promise<ContactSubmissionResponse> {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json().catch(() => null)) as ContactSubmissionResponse | null

  if (!response.ok) {
    const errorMessage = payload?.error || 'Failed to submit contact form'
    const error = new Error(errorMessage) as Error & {
      status?: number
      requestId?: string
      details?: unknown
    }
    error.status = response.status
    error.requestId = payload?.requestId
    error.details = payload
    throw error
  }

  return payload || { ok: true }
}
