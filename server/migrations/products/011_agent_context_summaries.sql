ALTER TABLE agent.sessions ADD COLUMN IF NOT EXISTS context_summaries JSONB NOT NULL DEFAULT '{}'
  CHECK (jsonb_typeof(context_summaries) = 'object');
