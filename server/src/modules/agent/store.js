const { randomUUID } = require("crypto");
const { failure } = require("./config");
const { redact } = require("./security");
const { contextTitle, contextsOf, contextMetadata, publicContexts } = require("./contexts");

function createStore(pool) {
  async function transaction(operation) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '4000ms'");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async function owned(client, sessionId, visitorHash, lock = false) {
    const session = (await client.query(`SELECT * FROM agent.sessions WHERE id = $1 AND visitor_hash = $2 AND expires_at > now()${lock ? " FOR UPDATE" : ""}`, [sessionId, visitorHash])).rows[0];
    if (!session) throw failure("SESSION_NOT_FOUND", 404);
    session.open_contexts = (await client.query("SELECT * FROM agent.contexts WHERE session_id = $1 ORDER BY created_at DESC", [sessionId])).rows;
    return session;
  }

  return {
    async session(visitor, locale) {
      return transaction(async (client) => {
        const session = (await client.query(`INSERT INTO agent.sessions(visitor_hash, locale, expires_at) VALUES ($1, $2, $3)
          ON CONFLICT(visitor_hash, locale) DO UPDATE SET visitor_hash = EXCLUDED.visitor_hash
          RETURNING id, locale, expires_at, clarification_count, context_id`, [visitor.hash, locale, visitor.expiresAt])).rows[0];
        await client.query("INSERT INTO agent.contexts(id, session_id) VALUES($1,$2) ON CONFLICT(id) DO NOTHING", [session.context_id, session.id]);
        return session;
      });
    },
    get(sessionId, visitorHash) { return owned(pool, sessionId, visitorHash); },
    async newContext(sessionId, visitorHash, expectedContext) {
      return transaction(async (client) => {
        const session = await owned(client, sessionId, visitorHash, true);
        if (!session.open_contexts.some((context) => context.id === expectedContext)) throw failure("CONTEXT_NOT_FOUND", 404);
        if (session.open_contexts.filter((context) => !context.has_history).length >= 20) throw failure("CONTEXT_LIMIT", 429);
        const contextId = randomUUID();
        await client.query("INSERT INTO agent.contexts(id, session_id) VALUES($1,$2)", [contextId, sessionId]);
        await client.query("UPDATE agent.sessions SET context_id = $2, clarification_count = 0, context_revision = context_revision + 1 WHERE id = $1", [sessionId, contextId]);
        return owned(client, sessionId, visitorHash);
      });
    },
    async activateContext(sessionId, visitorHash, contextId) {
      return transaction(async (client) => {
        const session = await owned(client, sessionId, visitorHash, true);
        const target = contextsOf(session).find((context) => context.id === contextId);
        if (!target) throw failure("CONTEXT_NOT_FOUND", 404);
        await client.query("UPDATE agent.sessions SET context_id = $2, clarification_count = $3 WHERE id = $1", [sessionId, contextId, target.clarificationCount]);
        return { ...session, context_id: contextId, clarification_count: target.clarificationCount };
      });
    },
    async checkpoint(runId, metrics, status = "running") {
      await pool.query({ text: "UPDATE agent.runs SET metrics = metrics || $2::jsonb WHERE id = $1 AND status = $3", values: [runId, JSON.stringify(metrics), status], query_timeout: 4000 });
    },
    async begin(sessionId, visitorHash, input, config) {
      return transaction(async (client) => {
        const session = await owned(client, sessionId, visitorHash, true);
        const contextId = input.contextId || session.context_id;
        const context = session.open_contexts.find((entry) => entry.id === contextId);
        if (!context) throw failure("CONTEXT_NOT_FOUND", 404);
        const scoped = { ...session, context_id: contextId, clarification_count: context.clarification_count,
          history: session.history.filter((turn) => (turn.contextId || session.id) === contextId) };
        const duplicate = (await client.query("SELECT * FROM agent.runs WHERE session_id = $1 AND request_id = $2", [sessionId, input.requestId])).rows[0];
        if (duplicate) {
          if ((duplicate.metrics.contextId || session.id) !== contextId) throw failure("CONTEXT_CHANGED", 409);
          if (duplicate.status === "completed") return { session: scoped, replay: duplicate };
          throw failure(duplicate.status === "running" ? "RUN_IN_PROGRESS" : "REQUEST_ALREADY_USED", 409);
        }
        if (context.busy_until && new Date(context.busy_until) > new Date()) throw failure("SESSION_BUSY", 409);
        if (context.active_run) await client.query("UPDATE agent.runs SET status = 'timeout', error_code = 'WORKER_INTERRUPTED', finished_at = now() WHERE id = $1 AND status = 'running'", [context.active_run]);
        await client.query("SELECT pg_advisory_xact_lock(1860030981)");
        const concurrent = (await client.query(`SELECT count(*)::int AS total FROM agent.contexts context
          JOIN agent.sessions session ON session.id = context.session_id
          WHERE session.visitor_hash = $1 AND session.expires_at > now() AND context.busy_until > now()`, [visitorHash])).rows[0].total;
        if (concurrent >= 2) throw failure("VISITOR_CONCURRENT_LIMIT", 429);
        const counts = (await client.query(`SELECT count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS daily,
          count(*) FILTER (WHERE visitor_hash = $1 AND created_at > now() - interval '1 hour')::int AS hourly
          FROM agent.runs WHERE created_at >= LEAST(date_trunc('day', now()), now() - interval '1 hour')`, [visitorHash])).rows[0];
        if (counts.daily >= config.dailyBudget) throw failure("DAILY_BUDGET_EXCEEDED", 429);
        if (counts.hourly >= config.visitorHourlyLimit) throw failure("VISITOR_RATE_LIMIT", 429);
        const runId = randomUUID();
        await client.query(`INSERT INTO agent.runs(id, session_id, request_id, visitor_hash, query_preview, model, metrics)
          VALUES ($1,$2,$3,$4,$5,$6,$7)`, [runId, sessionId, input.requestId, visitorHash, redact(input.message).slice(0, 160), config.model, JSON.stringify({ contextId })]);
        await client.query("UPDATE agent.contexts SET active_run = $2, busy_until = now() + ($3 * interval '1 millisecond') WHERE id = $1", [contextId, runId, config.timeoutMs + 10000]);
        await client.query("UPDATE agent.sessions SET context_revision = context_revision + 1 WHERE id = $1", [sessionId]);
        return { session: scoped, runId };
      });
    },
    async finish(sessionId, runId, user, result, metrics, errorCode, status = "completed") {
      return transaction(async (client) => {
        const session = (await client.query("SELECT * FROM agent.sessions WHERE id = $1 FOR UPDATE", [sessionId])).rows[0];
        if (!session) throw failure("RUN_LEASE_LOST", 409);
        session.open_contexts = (await client.query("SELECT * FROM agent.contexts WHERE session_id = $1", [sessionId])).rows;
        const context = session.open_contexts.find((entry) => entry.active_run === runId);
        if (!context || new Date(context.busy_until) <= new Date()) throw failure("RUN_LEASE_LOST", 409);
        const contextId = context.id;
        const history = result ? [...session.history, { user: redact(user), result, contextId, createdAt: new Date().toISOString() }].slice(-10) : session.history;
        await client.query(`UPDATE agent.runs SET status = $2, result = $3, metrics = $4, error_code = $5, finished_at = now()
          WHERE id = $1 AND status = 'running'`, [runId, status, result ? JSON.stringify(result) : null, JSON.stringify({ ...metrics, contextId }), errorCode || null]);
        context.clarification_count = Math.min(10, context.clarification_count + (result?.clarification ? 1 : 0));
        context.active_run = null;
        const updated = { ...session, history, clarification_count: session.context_id === contextId ? context.clarification_count : session.clarification_count };
        updated.context_summaries = contextMetadata(updated);
        if (result && !context.has_history) {
          updated.context_summaries[contextId].title = contextTitle(metrics.contextTitle || result.query || user, session.locale);
        }
        await client.query("UPDATE agent.contexts SET active_run = NULL, busy_until = NULL, clarification_count = $2, has_history = has_history OR $3 WHERE id = $1",
          [contextId, context.clarification_count, Boolean(result)]);
        await client.query(`UPDATE agent.sessions SET history = $2, clarification_count = $3, context_summaries = $4,
          active_run = NULL, busy_until = NULL, context_revision = context_revision + 1 WHERE id = $1`, [sessionId, JSON.stringify(history), updated.clarification_count, JSON.stringify(updated.context_summaries)]);
        await client.query(`DELETE FROM agent.contexts WHERE session_id = $1 AND has_history AND active_run IS NULL AND id <> $2
          AND NOT (id = ANY($3::uuid[]))`, [sessionId, session.context_id, history.map((turn) => turn.contextId || session.id)]);
        const saved = await owned(client, sessionId, session.visitor_hash);
        return { contextId, contexts: publicContexts(saved), revision: saved.context_revision };
      });
    },
    async list({ status, page, pageSize }) {
      const filter = status || null;
      const summary = (await pool.query(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE status = 'failed' OR status = 'timeout')::int AS failures,
        round(avg((metrics->>'durationMs')::numeric)) AS average_ms,
        coalesce(sum((metrics->>'totalTokens')::bigint), 0)::text AS tokens,
        count(*) FILTER (WHERE metrics->>'totalTokens' IS NULL OR metrics->>'usageComplete' = 'false')::int AS unknown_usage,
        count(*) FILTER (WHERE metrics->>'retrieval' = 'hybrid')::int AS hybrid_runs,
        count(*) FILTER (WHERE metrics->'embedding'->>'reason' IN ('embedding_unavailable', 'index_unavailable', 'index_missing_or_stale', 'partial_or_stale_index'))::int AS embedding_degraded,
        coalesce(sum((metrics->'embedding'->>'totalTokens')::bigint), 0)::text AS embedding_tokens
        FROM agent.runs WHERE created_at > now() - interval '30 days' AND ($1::text IS NULL OR status = $1)`, [filter])).rows[0];
      const rows = (await pool.query(`SELECT id, session_id, request_id, status, query_preview, model, metrics, error_code, created_at, finished_at
        FROM agent.runs WHERE created_at > now() - interval '30 days' AND ($1::text IS NULL OR status = $1)
        ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [filter, pageSize, (page - 1) * pageSize])).rows;
      return { rows, summary, page, pageSize };
    },
    async detail(id) {
      const row = (await pool.query(`SELECT id, session_id, request_id, status, query_preview, model, metrics, error_code, created_at, finished_at,
        jsonb_build_object('status', result->'status', 'query', result->'query', 'retrieval', result->'retrieval',
          'productIds', (SELECT jsonb_agg(item->'id') FROM jsonb_array_elements(coalesce(result->'products', '[]')) item),
          'newsIds', (SELECT jsonb_agg(item->'id') FROM jsonb_array_elements(coalesce(result->'news', '[]')) item)) AS result
        FROM agent.runs WHERE id = $1 AND created_at > now() - interval '30 days'`, [id])).rows[0];
      if (!row) throw failure("RUN_NOT_FOUND", 404);
      return row;
    },
  };
}

module.exports = { createStore };
