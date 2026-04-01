-- ────────────────────────────────────────────────────────────
--  SEO module – initial schema
--  Run once against an empty database (e.g. via `psql`).
--  After the tables exist the app auto-applies incremental
--  patches on startup, so re-running this file is safe.
-- ────────────────────────────────────────────────────────────

BEGIN;

-- ── helpers ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  CREATE TYPE "locale" AS ENUM ('zh', 'en');
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

DO $$
BEGIN
  CREATE TYPE "visibility" AS ENUM ('published', 'draft');
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

DO $$
BEGIN
  CREATE TYPE "seo_target_type" AS ENUM ('home', 'product', 'category', 'article', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;


-- ════════════════════════════════════════════════════════════
--  SEO
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS seo_keys (
  key         TEXT        PRIMARY KEY,
  targets     TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_records (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seo_key     TEXT        NOT NULL REFERENCES seo_keys(key)
                               ON DELETE CASCADE ON UPDATE CASCADE,
  locale      "locale"    NOT NULL,
  title       TEXT,
  description TEXT,
  keywords    TEXT[]      NOT NULL DEFAULT '{}',
  og_image    TEXT,
  canonical   TEXT,
  no_index    BOOLEAN     NOT NULL DEFAULT FALSE,
  visibility  "visibility" NOT NULL DEFAULT 'draft',
  extra       JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT seo_records_key_locale_unique UNIQUE (seo_key, locale)
);

CREATE INDEX IF NOT EXISTS seo_records_seo_key_idx     ON seo_records (seo_key);
CREATE INDEX IF NOT EXISTS seo_records_locale_idx       ON seo_records (locale);
CREATE INDEX IF NOT EXISTS seo_records_visibility_idx  ON seo_records (visibility);

COMMENT ON TABLE seo_keys    IS 'Defines a unique SEO key and the page targets it can apply to.';
COMMENT ON TABLE seo_records IS 'Per-locale SEO content for a given seo_key.';


-- ════════════════════════════════════════════════════════════
--  Auto-update updated_at
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_seo_keys_updated_at ON seo_keys;
CREATE TRIGGER trigger_seo_keys_updated_at
  BEFORE UPDATE ON seo_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trigger_seo_records_updated_at ON seo_records;
CREATE TRIGGER trigger_seo_records_updated_at
  BEFORE UPDATE ON seo_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
