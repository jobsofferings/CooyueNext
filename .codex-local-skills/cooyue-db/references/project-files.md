# CooyueNext DB And Server Files

## Core Files

- `server/.env`: current real database and server runtime settings
- `server/.env.example`: template values for local development
- `server/src/config/db.js`: effective fallback logic for PostgreSQL pools
- `server/*.rest`: optional REST request collections for server API testing
- `server/database.md`: project notes about PostgreSQL usage
- `server/migrations/products/*.sql`: products database schema
- `server/migrations/seo/*.sql`: SEO database schema
- `server/src/modules/products/*`: products endpoints and SQL query helpers
- `server/src/modules/seo/*`: SEO endpoints and SQL query helpers
- `server/src/modules/mail/*`: mail task endpoints and SQL query helpers
- Other `server/` implementation files: use these when database interfaces, route definitions, request payloads, or response shapes need confirmation

## Effective DB Rules

- `PRODUCTS_DATABASE_URL` and `SEO_DATABASE_URL` take priority when set.
- When those URL variables are empty, the server falls back to module-scoped `PRODUCTS_PG_*` and `SEO_PG_*`.
- If a module-scoped host or port is absent, `server/src/config/db.js` also falls back to shared `PG_*` values.
- Default database names in code are `products_key` for products and `seo_key` for SEO.

## Read-Only Inspection Script

- Run `scripts/inspect-cooyue-db.sh <project-root>` for file/config inventory.
- Run `scripts/inspect-cooyue-db.sh <project-root> --counts` for PostgreSQL connectivity and row counts.
- The script redacts passwords and full database URLs by default.
- Expected products tables: `product_categories`, `products_key`, `mail_tasks`.
- Expected SEO tables: `seo_keys`, `seo_records`.

## Typical Questions This Skill Should Handle

- Which host and port does the current CooyueNext server use for PostgreSQL?
- Are products and SEO using separate users or separate databases?
- How many rows are in products, categories, mail tasks, SEO keys, and SEO records?
- How many rows are published or draft for each locale?
- Which `.rest` file should I use to test health or SEO endpoints?
- Convert one request from `server/test.rest` into `curl`.
- Which `server/` files define the database-related API I need to inspect?
- If an interface is added or deleted, what should be updated in `server/test.rest`?
