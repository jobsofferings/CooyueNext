BEGIN;

CREATE TABLE IF NOT EXISTS knowledge.product_vectors (
  product_slug TEXT NOT NULL,
  locale public.locale NOT NULL,
  model_version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding JSONB NOT NULL CHECK (jsonb_typeof(embedding) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_slug, locale),
  FOREIGN KEY (product_slug, locale) REFERENCES public.products_key(slug, locale) ON DELETE CASCADE
);

ALTER TABLE knowledge.inquiries ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (delivery_status IN ('pending', 'sending', 'sent', 'failed'));
ALTER TABLE knowledge.inquiries ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE knowledge.inquiries ADD COLUMN IF NOT EXISTS mail_task_id UUID;

COMMIT;
