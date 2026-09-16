const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { createStore } = require("../src/modules/agent/store");

test("isolated PostgreSQL migrations, session ownership, idempotency, budgets, history, admin queries and retention", async (context) => {
  const database = new PGlite();
  const pool = { query: (sql, values) => database.query(sql, values),
    async connect() { return { query: (sql, values) => database.query(sql, values), release() {} }; } };
  const store = createStore(pool);
  const config = { timeoutMs: 45000, model: "mock", dailyBudget: 100, visitorHourlyLimit: 50 };
  const identity = { hash: "a".repeat(64), expiresAt: new Date(Date.now() + 30 * 86400000) };
  const input = () => ({ requestId: randomUUID(), message: "甲烷 手持" });
  const result = { status: "matches", query: "甲烷 手持", message: "已找到候选", products: [{ id: "pv400" }], news: [], clarification: null, retrieval: { mode: "hybrid" } };
  let session;
  let completedRun;
  try {
    const migration = readFileSync(join(__dirname, "../migrations/products/009_agent.sql"), "utf8");
    await database.exec(migration);
    await database.exec(migration);
    await context.test("same browser/locale reuses identity and expiry; owner and expired sessions cannot read", async () => {
      session = await store.session(identity, "zh");
      assert.equal((await store.session(identity, "zh")).id, session.id);
      assert.equal(new Date(session.expires_at).toISOString(), identity.expiresAt.toISOString());
      assert.notEqual((await store.session(identity, "en")).id, session.id);
      await assert.rejects(store.get(session.id, "b".repeat(64)), /SESSION_NOT_FOUND/);
      const expired = await store.session({ hash: "e".repeat(64), expiresAt: new Date(Date.now() - 1000) }, "zh");
      await assert.rejects(store.get(expired.id, "e".repeat(64)), /SESSION_NOT_FOUND/);
    });
    await context.test("session lock and request idempotency prevent repeat tool calls/usage", async () => {
      const message = input();
      const state = await store.begin(session.id, identity.hash, message, config);
      assert.ok(state.runId);
      await assert.rejects(store.begin(session.id, identity.hash, message, config), /RUN_IN_PROGRESS/);
      await assert.rejects(store.begin(session.id, identity.hash, input(), config), /SESSION_BUSY/);
      await store.finish(session.id, state.runId, message.message, result, { durationMs: 100, totalTokens: 25 });
      const replay = await store.begin(session.id, identity.hash, message, config);
      assert.equal(replay.replay.id, state.runId);
      assert.equal(replay.replay.result.products[0].id, "pv400");
      completedRun = state.runId;
    });
    await context.test("10-turn history is rolling; clarifications stop at ten without banning further searches", async () => {
      for (let index = 0; index < 12; index += 1) {
        const message = input();
        const state = await store.begin(session.id, identity.hash, message, config);
        await store.finish(session.id, state.runId, `turn ${index}`, { ...result, clarification: index < 10 ? { question: "型号？" } : null }, { durationMs: 100 });
      }
      const saved = await store.get(session.id, identity.hash);
      assert.equal(saved.history.length, 10);
      assert.equal(saved.history[0].user, "turn 2");
      assert.equal(saved.history[9].user, "turn 11");
      assert.equal(saved.clarification_count, 10);
    });
    await context.test("visitor and global budget checks are enforced in the transactional claim", async () => {
      await assert.rejects(store.begin(session.id, identity.hash, input(), { ...config, visitorHourlyLimit: 1 }), /VISITOR_RATE_LIMIT/);
      const second = await store.session({ hash: "b".repeat(64), expiresAt: identity.expiresAt }, "zh");
      await assert.rejects(store.begin(second.id, "b".repeat(64), input(), { ...config, dailyBudget: 1 }), /DAILY_BUDGET_EXCEEDED/);
    });
    await context.test("interrupted leases become timeout, cancelled requests do not enter history", async () => {
      const interrupted = await store.begin(session.id, identity.hash, input(), config);
      await database.query("UPDATE agent.sessions SET busy_until = now() - interval '1 second' WHERE id=$1", [session.id]);
      const next = await store.begin(session.id, identity.hash, input(), config);
      assert.equal((await store.detail(interrupted.runId)).status, "timeout");
      await assert.rejects(store.finish(session.id, interrupted.runId, "old", result, {}), /RUN_LEASE_LOST/);
      await store.finish(session.id, next.runId, "private", null, { durationMs: 10 }, "CLIENT_DISCONNECTED", "cancelled");
      assert.equal((await store.get(session.id, identity.hash)).history.at(-1).user, "turn 11");
    });
    await context.test("admin pagination, summaries and projected details avoid raw identity/history", async () => {
      const listing = await store.list({ status: "completed", page: 1, pageSize: 5 });
      assert.equal(listing.rows.length, 5);
      assert.equal(listing.summary.total, 13);
      assert.equal(listing.summary.tokens, "25");
      assert.equal(listing.summary.unknown_usage, 12);
      const detail = await store.detail(completedRun);
      assert.deepEqual(detail.result.productIds, ["pv400"]);
      assert.equal(detail.visitor_hash, undefined);
      assert.equal(detail.history, undefined);
      const failed = await store.list({ status: "timeout", page: 1, pageSize: 20 });
      assert.equal(failed.rows.length, 1);
    });
    await context.test("expired session cleanup cascades to associated traces", async () => {
      await database.query("UPDATE agent.sessions SET expires_at = now() - interval '1 second' WHERE id=$1", [session.id]);
      await database.query("DELETE FROM agent.sessions WHERE expires_at <= now()");
      assert.equal((await database.query("SELECT count(*)::int AS count FROM agent.runs WHERE session_id=$1", [session.id])).rows[0].count, 0);
    });
  } finally { await database.close(); }
});
