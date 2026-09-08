require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const express = require("express");
const { Pool } = require("pg");
const { buildPoolConfig } = require("../src/config/db");
const { createService } = require("../src/modules/knowledge/service");
const { createRouters } = require("../src/modules/knowledge/routes");
const { authenticateSession, requireManagementAuthForApi } = require("../src/modules/auth/routes");

async function main() {
  const pool = new Pool({ ...buildPoolConfig("PRODUCTS").config, max: 2, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  let server;
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks += 1; };
  try {
    await client.query("BEGIN");
    const service = createService(client);
    const methane = await service.search({ locale: "zh", query: "手持甲烷泄漏巡检相机" });
    check(methane.products.length === 2, "methane candidates");
    const sf6 = await service.search({ locale: "en", query: "SF6 gas imaging" });
    check(sf6.products.some((product) => product.slug === "flir-g306"), "English SF6 evidence");
    const chosen = ["guide-sensmart-pv400", "flir-gf77"];
    const comparison = await service.compare({ locale: "zh", productSlugs: chosen });
    check(comparison.products.length === 2, "comparison");
    const answer = await service.answer({ locale: "zh", productSlugs: chosen, question: "PV400 分辨率是多少？" });
    check(answer.status === "evidence_found" && answer.citations.length > 0, "sourced answer");
    const unknown = await service.answer({ locale: "zh", productSlugs: chosen, question: "PV400 价格和交期是多少？" });
    check(unknown.status === "insufficient_evidence", "missing information refusal");

    const draftInput = { locale: "zh", query: "甲烷巡检", productSlugs: chosen, requirements: "ROLLBACK validation only" };
    const draft = await service.draft(draftInput);
    const confirmation = { confirmationToken: draft.confirmationToken, confirmed: true, name: "Validation", email: "validation@example.invalid" };
    await assert.rejects(service.confirm(draft.id, { ...confirmation, confirmed: false }), /confirmation/i); checks += 1;
    await assert.rejects(service.confirm(draft.id, { ...confirmation, confirmationToken: "0".repeat(64) }), /not found/i); checks += 1;
    const submitted = await service.confirm(draft.id, confirmation);
    check(submitted.delivery === "stored", "inquiry persisted without email");
    check((await service.confirm(draft.id, confirmation)).id === submitted.id, "idempotent confirmation");
    check((await client.query("SELECT count(*)::int AS count FROM knowledge.inquiries WHERE id = $1 AND status = 'submitted'", [draft.id])).rows[0].count === 1, "one submitted inquiry");

    const expired = await service.draft(draftInput);
    await client.query("UPDATE knowledge.inquiries SET expires_at = now() - INTERVAL '1 minute' WHERE id = $1", [expired.id]);
    await assert.rejects(service.confirm(expired.id, { ...confirmation, confirmationToken: expired.confirmationToken }), /expired/i); checks += 1;
    const stale = await service.draft(draftInput);
    await client.query("SAVEPOINT stale_source");
    await client.query("UPDATE knowledge.documents SET version = 'validation-only' WHERE product_slug = $1 AND locale = 'zh'", [chosen[0]]);
    await assert.rejects(service.confirm(stale.id, { ...confirmation, confirmationToken: stale.confirmationToken }), /changed/i); checks += 1;
    await client.query("ROLLBACK TO SAVEPOINT stale_source");

    for (const [label, update] of [
      ["withdrawn document", "UPDATE knowledge.documents SET approval_status = 'withdrawn' WHERE product_slug = $1 AND locale = 'zh'"],
      ["private document", "UPDATE knowledge.documents SET is_public = FALSE WHERE product_slug = $1 AND locale = 'zh'"],
      ["draft product", "UPDATE public.products_key SET visibility = 'draft' WHERE slug = $1 AND locale = 'zh'"],
      ["sample product", "UPDATE public.products_key SET extra = extra || '{\"sample_entry\":true}'::jsonb WHERE slug = $1 AND locale = 'zh'"],
    ]) {
      await client.query("SAVEPOINT hidden_source");
      await client.query(update, [chosen[0]]);
      check((await service.search({ locale: "zh", query: "PV400" })).products.length === 0, label);
      await assert.rejects(service.confirm(stale.id, { ...confirmation, confirmationToken: stale.confirmationToken }), /approved/i); checks += 1;
      await client.query("ROLLBACK TO SAVEPOINT hidden_source");
    }

    const app = express();
    app.use(express.json());
    app.use(authenticateSession);
    const routers = createRouters(async () => client);
    app.use("/api/knowledge", routers.publicRouter);
    app.use("/api", requireManagementAuthForApi);
    app.use("/api/knowledge/admin", routers.adminRouter);
    app.use((error, _req, res, _next) => res.status(error.status || 500).json({ ok: false, error: error.message }));
    server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/knowledge`;
    const response = await fetch(`${baseUrl}/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: "en", query: "methane handheld" }) });
    check(response.status === 200 && (await response.json()).data.products.length === 2, "public HTTP search");
    check((await fetch(`${baseUrl}/admin/inquiries`)).status === 401, "inquiry admin endpoint requires authentication");
    const invalid = await fetch(`${baseUrl}/compare`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: "zh", productSlugs: ["flir-g306"] }) });
    check(invalid.status === 400, "HTTP validation");
    console.log(`PASS: ${checks} database / HTTP checks; all test writes will be rolled back.`);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
