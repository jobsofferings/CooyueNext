-- Support multi-locale rows that reuse the same slug.
-- The application already upserts on (slug, locale), so the single-column
-- primary keys and slug-based foreign keys block valid writes from the API.

ALTER TABLE products_key
  DROP CONSTRAINT IF EXISTS products_key_category_slug_fkey;

ALTER TABLE product_categories
  DROP CONSTRAINT IF EXISTS product_categories_parent_slug_fkey;

ALTER TABLE product_categories
  DROP CONSTRAINT IF EXISTS product_categories_pkey;

ALTER TABLE products_key
  DROP CONSTRAINT IF EXISTS products_key_pkey;

CREATE INDEX IF NOT EXISTS product_categories_slug_idx
  ON product_categories (slug);

CREATE INDEX IF NOT EXISTS products_key_slug_idx
  ON products_key (slug);
