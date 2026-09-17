import { request } from '@umijs/max';

export interface AgentRun {
  id: string;
  session_id: string;
  request_id?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  query_preview: string;
  model: string;
  metrics: {
    durationMs?: number;
    firstTextMs?: number;
    currentPhase?: string;
    failedPhase?: string;
    requestId?: string;
    firstEventMs?: number;
    streamEvents?: number;
    streamBytes?: number;
    selectionFallback?: { code: string; httpStatus?: number };
    explanationFallback?: { code: string; httpStatus?: number } | boolean;
    error?: { code: string; phase?: string; httpStatus?: number; networkCode?: string };
    phases?: Array<{ phase: string; status: string; offsetMs: number; durationMs?: number; timeoutMs: number; headersMs?: number; firstChunkMs?: number; chunks?: number; code?: string; httpStatus?: number; networkCode?: string; upstreamRequestId?: string }>;
    modelCalls?: number;
    toolCalls?: number;
    totalTokens?: number | null;
    retrieval?: string;
    productCount?: number;
    newsCount?: number;
    events?: Array<Record<string, unknown>>;
  };
  error_code: string | null;
  created_at: string;
  finished_at: string | null;
  result?: Record<string, unknown>;
}

export interface AgentSummary {
  total: number;
  failures: number;
  average_ms: string | null;
  tokens: string;
  unknown_usage: number;
}

export function listAgentRuns(params: { page: number; pageSize: number; status?: string }) {
  return request<{ ok: boolean; data: { rows: AgentRun[]; summary: AgentSummary } }>('/api/agent/admin/runs', { params });
}

export function getAgentRun(id: string) {
  return request<{ ok: boolean; data: AgentRun }>(`/api/agent/admin/runs/${id}`);
}
