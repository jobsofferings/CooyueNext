const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { createStore } = require("../src/modules/agent/store");
const { publicContexts } = require("../src/modules/agent/contexts");

test("isolated PostgreSQL migrations, session ownership, idempotency, budgets, history, admin queries and retention", async (context) => {
  const database = new PGlite();
  const pool = { query: (sql, values) => typeof sql === "string" ? database.query(sql, values) : database.query(sql.text, sql.values),
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
    const contextsMigration = readFileSync(join(__dirname, "../migrations/products/010_agent_contexts.sql"), "utf8");
    await database.exec(contextsMigration);
    await database.exec(contextsMigration);
    const summariesMigration = readFileSync(join(__dirname, "../migrations/products/011_agent_context_summaries.sql"), "utf8");
    await database.exec(summariesMigration);
    await database.exec(summariesMigration);
    const leasesMigration = readFileSync(join(__dirname, "../migrations/products/012_agent_context_leases.sql"), "utf8");
    await database.exec(leasesMigration);
    await database.exec(leasesMigration);
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
      await store.checkpoint(state.runId, { currentPhase: "model_select", phases: [{ phase: "model_select", status: "running" }] });
      assert.equal((await store.detail(state.runId)).metrics.currentPhase, "model_select");
      await assert.rejects(store.begin(session.id, identity.hash, message, config), /RUN_IN_PROGRESS/);
      await assert.rejects(store.begin(session.id, identity.hash, input(), config), /SESSION_BUSY/);
      await store.finish(session.id, state.runId, message.message, result, { durationMs: 100, totalTokens: 25 });
      await store.checkpoint(state.runId, { currentPhase: "outdated" });
      assert.equal((await store.detail(state.runId)).metrics.totalTokens, 25);
      await store.checkpoint(state.runId, { durationMs: 100, totalTokens: 25, retrieval: "hybrid",
        embedding: { status: "completed", provider: "ark", model: "test-embedding", dimensions: 2048, vectorMatches: 1,
          totalTokens: 5, reason: "partial_or_stale_index", index: { valid: 1, eligible: 2 } },
        phases: [{ phase: "audit", status: "completed" }] }, "completed");
      assert.equal((await store.detail(state.runId)).metrics.phases[0].status, "completed");
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
      await database.query("UPDATE agent.contexts SET busy_until = now() - interval '1 second' WHERE session_id=$1", [session.id]);
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
      assert.equal(listing.summary.hybrid_runs, 1);
      assert.equal(listing.summary.embedding_degraded, 1);
      assert.equal(listing.summary.embedding_tokens, "5");
      const detail = await store.detail(completedRun);
      assert.deepEqual(detail.result.productIds, ["pv400"]);
      assert.equal(detail.visitor_hash, undefined);
      assert.equal(detail.history, undefined);
      assert.equal(detail.metrics.embedding.model, "test-embedding");
      assert.deepEqual(detail.metrics.embedding.index, { valid: 1, eligible: 2 });
      const failed = await store.list({ status: "timeout", page: 1, pageSize: 20 });
      assert.equal(failed.rows.length, 1);
    });
    await context.test("new context preserves history and budgets, isolates prompts and rejects cross-owner/unknown contexts", async () => {
      const previous = await store.get(session.id, identity.hash);
      await assert.rejects(store.newContext(session.id, "b".repeat(64), previous.context_id), /SESSION_NOT_FOUND/);
      await assert.rejects(store.newContext(session.id, identity.hash, randomUUID()), /CONTEXT_NOT_FOUND/);
      const next = await store.newContext(session.id, identity.hash, previous.context_id);
      assert.notEqual(next.context_id, previous.context_id);
      assert.equal(next.clarification_count, 0);
      assert.deepEqual((await store.get(session.id, identity.hash)).history, previous.history);
      assert.equal(new Date(next.expires_at).toISOString(), identity.expiresAt.toISOString());
      assert.equal((await store.session(identity, "zh")).context_id, next.context_id);
      await assert.rejects(store.begin(session.id, identity.hash, { ...input(), contextId: randomUUID() }, config), /CONTEXT_NOT_FOUND/);
      await assert.rejects(store.begin(session.id, identity.hash, input(), { ...config, visitorHourlyLimit: 1 }), /VISITOR_RATE_LIMIT/);
      const oldRequest = (await database.query("SELECT request_id FROM agent.runs WHERE id=$1", [completedRun])).rows[0].request_id;
      await assert.rejects(store.begin(session.id, identity.hash, { ...input(), requestId: oldRequest, contextId: next.context_id }, config), /CONTEXT_CHANGED/);
      const state = await store.begin(session.id, identity.hash, { ...input(), contextId: next.context_id }, config);
      assert.deepEqual(state.session.history, []);
      const finished = await store.finish(session.id, state.runId, "K10", result, { contextTitle: "K10 产品选型" });
      assert.equal(finished.contexts.find((context) => context.id === next.context_id).title, "K10 产品选型");
      const stored = await store.get(session.id, identity.hash);
      assert.equal(stored.history.length, 10);
      assert.equal(stored.history.at(-1).contextId, next.context_id);
      const followup = await store.begin(session.id, identity.hash, { ...input(), contextId: next.context_id }, config);
      assert.equal(followup.session.history.length, 1);
      assert.equal(followup.session.history[0].user, "K10");
      await store.finish(session.id, followup.runId, "more", null, {}, "CLIENT_DISCONNECTED", "cancelled");
    });
    await context.test("switching restores only owned context history, stable titles and clarification counts", async () => {
      const saved = await store.get(session.id, identity.hash);
      const currentId = saved.context_id;
      const previousId = saved.history[0].contextId;
      await assert.rejects(store.activateContext(session.id, "foreign", previousId, currentId), /SESSION_NOT_FOUND/);
      await assert.rejects(store.activateContext(session.id, identity.hash, randomUUID(), currentId), /CONTEXT_NOT_FOUND/);
      const switched = await store.activateContext(session.id, identity.hash, previousId, currentId);
      assert.equal(switched.clarification_count, 10);
      assert.deepEqual(switched.history, saved.history);
      const state = await store.begin(session.id, identity.hash, { ...input(), contextId: previousId }, config);
      assert(state.session.history.every((turn) => turn.contextId === previousId));
      assert(!state.session.history.some((turn) => turn.user === "K10"));
      await store.activateContext(session.id, identity.hash, currentId, previousId);
      await store.finish(session.id, state.runId, "cancel", null, {}, "CLIENT_DISCONNECTED", "cancelled");
      const restored = await store.activateContext(session.id, identity.hash, currentId, previousId);
      assert.equal(restored.clarification_count, 0);
      const followup = await store.begin(session.id, identity.hash, { ...input(), contextId: currentId }, config);
      const finished = await store.finish(session.id, followup.runId, "继续比较", result, { contextTitle: "不替换原来的标题" });
      assert.equal(finished.contexts.find((context) => context.id === currentId).title, "K10 产品选型");
      await assert.rejects(store.begin(session.id, identity.hash, input(), { ...config, visitorHourlyLimit: 1 }), /VISITOR_RATE_LIMIT/);
    });
    await context.test("titles follow ten-turn retention and expired context IDs cannot be reactivated", async () => {
      const visitor = { hash: "retention-visitor", expiresAt: identity.expiresAt };
      const first = await store.session(visitor, "zh");
      const firstRun = await store.begin(first.id, visitor.hash, input(), config);
      await store.finish(first.id, firstRun.runId, "旧需求", result, { contextTitle: "旧需求" });
      const next = await store.newContext(first.id, visitor.hash, first.context_id);
      for (let index = 0; index < 10; index += 1) {
        const state = await store.begin(first.id, visitor.hash, { ...input(), contextId: next.context_id }, config);
        await store.finish(first.id, state.runId, `新需求 ${index}`, result, { contextTitle: "新需求" });
      }
      const retained = await store.get(first.id, visitor.hash);
      assert.equal(retained.history.length, 10);
      assert.deepEqual(publicContexts(retained).map((context) => context.id), [next.context_id]);
      assert.deepEqual(Object.keys(retained.context_summaries), [next.context_id]);
      await assert.rejects(store.activateContext(first.id, visitor.hash, first.context_id, next.context_id), /CONTEXT_NOT_FOUND/);
      await database.exec(summariesMigration);
      assert.equal((await store.get(first.id, visitor.hash)).history.length, 10);
    });
    await context.test("legacy migration preserves existing history and tags its original context", async () => {
      const legacy = randomUUID();
      await database.exec("ALTER TABLE agent.sessions ALTER COLUMN context_id DROP NOT NULL");
      await database.query("INSERT INTO agent.sessions(id, visitor_hash, locale, expires_at, context_id, history) VALUES($1,$2,'zh',$3,NULL,$4)",
        [legacy, "legacy-visitor", identity.expiresAt, JSON.stringify([{ user: "legacy query", result }])]);
      await database.exec(contextsMigration);
      await database.exec(leasesMigration);
      const saved = await store.get(legacy, "legacy-visitor");
      assert.equal(saved.context_id, legacy);
      assert.equal(saved.history[0].user, "legacy query");
      const started = await store.begin(legacy, "legacy-visitor", input(), config);
      assert.equal(started.session.history.length, 1);
      await store.finish(legacy, started.runId, "end", null, {}, "CLIENT_DISCONNECTED", "cancelled");
    });
    await context.test("two contexts run together; switching/new and out-of-order completions never redirect results", async () => {
      const visitor = { hash: "parallel-visitor", expiresAt: identity.expiresAt };
      const first = await store.session(visitor, "zh");
      const firstInput = { ...input(), contextId: first.context_id };
      const firstRun = await store.begin(first.id, visitor.hash, firstInput, config);
      const second = await store.newContext(first.id, visitor.hash, first.context_id);
      const secondRun = await store.begin(first.id, visitor.hash, { ...input(), contextId: second.context_id }, config);
      assert.deepEqual(firstRun.session.history, []);
      assert.deepEqual(secondRun.session.history, []);
      await assert.rejects(store.begin(first.id, visitor.hash, { ...input(), contextId: first.context_id }, config), /SESSION_BUSY/);
      const third = await store.newContext(first.id, visitor.hash, first.context_id);
      await assert.rejects(store.begin(first.id, visitor.hash, { ...input(), contextId: third.context_id }, config), /VISITOR_CONCURRENT_LIMIT/);
      const english = await store.session(visitor, "en");
      await assert.rejects(store.begin(english.id, visitor.hash, { ...input(), contextId: english.context_id }, config), /VISITOR_CONCURRENT_LIMIT/);
      await store.activateContext(first.id, visitor.hash, first.context_id, third.context_id);
      const secondDone = await store.finish(first.id, secondRun.runId, "LE", { ...result, clarification: { remaining: 9 } }, { contextTitle: "LE 选型" });
      assert.equal(secondDone.contextId, second.context_id);
      const firstDone = await store.finish(first.id, firstRun.runId, "K10", result, { contextTitle: "K10 选型" });
      assert(firstDone.revision > secondDone.revision);
      const saved = await store.get(first.id, visitor.hash);
      assert.equal(saved.context_id, first.context_id);
      assert.deepEqual(saved.history.map((turn) => [turn.user, turn.contextId]), [["LE", second.context_id], ["K10", first.context_id]]);
      assert.equal(saved.clarification_count, 0);
      assert.equal((await store.activateContext(first.id, visitor.hash, second.context_id)).clarification_count, 1);
      const replay = await store.begin(first.id, visitor.hash, firstInput, config);
      assert.equal(replay.replay.id, firstRun.runId);
      const followup = await store.begin(first.id, visitor.hash, { ...input(), contextId: first.context_id }, config);
      assert.equal(followup.session.context_id, first.context_id);
      assert.deepEqual(followup.session.history.map((turn) => turn.user), ["K10"]);
      await store.finish(first.id, followup.runId, "more", null, {}, "CLIENT_DISCONNECTED", "cancelled");
      await assert.rejects(store.activateContext(first.id, "foreign", first.context_id), /SESSION_NOT_FOUND/);
    });
    await context.test("lease migration preserves legacy running tasks, counts and history and remains idempotent", async () => {
      const legacy = randomUUID();
      const previousContext = randomUUID();
      const currentContext = randomUUID();
      const runId = randomUUID();
      const history = [{ contextId: previousContext, user: "甲烷", result: { ...result, clarification: { remaining: 4 } } }];
      await database.query(`INSERT INTO agent.sessions(id, visitor_hash, locale, expires_at, context_id, history, clarification_count, active_run, busy_until)
        VALUES($1,'legacy-running','zh',$2,$3,$4,3,$5,now() + interval '1 minute')`,
      [legacy, identity.expiresAt, currentContext, JSON.stringify(history), runId]);
      await database.query(`INSERT INTO agent.runs(id, session_id, request_id, visitor_hash, query_preview, model, metrics)
        VALUES($1,$2,$3,'legacy-running','K10','mock',$4)`, [runId, legacy, randomUUID(), JSON.stringify({ contextId: currentContext })]);
      await database.exec(leasesMigration);
      await database.exec(leasesMigration);
      const saved = await store.get(legacy, "legacy-running");
      assert.equal(saved.active_run, null);
      assert.equal(saved.open_contexts.find((context) => context.id === currentContext).active_run, runId);
      assert.equal(saved.open_contexts.find((context) => context.id === previousContext).clarification_count, 6);
      assert.deepEqual(saved.history, history);
      await store.activateContext(legacy, "legacy-running", previousContext);
      await store.finish(legacy, runId, "K10", result, {});
      const completed = await store.get(legacy, "legacy-running");
      assert.equal(completed.context_id, previousContext);
      assert.equal(completed.history.at(-1).contextId, currentContext);
      assert.equal(completed.clarification_count, 6);
    });
    await context.test("empty context creation is bounded without blocking existing conversations", async () => {
      const visitor = { hash: "empty-visitor", expiresAt: identity.expiresAt };
      const session = await store.session(visitor, "zh");
      for (let index = 0; index < 19; index += 1) await store.newContext(session.id, visitor.hash, session.context_id);
      await assert.rejects(store.newContext(session.id, visitor.hash, session.context_id), /CONTEXT_LIMIT/);
      await store.activateContext(session.id, visitor.hash, session.context_id);
      const state = await store.begin(session.id, visitor.hash, { ...input(), contextId: session.context_id }, config);
      await store.finish(session.id, state.runId, "K10", result, {});
      assert.ok((await store.newContext(session.id, visitor.hash, session.context_id)).context_id);
    });
    await context.test("expired session cleanup cascades to associated traces", async () => {
      await database.query("UPDATE agent.sessions SET expires_at = now() - interval '1 second' WHERE id=$1", [session.id]);
      await database.query("DELETE FROM agent.sessions WHERE expires_at <= now()");
      assert.equal((await database.query("SELECT count(*)::int AS count FROM agent.runs WHERE session_id=$1", [session.id])).rows[0].count, 0);
      assert.equal((await database.query("SELECT count(*)::int AS count FROM agent.contexts WHERE session_id=$1", [session.id])).rows[0].count, 0);
    });
  } finally { await database.close(); }
});
