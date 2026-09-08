require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { buildPoolConfig } = require("../src/config/db");
const { indexDocument, eligibleSql } = require("../src/modules/knowledge/store");
const sources = require("../knowledge/gas-imaging-sources");

async function main() {
  const action = process.argv[2] || "inspect";
  if (!["inspect", "migrate", "index", "withdraw", "cleanup", "export"].includes(action)) throw new Error("Unknown knowledge command");
  if (["migrate", "index", "withdraw", "cleanup"].includes(action) && !process.argv.includes("--apply")) {
    throw new Error("Writes require --apply. Inspect the target products database first.");
  }
  const { config, summary } = buildPoolConfig("PRODUCTS");
  const pool = new Pool({ ...config, max: 2, connectionTimeoutMillis: 5000, statement_timeout: 15000 });
  try {
    if (action === "inspect") {
      const client = await pool.connect();
      try {
        await client.query("BEGIN READ ONLY");
        const database = (await client.query(`SELECT version(), inet_server_addr(), current_database(), current_user,
          has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema,
          (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser,
          pg_size_pretty(pg_database_size(current_database())) AS database_size,
          current_setting('max_connections') AS max_connections,
          (SELECT count(*) FROM pg_stat_activity) AS visible_connections,
          to_regnamespace('knowledge') AS knowledge_schema`)).rows[0];
        const extensions = (await client.query("SELECT name, default_version, installed_version FROM pg_available_extensions WHERE name IN ('vector','pg_trgm')")).rows;
        const products = (await client.query(`SELECT locale, count(*) FROM public.products_key WHERE category_slug = 'gas-imaging-cameras' GROUP BY locale`)).rows;
        const counts = database.knowledge_schema ? (await client.query(`SELECT
          (SELECT count(*) FROM knowledge.documents) AS documents,
          (SELECT count(*) FROM knowledge.chunks) AS chunks,
          (SELECT count(*) FROM knowledge.index_jobs WHERE status = 'failed') AS failed_jobs,
          (SELECT count(*) FROM knowledge.inquiries WHERE status = 'submitted') AS submitted_inquiries`)).rows[0] : null;
        console.log(JSON.stringify({ connection: summary, database, extensions, products, counts }, null, 2));
        await client.query("ROLLBACK");
      } finally { client.release(); }
    } else if (action === "migrate") {
      console.log("Applying additive knowledge migration to", summary.database || "configured products database");
      await pool.query(fs.readFileSync(path.join(__dirname, "../migrations/products/005_knowledge.sql"), "utf8"));
      console.log("knowledge schema ready");
    } else if (action === "index") {
      for (const source of sources) console.log(await indexDocument(pool, source));
    } else if (action === "withdraw") {
      const sourceKey = process.argv[3];
      if (!sourceKey || sourceKey.startsWith("--")) throw new Error("Supply a source key");
      const result = await pool.query("UPDATE knowledge.documents SET approval_status = 'withdrawn', is_public = FALSE, updated_at = now() WHERE source_key = $1", [sourceKey]);
      console.log({ withdrawn: result.rowCount });
    } else if (action === "cleanup") {
      const drafts = await pool.query("DELETE FROM knowledge.inquiries WHERE status = 'draft' AND expires_at < now()");
      const submissions = await pool.query("DELETE FROM knowledge.inquiries WHERE status = 'submitted' AND confirmed_at < now() - INTERVAL '90 days'");
      const jobs = await pool.query("DELETE FROM knowledge.index_jobs WHERE finished_at < now() - INTERVAL '30 days'");
      console.log({ expiredDrafts: drafts.rowCount, oldSubmissions: submissions.rowCount, oldJobs: jobs.rowCount });
    } else {
      const client = await pool.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
        const documents = (await client.query(`SELECT document.* ${eligibleSql()} ORDER BY document.source_key`)).rows;
        const chunks = (await client.query("SELECT * FROM knowledge.chunks WHERE document_id = ANY($1::uuid[]) ORDER BY id", [documents.map((document) => document.id)])).rows;
        console.log(JSON.stringify({ formatVersion: 1, documents, chunks }, null, 2));
        await client.query("ROLLBACK");
      } finally { client.release(); }
    }
  } finally { await pool.end(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
