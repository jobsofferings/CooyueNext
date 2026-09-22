require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), quiet: true });
const { Pool } = require("pg");
const { buildPoolConfig } = require("../src/config/db");
const { getConfig, validateConfig } = require("../src/modules/agent/config");
const { createProvider } = require("../src/modules/agent/provider");
const { loadContent } = require("../src/modules/agent/content");
const { embeddingVersion } = require("../src/modules/agent/search");
const { pendingVectorItems, readVectorIndex } = require("../src/modules/agent/vector-index");

async function main() {
  const operation = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!["index", "cleanup"].includes(operation)) throw new Error("Usage: node scripts/agent.js index|cleanup [--apply]");
  const config = getConfig();
  const pool = new Pool({ ...buildPoolConfig("PRODUCTS").config, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  try {
    if (operation === "cleanup") {
      const result = await pool.query("SELECT count(*)::int AS expired FROM agent.sessions WHERE expires_at <= now()");
      console.log({ operation, apply, ...result.rows[0] });
      if (apply) {
        await pool.query("DELETE FROM agent.sessions WHERE expires_at <= now()");
        await pool.query("DELETE FROM agent.runs WHERE created_at < now() - interval '30 days'");
        await pool.query("UPDATE agent.runs SET status='timeout', error_code='WORKER_INTERRUPTED', finished_at=now() WHERE status='running' AND created_at < now() - interval '2 minutes'");
      }
      return;
    }
    if (apply) validateConfig({ ...config, enabled: true });
    if (apply && !config.embeddingModel) throw new Error("AGENT_EMBEDDING_MODEL is required");
    const provider = apply ? createProvider(config) : null;
    for (const locale of ["zh", "en"]) {
      const { items, newsUnavailable } = await loadContent(pool, config, locale, AbortSignal.timeout(15000));
      if (newsUnavailable) throw new Error("News source unavailable; start Next before indexing");
      const stored = await readVectorIndex(pool, config, locale);
      const pending = pendingVectorItems(items, stored, config.dimensions);
      console.log({ operation, locale, apply, total: items.length, pending: pending.length });
      if (!apply) continue;
      for (let offset = 0; offset < pending.length; offset += 16) {
        const batch = pending.slice(offset, offset + 16);
        const { vectors } = await provider.embed(batch.map((item) => item.text), AbortSignal.timeout(config.timeoutMs), { purpose: "document" });
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (const [index, item] of batch.entries()) await client.query(`INSERT INTO agent.search_vectors(content_key, locale, model_version, content_hash, embedding)
            VALUES($1,$2,$3,$4,$5) ON CONFLICT(content_key,locale,model_version) DO UPDATE SET content_hash=EXCLUDED.content_hash,
              embedding=EXCLUDED.embedding, updated_at=now()`, [item.key, locale, embeddingVersion(config), item.hash, JSON.stringify(vectors[index])]);
          await client.query("COMMIT");
        } catch (error) { await client.query("ROLLBACK"); throw error; }
        finally { client.release(); }
        console.log({ operation, locale, indexed: Math.min(offset + batch.length, pending.length), pending: pending.length });
      }
      await pool.query("DELETE FROM agent.search_vectors WHERE locale=$1 AND (model_version <> $2 OR NOT(content_key = ANY($3::text[])))", [locale, embeddingVersion(config), items.map((item) => item.key)]);
    }
  } finally { await pool.end(); }
}

main().catch((error) => { console.error(error.code || "AGENT_MAINTENANCE_FAILED"); process.exitCode = 1; });
