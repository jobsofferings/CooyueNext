ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS visibility "visibility" NOT NULL DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS product_categories_visibility_idx
  ON product_categories (visibility);
