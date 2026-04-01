-- Run this against seo_key database to create types
BEGIN;
DO $$
BEGIN
  CREATE TYPE "locale" AS ENUM ('zh', 'en');
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;
COMMIT;
