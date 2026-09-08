const path = require("node:path");
const fs = require("node:fs");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
const assert = require("node:assert/strict");
const express = require("express");
const { Pool } = require("pg");
const { buildPoolConfig } = require("../src/config/db");
const { createService } = require("../src/modules/knowledge/service");
const { createRouters } = require("../src/modules/knowledge/routes");
const { authenticateSession, requireManagementAuthForApi } = require("../src/modules/auth/routes");
const mailer = require("../src/modules/contact/mailer");

async function main() {
  const pool = new Pool({ ...buildPoolConfig("PRODUCTS").config, max: 2, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  const schema = `knowledge_validation_${process.pid}`;
  const rewrite = (sql) => sql.replaceAll("knowledge.", `${schema}.`).replaceAll("public.products_key", `${schema}.products_key`)
    .replaceAll("public.product_categories", `${schema}.product_categories`).replace(/\b(INTO|UPDATE) mail_tasks\b/g, `$1 ${schema}.mail_tasks`);
  const database = {
    query: (sql, parameters) => client.query(rewrite(sql), parameters),
    async connect() {
      return {
        query: (sql, parameters) => client.query(rewrite(sql === "BEGIN" ? "SAVEPOINT inquiry_confirmation"
          : sql === "COMMIT" ? "RELEASE SAVEPOINT inquiry_confirmation"
            : sql === "ROLLBACK" ? "ROLLBACK TO SAVEPOINT inquiry_confirmation" : sql), parameters),
        release() {},
      };
    },
  };
  const originalSend = mailer.sendContactEmail;
  const originalConfig = mailer.getContactMailConfig;
  let deliveries = 0;
  mailer.sendContactEmail = async () => { deliveries += 1; return { messageId: `validation-${deliveries}` }; };
  mailer.getContactMailConfig = () => ({ enabled: true, recipientEmail: "validation@example.invalid", subjectPrefix: "Validation" });
  let server;
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks += 1; };
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${schema}`);
    for (const table of ["products_key", "product_categories", "mail_tasks"]) {
      await client.query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
      if (table !== "mail_tasks") await client.query(`INSERT INTO ${schema}.${table} SELECT * FROM public.${table}`);
    }
    for (const migration of ["005_knowledge.sql", "007_catalog_inquiries.sql"]) {
      const sql = fs.readFileSync(path.join(__dirname, "../migrations/products", migration), "utf8")
        .replace(/^\s*(?:BEGIN|COMMIT);/gm, "")
        .replace(/CREATE SCHEMA IF NOT EXISTS knowledge;|REVOKE ALL ON SCHEMA knowledge FROM PUBLIC;/g, "");
      await database.query(sql);
    }
    for (const table of ["documents", "chunks"]) await client.query(`INSERT INTO ${schema}.${table} SELECT * FROM knowledge.${table}`);
    const service = createService(database);
    const result = await service.search({ locale: "zh", query: "我想要一个 K10 的板子或者是红外镜头的目镜" });
    check(result.matchMode === "any" && result.provider === "postgres-sparse-vector", "vector / keyword union");
    check(/k10/i.test(JSON.stringify(result.products[0])), "explicit K10 model ranks first");
    check(result.products.slice(0, 12).some((product) => /目镜|eyepiece/i.test(JSON.stringify(product))), "eyepiece alternatives in first page");
    check(new Set(result.products.map((product) => product.slug)).size === result.products.length, "deduplicated results");
    const english = await service.search({ locale: "en", query: "K10 board or infrared eyepiece" });
    check(english.products.length > 0 && english.products.every((product) => product.detailPath.startsWith("/en/")), "English catalog scope");
    const chosen = result.products.slice(0, 4).map((product) => product.slug);
    const comparison = await service.compare({ locale: "zh", productSlugs: chosen });
    check(comparison.products.length === chosen.length && !comparison.fields.includes("price"), "multi-product comparison without prices");
    check(comparison.products.every((product) => product.detailPath === `/zh/products/${product.slug}`), "internal product details");
    const draftInput = { locale: "zh", query: "K10 或红外目镜", productSlugs: chosen, requirements: "ROLLBACK validation only" };
    const draft = await service.draft(draftInput);
    const confirmation = { confirmationToken: draft.confirmationToken, confirmed: true, name: "Validation", email: "validation@example.invalid" };
    await assert.rejects(service.confirm(draft.id, { ...confirmation, confirmed: false }), /confirmation/i); checks += 1;
    await assert.rejects(service.confirm(draft.id, { ...confirmation, confirmationToken: "0".repeat(64) }), /not found/i); checks += 1;
    check((await service.confirm(draft.id, confirmation)).delivery === "sent", "mocked email delivered");
    check((await service.confirm(draft.id, confirmation)).delivery === "sent" && deliveries === 1, "idempotent email confirmation");
    check((await database.query("SELECT count(*)::int AS count FROM knowledge.inquiries WHERE id = $1 AND delivery_status = 'sent'", [draft.id])).rows[0].count === 1, "delivery recorded");
    await assert.rejects(service.draft({ ...draftInput, requirements: "字".repeat(1001) }), /1000/); checks += 1;
    const expired = await service.draft(draftInput);
    await database.query("UPDATE knowledge.inquiries SET expires_at = now() - INTERVAL '1 minute' WHERE id = $1", [expired.id]);
    await assert.rejects(service.confirm(expired.id, { ...confirmation, confirmationToken: expired.confirmationToken }), /expired/i); checks += 1;
    const stale = await service.draft(draftInput);
    await client.query("SAVEPOINT changed_product");
    await database.query("UPDATE public.products_key SET name = name || ' validation' WHERE slug = $1 AND locale = 'zh'", [chosen[0]]);
    await assert.rejects(service.confirm(stale.id, { ...confirmation, confirmationToken: stale.confirmationToken }), /changed/i); checks += 1;
    await client.query("ROLLBACK TO SAVEPOINT changed_product");
    for (const [label, update] of [
      ["draft product", "UPDATE public.products_key SET visibility = 'draft' WHERE slug = $1 AND locale = 'zh'"],
      ["sample product", "UPDATE public.products_key SET extra = extra || '{\"sample_entry\":true}'::jsonb WHERE slug = $1 AND locale = 'zh'"],
    ]) {
      await client.query("SAVEPOINT hidden_product");
      await database.query(update, [chosen[0]]);
      check(!(await service.search({ locale: "zh", query: draftInput.query })).products.some((product) => product.slug === chosen[0]), label);
      await assert.rejects(service.confirm(stale.id, { ...confirmation, confirmationToken: stale.confirmationToken }), /available/i); checks += 1;
      await client.query("ROLLBACK TO SAVEPOINT hidden_product");
    }
    const app = express();
    app.use(express.json());
    app.use(authenticateSession);
    const routers = createRouters(async () => database);
    app.use("/api/knowledge", routers.publicRouter);
    app.use("/api", requireManagementAuthForApi);
    app.use("/api/knowledge/admin", routers.adminRouter);
    app.use((error, _req, res, _next) => res.status(error.status || 500).json({ ok: false, error: error.message }));
    server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/knowledge`;
    const response = await fetch(`${baseUrl}/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: "en", query: "K10 or eyepiece" }) });
    check(response.status === 200 && (await response.json()).data.matchMode === "any", "public HTTP search");
    check((await fetch(`${baseUrl}/admin/inquiries`)).status === 401, "inquiry inbox requires authentication");
    const invalid = await fetch(`${baseUrl}/compare`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: "zh", productSlugs: [chosen[0]] }) });
    check(invalid.status === 400, "HTTP validation");
    console.log(`PASS: ${checks} database / HTTP checks in an isolated schema; SMTP mocked, all test writes rolled back.`);
    console.log(`Fuzzy example: ${result.products.length} matches; first products: ${result.products.slice(0, 6).map((product) => product.name).join(" / ")}`);
  } finally {
    mailer.sendContactEmail = originalSend;
    mailer.getContactMailConfig = originalConfig;
    if (server) await new Promise((resolve) => server.close(resolve));
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
