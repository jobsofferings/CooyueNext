# CooyueNext DB And Server Files

## Core Files

- `server/.env`: current real database and server runtime settings
- `server/.env.example`: template values for local development
- `server/src/config/db.js`: effective fallback logic for PostgreSQL pools
- `server/test.rest`: REST request collection for server API testing
- `server/database.md`: project notes about PostgreSQL usage
- Other `server/` implementation files: use these when database interfaces, route definitions, request payloads, or response shapes need confirmation

## Effective DB Rules

- `PRODUCTS_DATABASE_URL` and `SEO_DATABASE_URL` take priority when set.
- When those URL variables are empty, the server falls back to module-scoped `PRODUCTS_PG_*` and `SEO_PG_*`.
- If a module-scoped host or port is absent, `server/src/config/db.js` also falls back to shared `PG_*` values.
- Default database names in code are `products_key` for products and `seo_key` for SEO.

## Current Known Test Entry

- `server/test.rest`

## Typical Questions This Skill Should Handle

- Which host and port does the current CooyueNext server use for PostgreSQL?
- Are products and SEO using separate users or separate databases?
- Which `.rest` file should I use to test health or SEO endpoints?
- Convert one request from `server/test.rest` into `curl`.
- Which `server/` files define the database-related API I need to inspect?
- If an interface is added or deleted, what should be updated in `server/test.rest`?
