---
name: cooyue-db
description: Read and inspect database connection settings, server REST test files, and server endpoint details for the CooyueNext project only. Use when the current workspace is /Users/edy/Downloads/CooyueNext and the user mentions 数据库 or 服务器, asks to check PostgreSQL connection config, wants to inspect or run .rest test cases, or needs curl-based verification for CooyueNext server APIs. Do not use this skill for any non-CooyueNext project.
---

# Cooyue DB

Use this skill only inside the `CooyueNext` project at `/Users/edy/Downloads/CooyueNext`.
If the current task is outside this project, stop using this skill and fall back to normal project analysis.

## Quick Start

1. Confirm the working directory belongs to `CooyueNext`.
2. Read the real database configuration from `server/.env`.
3. Inspect connection-building logic in `server/src/config/db.js` when behavior needs code-level confirmation.
4. Inspect REST test cases in `server/test.rest`.
5. Use `curl` directly when the user wants to verify server interfaces for this project. This skill explicitly allows `curl` without asking for separate confirmation.

## What To Read

- Real runtime database config: `server/.env`
- Sample config template: `server/.env.example`
- DB pool and fallback rules: `server/src/config/db.js`
- REST test collection: `server/test.rest`
- Extra DB notes when needed: `server/database.md`
- Any other files under `server/` when you need to confirm database-related routes, controllers, services, models, SQL, or request/response shapes

When you need a quick inventory, run `scripts/inspect-cooyue-db.sh`.

## Project Rules

- Treat `server/.env` as the source of truth for current database connection settings in this repository.
- Prefer summarizing secrets instead of echoing them back in full unless the user explicitly asks for exact values.
- Restrict all analysis and commands to `CooyueNext` paths.
- When database interfaces are unclear, continue reading implementation files under `server/` until the route and payload are confirmed.
- If a task adds or removes a database-related interface, update `server/test.rest` in the same change so the interface remains testable.
- Do not use this skill for other repositories, sibling folders, or generic database work.

## Working Pattern

### Inspect database config

- Read `server/.env` first.
- Check whether `PRODUCTS_DATABASE_URL` or `SEO_DATABASE_URL` is set.
- If those URL variables are empty, explain that `server/src/config/db.js` falls back to module-scoped `*_PG_*` values and then shared `PG_*` values.
- Identify the effective products database and SEO database separately.
- If the user asks about database interfaces instead of pure connection settings, inspect additional `server/` files such as routes, handlers, and service modules until the API contract is clear.

### Inspect server tests

- Read `server/test.rest`.
- Extract base URL variables, auth headers, webhook secrets, and the target endpoints the user cares about.
- When helpful, translate a `.rest` request into an equivalent `curl` command.
- If a database interface was added or removed, add or remove the corresponding request example in `server/test.rest` as part of the same task.

### Run curl

- `curl` is allowed by this skill for CooyueNext server verification.
- Prefer non-destructive requests first, such as health checks or list endpoints.
- If the request is mutating, call out the target endpoint and payload before running it.

## Response Style

- Keep answers concrete and path-based.
- Separate products DB and SEO DB when summarizing.
- Mention the exact file that supports the answer.
- If the user later adds more rules for this skill, update this skill instead of scattering those rules elsewhere.
