const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// ── Singleton state ────────────────────────────────────────────────────────────

let productsPool = null;
let seoPool      = null;

const DEFAULT_DATABASES = {
  PRODUCTS: "products_key",
  SEO: "seo_key",
};

// ── Pool factory ───────────────────────────────────────────────────────────────

/**
 * Build a Pool config from either a full *_DATABASE_URL env var
 * or individual *_PG_* env vars (the *_PG_* vars are only consulted
 * when *_DATABASE_URL is empty / falsy).
 *
 * Two independent pools:
 *   PRODUCTS_* → products module
 *   SEO_*      → seo module
 */
function summarizeConnectionString(connStr) {
  try {
    const url = new URL(connStr);
    return {
      source: "connectionString",
      host: url.hostname || undefined,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, "") || undefined,
      user: url.username || undefined,
      hasPassword: Boolean(url.password),
      sslmode: url.searchParams.get("sslmode") || undefined,
    };
  } catch (_err) {
    return {
      source: "connectionString",
      parseError: "Invalid database URL format",
    };
  }
}

function buildPoolConfig(envPrefix) {
  const urlKey  = `${envPrefix}_DATABASE_URL`;
  const connStr = process.env[urlKey];
  const defaultDatabase = DEFAULT_DATABASES[envPrefix] || "postgres";

  const config = connStr
    ? { connectionString: connStr }
    : {
        // Support both module-scoped vars (PRODUCTS_*/SEO_*) and legacy shared PG_* vars.
        host:
          process.env[`${envPrefix}_PG_HOST`] ||
          process.env.PG_HOST ||
          "localhost",
        port:
          Number(process.env[`${envPrefix}_PG_PORT`] || process.env.PG_PORT) ||
          5432,
        database:
          process.env[`${envPrefix}_PG_DATABASE`] ||
          process.env.PG_DATABASE ||
          defaultDatabase,
        user:
          process.env[`${envPrefix}_PG_USER`] ||
          process.env.PG_USER ||
          "postgres",
        password:
          process.env[`${envPrefix}_PG_PASSWORD`] ||
          process.env.PG_PASSWORD ||
          "postgres",
      };

  const summary = connStr
    ? summarizeConnectionString(connStr)
    : {
        source: "discreteEnv",
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        hasPassword: Boolean(config.password),
        defaultDatabase,
      };

  return { config, summary };
}

function createPool(envPrefix) {
  const { config, summary } = buildPoolConfig(envPrefix);
  return { pool: new Pool(config), summary };
}

function createDbInitError(message, code, details, cause, status = 503) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.publicDetails = details;
  err.cause = cause;
  return err;
}

// ── Migration runner ───────────────────────────────────────────────────────────

/**
 * Run all .sql files inside a named migrations sub-directory in order.
 * Safe to re-run on restart – "already exists" errors are swallowed.
 */
async function runMigrations(pool, moduleName, migrationsDir) {
  if (!fs.existsSync(migrationsDir)) {
    console.log(`[db:${moduleName}] No migrations dir found – skipping.`);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    try {
      await pool.query(sql);
      console.log(`[db:${moduleName}] Migration applied: ${file}`);
    } catch (err) {
      const safe = /already exists|duplicate key|already been caught/i.test(err.message);
      if (!safe) {
        console.error(`[db:${moduleName}] Migration ${file} error:`, err.message);
        throw err;
      }
      console.log(`[db:${moduleName}] Migration skipped (already applied): ${file}`);
    }
  }
}

// ── Startup health-check ──────────────────────────────────────────────────────

/**
 * Execute a simple "SELECT 1" query to verify the pool can reach the DB.
 * Returns a plain object so it never throws – the caller decides what to do.
 */
async function probePool(pool, label) {
  const t0 = Date.now();
  try {
    const { rows } = await pool.query("SELECT 1 AS ok, now() AS ts");
    return { label, ok: true, latencyMs: Date.now() - t0, ts: rows[0].ts };
  } catch (err) {
    return { label, ok: false, latencyMs: Date.now() - t0, error: err.message };
  }
}

async function initializeModulePool(envPrefix, moduleName, migrationsSubdir) {
  const { pool, summary } = createPool(envPrefix);

  pool.on("error", (err) => {
    console.error(`[db:${moduleName}] Unexpected pool error`, {
      error: err.message,
      code: err.code,
    });
  });

  console.log(`[db:${moduleName}] Initializing pool`, summary);

  const probe = await probePool(pool, moduleName);
  if (!probe.ok) {
    console.error(`[db:${moduleName}] Connection probe failed`, {
      ...summary,
      latencyMs: probe.latencyMs,
      error: probe.error,
    });
    await pool.end().catch(() => {});
    throw createDbInitError(
      `${moduleName} database connection failed`,
      "DB_CONNECTION_FAILED",
      {
        module: moduleName,
        db: summary,
        probe: {
          latencyMs: probe.latencyMs,
          error: probe.error,
        },
      }
    );
  }

  console.log(`[db:${moduleName}] Connected successfully`, {
    ...summary,
    latencyMs: probe.latencyMs,
    serverTime: probe.ts,
  });

  const migrationsDir = path.join(__dirname, "..", "..", "migrations", migrationsSubdir);

  try {
    await runMigrations(pool, moduleName, migrationsDir);
  } catch (err) {
    console.error(`[db:${moduleName}] Migration bootstrap failed`, {
      migrationsDir,
      error: err.message,
      code: err.code,
    });
    await pool.end().catch(() => {});
    throw createDbInitError(
      `${moduleName} database migration failed`,
      "DB_MIGRATION_FAILED",
      {
        module: moduleName,
        db: summary,
        migrationsDir,
        error: err.message,
      },
      err,
      500
    );
  }

  return pool;
}

// ── Module exports ─────────────────────────────────────────────────────────────

/** Products pool – used by modules/products/* */
async function getProductsPool() {
  if (!productsPool) {
    try {
      productsPool = await initializeModulePool("PRODUCTS", "products", "products");
    } catch (err) {
      productsPool = null;
      throw err;
    }
  }
  return productsPool;
}

/** SEO pool – used by modules/seo/* */
async function getSeoPool() {
  if (!seoPool) {
    try {
      seoPool = await initializeModulePool("SEO", "seo", "seo");
    } catch (err) {
      seoPool = null;
      throw err;
    }
  }
  return seoPool;
}

/** Convenience – one-shot query on the products pool. */
async function productsQuery(text, params) {
  const p = await getProductsPool();
  return p.query(text, params);
}

/** Convenience – one-shot query on the seo pool. */
async function seoQuery(text, params) {
  const p = await getSeoPool();
  return p.query(text, params);
}

/** Convenience – transaction wrapper for the products pool. */
async function productsTransaction(fn) {
  const p = await getProductsPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Convenience – transaction wrapper for the seo pool. */
async function seoTransaction(fn) {
  const p = await getSeoPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Close both pools (used during graceful shutdown). */
async function closeAll() {
  const ops = [];
  if (productsPool) ops.push(productsPool.end());
  if (seoPool)      ops.push(seoPool.end());
  await Promise.all(ops);
  productsPool = null;
  seoPool      = null;
}

module.exports = {
  getProductsPool,
  getSeoPool,
  productsQuery,
  seoQuery,
  productsTransaction,
  seoTransaction,
  closeAll,
};
