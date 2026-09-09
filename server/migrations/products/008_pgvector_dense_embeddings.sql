BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    RAISE EXCEPTION 'pgvector is not installed on this PostgreSQL server; install the vector extension before applying this migration';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE knowledge.product_vectors
  ADD COLUMN IF NOT EXISTS dense_embedding vector(1536),
  ADD COLUMN IF NOT EXISTS dense_model_version TEXT,
  ADD COLUMN IF NOT EXISTS dense_content_hash TEXT,
  ADD COLUMN IF NOT EXISTS dense_updated_at TIMESTAMPTZ;

ALTER TABLE knowledge.chunks
  ADD COLUMN IF NOT EXISTS dense_embedding vector(1536),
  ADD COLUMN IF NOT EXISTS dense_model_version TEXT,
  ADD COLUMN IF NOT EXISTS dense_content_hash TEXT,
  ADD COLUMN IF NOT EXISTS dense_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS knowledge_product_vectors_dense_hnsw_idx
  ON knowledge.product_vectors USING hnsw (dense_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS knowledge_chunks_dense_hnsw_idx
  ON knowledge.chunks USING hnsw (dense_embedding vector_cosine_ops);

COMMIT;
