ALTER TABLE agent.sessions ADD COLUMN IF NOT EXISTS context_id UUID;
UPDATE agent.sessions SET context_id = id WHERE context_id IS NULL;
ALTER TABLE agent.sessions ALTER COLUMN context_id SET DEFAULT gen_random_uuid();
ALTER TABLE agent.sessions ALTER COLUMN context_id SET NOT NULL;
