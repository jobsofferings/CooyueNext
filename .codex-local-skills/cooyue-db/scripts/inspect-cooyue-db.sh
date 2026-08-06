#!/bin/zsh
set -euo pipefail

project_root="${1:-$(pwd)}"
project_root="${project_root:A}"

if [[ "${project_root:t}" != "CooyueNext" ]]; then
  echo "This script only supports the CooyueNext project." >&2
  echo "Received: ${project_root}" >&2
  exit 1
fi

echo "Project root: ${project_root}"

for path in \
  "server/.env" \
  "server/.env.example" \
  "server/src/config/db.js" \
  "server/test.rest" \
  "server/database.md"
do
  if [[ -f "${project_root}/${path}" ]]; then
    echo "FOUND ${path}"
  else
    echo "MISSING ${path}"
  fi
done

echo
echo "REST files:"
/usr/bin/find "${project_root}/server" -maxdepth 2 -name '*.rest' -print | /usr/bin/sort

echo
echo "Database env keys:"
if [[ -f "${project_root}/server/.env" ]]; then
  /usr/local/bin/rg '^(PG_HOST|PG_PORT|PG_USER|PG_DATABASE|PG_PASSWORD|PRODUCTS_DATABASE_URL|PRODUCTS_PG_HOST|PRODUCTS_PG_PORT|PRODUCTS_PG_DATABASE|PRODUCTS_PG_USER|PRODUCTS_PG_PASSWORD|SEO_DATABASE_URL|SEO_PG_HOST|SEO_PG_PORT|SEO_PG_DATABASE|SEO_PG_USER|SEO_PG_PASSWORD)=' "${project_root}/server/.env"
else
  echo "server/.env not found"
fi
