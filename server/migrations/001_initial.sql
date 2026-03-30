-- ────────────────────────────────────────────────────────────
--  Cooyue  –  initial schema
--  Run once against an empty database (e.g. via `psql`).
--  After the tables exist the app auto-applies incremental
--  patches on startup, so re-running this file is safe.
-- ────────────────────────────────────────────────────────────

BEGIN;

-- ── helpers ─────────────────────────────────────────────────

CREATE TYPE "locale" AS ENUM ('zh', 'en');

CREATE TYPE "visibility" AS ENUM ('published', 'draft');

CREATE TYPE "seo_target_type" AS ENUM ('home', 'product', 'category', 'article', 'custom');


-- ════════════════════════════════════════════════════════════
--  SEO
-- ════════════════════════════════════════════════════════════

CREATE TABLE seo_keys (
  key       TEXT        PRIMARY KEY,
  targets   TEXT[]      NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seo_records (
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

CREATE INDEX seo_records_seo_key_idx ON seo_records (seo_key);
CREATE INDEX seo_records_locale_idx   ON seo_records (locale);
CREATE INDEX seo_records_visibility_idx ON seo_records (visibility);

COMMENT ON TABLE seo_keys    IS 'Defines a unique SEO key and the page targets it can apply to.';
COMMENT ON TABLE seo_records IS 'Per-locale SEO content for a given seo_key.';


-- ════════════════════════════════════════════════════════════
--  PRODUCTS
-- ════════════════════════════════════════════════════════════

CREATE TABLE product_categories (
  slug        TEXT        PRIMARY KEY,
  parent_slug TEXT        REFERENCES product_categories(slug)
                            ON DELETE SET NULL ON UPDATE CASCADE,
  locale      "locale"    NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  display_order INT        NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_categories_slug_locale_unique UNIQUE (slug, locale)
);

CREATE INDEX product_categories_locale_idx   ON product_categories (locale);
CREATE INDEX product_categories_parent_slug_idx ON product_categories (parent_slug);


CREATE TABLE products_key (
  slug             TEXT        PRIMARY KEY,
  category_slug    TEXT        REFERENCES product_categories(slug)
                                 ON DELETE SET NULL ON UPDATE CASCADE,
  locale           "locale"    NOT NULL,
  name             TEXT        NOT NULL,
  short_description TEXT,
  description      TEXT,
  price            NUMERIC(14, 4),
  original_price   NUMERIC(14, 4),
  currency         TEXT        NOT NULL DEFAULT 'USD',
  images           TEXT[]      NOT NULL DEFAULT '{}',
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  specifications   JSONB       NOT NULL DEFAULT '{}',
  visibility       "visibility" NOT NULL DEFAULT 'draft',
  display_order   INT          NOT NULL DEFAULT 0,
  extra            JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT products_key_slug_locale_unique UNIQUE (slug, locale)
);

CREATE INDEX products_key_category_slug_idx ON products_key (category_slug);
CREATE INDEX products_key_locale_idx           ON products_key (locale);
CREATE INDEX products_key_visibility_idx        ON products_key (visibility);
CREATE INDEX products_key_price_idx              ON products_key (price);

COMMENT ON TABLE product_categories IS 'Hierarchical product categories (multi-locale).';
COMMENT ON TABLE products_key IS 'Product catalogue items (multi-locale).';


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

CREATE TRIGGER trigger_seo_keys_updated_at
  BEFORE UPDATE ON seo_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_seo_records_updated_at
  BEFORE UPDATE ON seo_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products_key
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
