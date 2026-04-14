const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// ── Singleton state ────────────────────────────────────────────────────────────

let productsPool = null;
let seoPool      = null;

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
function createPool(envPrefix) {
  const urlKey  = `${envPrefix}_DATABASE_URL`;
  const connStr = process.env[urlKey];

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
        database: process.env[`${envPrefix}_PG_DATABASE`] || "cooyue",
        user:
          process.env[`${envPrefix}_PG_USER`] ||
          process.env.PG_USER ||
          "postgres",
        password:
          process.env[`${envPrefix}_PG_PASSWORD`] ||
          process.env.PG_PASSWORD ||
          "postgres",
      };

  return new Pool(config);
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

// ── Module exports ─────────────────────────────────────────────────────────────

/** Products pool – used by modules/products/* */
async function getProductsPool() {
  if (!productsPool) {
    productsPool = createPool("PRODUCTS");

    productsPool.on("error", (err) => {
      console.error(`[db:products] Unexpected pool error: ${err.message}`);
    });

    // Probe
    const probe = await probePool(productsPool, "products");
    if (probe.ok) {
      console.log(
        `[db:products] Connected successfully | latency=${probe.latencyMs}ms | server_time=${probe.ts}`
      );
    } else {
      console.error(`[db:products] Connection FAILED: ${probe.error}`);
    }

    // Run migrations
    const migrationsDir = path.join(__dirname, "..", "..", "migrations", "products");
    await runMigrations(productsPool, "products", migrationsDir);
  }
  return productsPool;
}

/** SEO pool – used by modules/seo/* */
async function getSeoPool() {
  if (!seoPool) {
    seoPool = createPool("SEO");

    seoPool.on("error", (err) => {
      console.error(`[db:seo] Unexpected pool error: ${err.message}`);
    });

    // Probe
    const probe = await probePool(seoPool, "seo");
    if (probe.ok) {
      console.log(
        `[db:seo] Connected successfully | latency=${probe.latencyMs}ms | server_time=${probe.ts}`
      );
    } else {
      console.error(`[db:seo] Connection FAILED: ${probe.error}`);
    }

    // Run migrations
    const migrationsDir = path.join(__dirname, "..", "..", "migrations", "seo");
    await runMigrations(seoPool, "seo", migrationsDir);
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
