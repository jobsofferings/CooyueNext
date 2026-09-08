BEGIN;

CREATE SCHEMA IF NOT EXISTS knowledge;
REVOKE ALL ON SCHEMA knowledge FROM PUBLIC;

CREATE TABLE IF NOT EXISTS knowledge.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  product_slug TEXT NOT NULL,
  locale public.locale NOT NULL,
  category_slug TEXT NOT NULL CHECK (category_slug = 'gas-imaging-cameras'),
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'approved', 'withdrawn')),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  facts JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (product_slug, locale) REFERENCES public.products_key(slug, locale) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge.chunks (
  id TEXT PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES knowledge.documents(id) ON DELETE CASCADE,
  ordinal INT NOT NULL,
  section TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  UNIQUE (document_id, ordinal)
);

CREATE TABLE IF NOT EXISTS knowledge.index_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'postgres-lexical',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knowledge.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale public.locale NOT NULL,
  confirmation_token_hash TEXT NOT NULL,
  summary JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  contact_name TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 minutes',
  confirmed_at TIMESTAMPTZ,
  CHECK (status <> 'submitted' OR (contact_name IS NOT NULL AND contact_email IS NOT NULL AND confirmed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS knowledge_documents_scope_idx ON knowledge.documents(locale, approval_status, product_slug);
CREATE INDEX IF NOT EXISTS knowledge_jobs_status_idx ON knowledge.index_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS knowledge_inquiries_status_idx ON knowledge.inquiries(status, created_at);

COMMIT;
