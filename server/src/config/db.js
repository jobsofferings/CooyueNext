const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

let pool = null;

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  const config = connectionString
    ? { connectionString }
    : {
        host:     process.env.PG_HOST     || "localhost",
        port:     Number(process.env.PG_PORT)     || 5432,
        database: process.env.PG_DATABASE || "cooyue",
        user:     process.env.PG_USER     || "postgres",
        password: process.env.PG_PASSWORD || "postgres",
      };

  return new Pool(config);
}

async function runMigrations(poolInstance) {
  const migrationsDir = path.join(__dirname, "..", "migrations");

  if (!fs.existsSync(migrationsDir)) {
    console.log("[db] No migrations directory found – skipping.");
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    try {
      await poolInstance.query(sql);
      console.log(`[db] Migration applied: ${file}`);
    } catch (err) {
      // "table already exists", "type already exists", "duplicate key" – safe to ignore
      const safe = /already exists|duplicate key|already been caught/i.test(err.message);
      if (!safe) {
        console.error(`[db] Migration ${file} error:`, err.message);
        throw err;
      }
      console.log(`[db] Migration skipped (already applied): ${file}`);
    }
  }
}

async function getPool() {
  if (!pool) {
    pool = createPool();

    pool.on("error", (err) => {
      console.error("[db] Unexpected pool error:", err.message);
    });

    try {
      await runMigrations(pool);
    } catch (err) {
      pool.end();
      pool = null;
      throw err;
    }
  }
  return pool;
}

async function query(text, params) {
  const p = await getPool();
  return p.query(text, params);
}

async function transaction(fn) {
  const p = await getPool();
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

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  query,
  transaction,
  closePool,
};
