-- ────────────────────────────────────────────────────────────
--  Products module – initial schema
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


-- ════════════════════════════════════════════════════════════
--  PRODUCTS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_categories (
  slug          TEXT        PRIMARY KEY,
  parent_slug   TEXT        REFERENCES product_categories(slug)
                             ON DELETE SET NULL ON UPDATE CASCADE,
  locale        "locale"   NOT NULL,
  name          TEXT        NOT NULL,
  description   TEXT,
  display_order INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_categories_slug_locale_unique UNIQUE (slug, locale)
);

CREATE INDEX IF NOT EXISTS product_categories_locale_idx     ON product_categories (locale);
CREATE INDEX IF NOT EXISTS product_categories_parent_slug_idx ON product_categories (parent_slug);

COMMENT ON TABLE product_categories IS 'Hierarchical product categories (multi-locale).';


CREATE TABLE IF NOT EXISTS products_key (
  slug              TEXT        PRIMARY KEY,
  category_slug     TEXT        REFERENCES product_categories(slug)
                                  ON DELETE SET NULL ON UPDATE CASCADE,
  locale            "locale"    NOT NULL,
  name              TEXT        NOT NULL,
  short_description TEXT,
  description       TEXT,
  price             NUMERIC(14, 4),
  original_price    NUMERIC(14, 4),
  currency          TEXT        NOT NULL DEFAULT 'USD',
  images            TEXT[]      NOT NULL DEFAULT '{}',
  tags              TEXT[]      NOT NULL DEFAULT '{}',
  specifications    JSONB       NOT NULL DEFAULT '{}',
  visibility        "visibility" NOT NULL DEFAULT 'draft',
  display_order    INT         NOT NULL DEFAULT 0,
  extra             JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT products_key_slug_locale_unique UNIQUE (slug, locale)
);

CREATE INDEX IF NOT EXISTS products_key_category_slug_idx ON products_key (category_slug);
CREATE INDEX IF NOT EXISTS products_key_locale_idx           ON products_key (locale);
CREATE INDEX IF NOT EXISTS products_key_visibility_idx        ON products_key (visibility);
CREATE INDEX IF NOT EXISTS products_key_price_idx              ON products_key (price);

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

DROP TRIGGER IF EXISTS trigger_product_categories_updated_at ON product_categories;
CREATE TRIGGER trigger_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products_key;
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products_key
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
