ALTER TABLE agent.sessions ADD COLUMN IF NOT EXISTS context_revision INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS agent.contexts (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES agent.sessions(id) ON DELETE CASCADE,
  clarification_count INTEGER NOT NULL DEFAULT 0 CHECK (clarification_count BETWEEN 0 AND 10),
  has_history BOOLEAN NOT NULL DEFAULT false,
  active_run UUID,
  busy_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_contexts_session_idx ON agent.contexts(session_id);

INSERT INTO agent.contexts(id, session_id, clarification_count, has_history, active_run, busy_until)
SELECT source.context_id, session.id,
  CASE WHEN source.context_id = session.context_id THEN session.clarification_count
    ELSE greatest(coalesce((session.context_summaries->source.context_id::text->>'clarificationCount')::integer, 0),
      coalesce((SELECT max(least(10, greatest(0, coalesce(10 - (turn->'result'->'clarification'->>'remaining')::integer, 1))))
        FROM jsonb_array_elements(session.history) turn
        WHERE coalesce((turn->>'contextId')::uuid, session.id) = source.context_id
          AND jsonb_typeof(turn->'result'->'clarification') = 'object'), 0)) END,
  EXISTS (SELECT 1 FROM jsonb_array_elements(session.history) turn WHERE coalesce((turn->>'contextId')::uuid, session.id) = source.context_id),
  CASE WHEN source.context_id = session.context_id THEN session.active_run END,
  CASE WHEN source.context_id = session.context_id THEN session.busy_until END
FROM agent.sessions session
CROSS JOIN LATERAL (
  SELECT session.context_id
  UNION SELECT coalesce((turn->>'contextId')::uuid, session.id) FROM jsonb_array_elements(session.history) turn
) source
ON CONFLICT(id) DO NOTHING;

UPDATE agent.sessions SET active_run = NULL, busy_until = NULL WHERE active_run IS NOT NULL OR busy_until IS NOT NULL;
