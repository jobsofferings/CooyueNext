#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_DATABASES = {
  PRODUCTS: "products_key",
  SEO: "seo_key",
};

const ENV_KEYS = [
  "PG_HOST",
  "PG_PORT",
  "PG_USER",
  "PG_DATABASE",
  "PG_PASSWORD",
  "PRODUCTS_DATABASE_URL",
  "PRODUCTS_PG_HOST",
  "PRODUCTS_PG_PORT",
  "PRODUCTS_PG_DATABASE",
  "PRODUCTS_PG_USER",
  "PRODUCTS_PG_PASSWORD",
  "SEO_DATABASE_URL",
  "SEO_PG_HOST",
  "SEO_PG_PORT",
  "SEO_PG_DATABASE",
  "SEO_PG_USER",
  "SEO_PG_PASSWORD",
];

const SENSITIVE_RE = /(PASSWORD|TOKEN|SECRET|PASS|DATABASE_URL|URL|KEY)/i;

function parseArgs(argv) {
  const options = {
    counts: false,
    json: false,
    showSecrets: false,
    timeoutMs: 5000,
    projectRoot: process.cwd(),
  };

  for (const arg of argv) {
    if (arg === "--counts") {
      options.counts = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--show-secrets") {
      options.showSecrets = true;
    } else if (arg.startsWith("--timeout-ms=")) {
      options.timeoutMs = Math.max(1000, Number(arg.slice("--timeout-ms=".length)) || 5000);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.projectRoot = arg;
    }
  }

  options.projectRoot = path.resolve(options.projectRoot);
  return options;
}

function loadEnv(projectRoot) {
  const envPath = path.join(projectRoot, "server", ".env");
  if (!fs.existsSync(envPath)) {
    return { envPath, loaded: false, error: "server/.env not found" };
  }

  const dotenvPath = path.join(projectRoot, "server", "node_modules", "dotenv");
  try {
    require(dotenvPath).config({ path: envPath, quiet: true });
    return { envPath, loaded: true, loader: "dotenv" };
  } catch (err) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const key = match[1];
      const value = match[2].replace(/^['"]|['"]$/g, "");
      if (process.env[key] === undefined) process.env[key] = value;
    }
    return { envPath, loaded: true, loader: "manual", dotenvError: err.message };
  }
}

function redact(key, value, showSecrets) {
  if (value === undefined) return { state: "unset" };
  if (value === "") return { state: "empty" };
  if (!showSecrets && SENSITIVE_RE.test(key)) return { state: "set", value: "<redacted>" };
  return { state: "set", value };
}

function summarizeConnectionString(connStr) {
  try {
    const url = new URL(connStr);
    return {
      source: "connectionString",
      host: url.hostname || undefined,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, "") || undefined,
      user: decodeURIComponent(url.username || ""),
      hasPassword: Boolean(url.password),
      sslmode: url.searchParams.get("sslmode") || undefined,
    };
  } catch (_err) {
    return { source: "connectionString", parseError: "Invalid database URL format" };
  }
}

function buildPoolConfig(envPrefix, timeoutMs) {
  const urlKey = `${envPrefix}_DATABASE_URL`;
  const connStr = process.env[urlKey];
  const defaultDatabase = DEFAULT_DATABASES[envPrefix] || "postgres";

  if (connStr) {
    return {
      config: { connectionString: connStr, connectionTimeoutMillis: timeoutMs },
      summary: summarizeConnectionString(connStr),
    };
  }

  const config = {
    host: process.env[`${envPrefix}_PG_HOST`] || process.env.PG_HOST || "localhost",
    port: Number(process.env[`${envPrefix}_PG_PORT`] || process.env.PG_PORT) || 5432,
    database: process.env[`${envPrefix}_PG_DATABASE`] || process.env.PG_DATABASE || defaultDatabase,
    user: process.env[`${envPrefix}_PG_USER`] || process.env.PG_USER || "postgres",
    password: process.env[`${envPrefix}_PG_PASSWORD`] || process.env.PG_PASSWORD || "postgres",
    connectionTimeoutMillis: timeoutMs,
  };

  return {
    config,
    summary: {
      source: "discreteEnv",
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      hasPassword: Boolean(config.password),
    },
  };
}

function findFiles(root, predicate, maxDepth, depth = 0, out = []) {
  if (!fs.existsSync(root) || depth > maxDepth) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, predicate, maxDepth, depth + 1, out);
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out.sort();
}

async function queryRows(client, sql, params = []) {
  return (await client.query(sql, params)).rows;
}

async function tableExists(client, table) {
  const rows = await queryRows(client, "select to_regclass($1) as name", [`public.${table}`]);
  return Boolean(rows[0].name);
}

async function inspectDatabase({ projectRoot, label, envPrefix, tables, timeoutMs }) {
  const pgPath = path.join(projectRoot, "server", "node_modules", "pg");
  const { Client } = require(pgPath);
  const { config, summary } = buildPoolConfig(envPrefix, timeoutMs);
  const client = new Client(config);
  const out = { label, ok: false, connection: summary, tables: {} };
  const started = Date.now();

  try {
    await client.connect();
    out.ok = true;
    out.latencyMs = Date.now() - started;
    out.server = (await queryRows(
      client,
      "select current_database() as database, current_user as user, inet_server_addr()::text as host, inet_server_port() as port, current_setting('server_version') as version, now() as checked_at"
    ))[0];

    for (const table of tables) {
      if (!(await tableExists(client, table))) {
        out.tables[table] = { exists: false };
        continue;
      }

      const info = {
        exists: true,
        total: (await queryRows(client, `select count(*)::int as total from ${table}`))[0].total,
      };

      if (["product_categories", "products_key", "seo_records"].includes(table)) {
        info.byLocaleVisibility = await queryRows(
          client,
          `select locale::text as locale, visibility::text as visibility, count(*)::int as count from ${table} group by locale, visibility order by locale, visibility`
        );
      }

      if (table === "mail_tasks") {
        info.byStatus = await queryRows(
          client,
          "select status::text as status, count(*)::int as count from mail_tasks group by status order by status"
        );
      }

      if (table === "seo_keys") {
        info.keysWithTargets = (await queryRows(
          client,
          "select count(*)::int as count from seo_keys where coalesce(array_length(targets, 1), 0) > 0"
        ))[0].count;
      }

      const hasUpdatedAt = (await queryRows(
        client,
        "select 1 from information_schema.columns where table_schema = 'public' and table_name = $1 and column_name = 'updated_at'",
        [table]
      )).length > 0;

      if (hasUpdatedAt) {
        info.updatedAt = (await queryRows(client, `select min(updated_at) as min, max(updated_at) as max from ${table}`))[0];
      }

      out.tables[table] = info;
    }
  } catch (err) {
    out.error = { message: err.message, code: err.code || null };
  } finally {
    await client.end().catch(() => {});
  }

  return out;
}

function buildInventory(options) {
  const projectRoot = options.projectRoot;
  if (path.basename(projectRoot) !== "CooyueNext") {
    throw new Error(`This script only supports the CooyueNext project. Received: ${projectRoot}`);
  }

  const envLoad = loadEnv(projectRoot);
  const serverRoot = path.join(projectRoot, "server");
  const files = [
    "server/.env",
    "server/.env.example",
    "server/src/config/db.js",
    "server/database.md",
  ].map((file) => ({ file, exists: fs.existsSync(path.join(projectRoot, file)) }));

  const restFiles = findFiles(serverRoot, (file) => file.endsWith(".rest"), 2)
    .map((file) => path.relative(projectRoot, file));

  const env = {};
  for (const key of ENV_KEYS) env[key] = redact(key, process.env[key], options.showSecrets);

  return {
    projectRoot,
    envLoad,
    files,
    restFiles,
    env,
    effectiveConnections: {
      products: buildPoolConfig("PRODUCTS", options.timeoutMs).summary,
      seo: buildPoolConfig("SEO", options.timeoutMs).summary,
    },
  };
}

function printText(result) {
  console.log(`Project root: ${result.projectRoot}`);
  console.log("");
  console.log("Files:");
  for (const item of result.files) {
    console.log(`${item.exists ? "FOUND" : "MISSING"} ${item.file}`);
  }

  console.log("");
  console.log("REST files:");
  if (result.restFiles.length) {
    for (const file of result.restFiles) console.log(file);
  } else {
    console.log("(none)");
  }

  console.log("");
  console.log("Effective connections:");
  for (const [label, conn] of Object.entries(result.effectiveConnections)) {
    console.log(`${label}: ${conn.host}:${conn.port}/${conn.database} user=${conn.user || "(empty)"} source=${conn.source} hasPassword=${conn.hasPassword}`);
  }

  console.log("");
  console.log("Database env keys:");
  for (const key of ENV_KEYS) {
    const entry = result.env[key];
    const suffix = entry.value === undefined ? entry.state : `${entry.state} ${entry.value}`;
    console.log(`${key}: ${suffix}`);
  }

  if (result.databases) {
    console.log("");
    console.log("Database status:");
    for (const db of result.databases) {
      console.log(`${db.label}: ${db.ok ? `ok latencyMs=${db.latencyMs}` : `failed code=${db.error?.code || "unknown"} message=${db.error?.message || "unknown"}`}`);
      for (const [table, info] of Object.entries(db.tables || {})) {
        if (!info.exists) {
          console.log(`  ${table}: missing`);
          continue;
        }
        console.log(`  ${table}: total=${info.total}`);
        if (info.byLocaleVisibility) {
          for (const row of info.byLocaleVisibility) {
            console.log(`    ${row.locale}/${row.visibility}: ${row.count}`);
          }
        }
        if (info.byStatus) {
          for (const row of info.byStatus) console.log(`    ${row.status}: ${row.count}`);
        }
        if (info.keysWithTargets !== undefined) {
          console.log(`    keysWithTargets: ${info.keysWithTargets}`);
        }
        if (info.updatedAt) {
          console.log(`    updatedAt: min=${info.updatedAt.min || "null"} max=${info.updatedAt.max || "null"}`);
        }
      }
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = buildInventory(options);

  if (options.counts) {
    result.databases = [
      await inspectDatabase({
        projectRoot: options.projectRoot,
        label: "products",
        envPrefix: "PRODUCTS",
        tables: ["product_categories", "products_key", "mail_tasks"],
        timeoutMs: options.timeoutMs,
      }),
      await inspectDatabase({
        projectRoot: options.projectRoot,
        label: "seo",
        envPrefix: "SEO",
        tables: ["seo_keys", "seo_records"],
        timeoutMs: options.timeoutMs,
      }),
    ];
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printText(result);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
