CREATE SCHEMA IF NOT EXISTS agent;

CREATE TABLE IF NOT EXISTS agent.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_hash TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('zh', 'en')),
  history JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(history) = 'array' AND jsonb_array_length(history) <= 10),
  clarification_count INTEGER NOT NULL DEFAULT 0 CHECK (clarification_count BETWEEN 0 AND 10),
  active_run UUID,
  busy_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(visitor_hash, locale)
);

CREATE TABLE IF NOT EXISTS agent.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent.sessions(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  visitor_hash TEXT NOT NULL,
  query_preview TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'timeout')),
  model TEXT NOT NULL,
  result JSONB,
  metrics JSONB NOT NULL DEFAULT '{}',
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  UNIQUE(session_id, request_id)
);

CREATE TABLE IF NOT EXISTS agent.search_vectors (
  content_key TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('zh', 'en')),
  model_version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding JSONB NOT NULL CHECK (jsonb_typeof(embedding) = 'array'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(content_key, locale, model_version)
);

CREATE INDEX IF NOT EXISTS agent_runs_created_idx ON agent.runs(created_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_visitor_idx ON agent.runs(visitor_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_sessions_expiry_idx ON agent.sessions(expires_at);
