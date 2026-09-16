import { request } from '@umijs/max';

export interface AgentRun {
  id: string;
  session_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  query_preview: string;
  model: string;
  metrics: {
    durationMs?: number;
    firstTextMs?: number;
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
