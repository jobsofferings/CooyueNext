const { randomUUID } = require("crypto");
const { failure } = require("./config");
const { redact } = require("./security");

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
    return session;
  }

  return {
    async session(visitor, locale) {
      return (await pool.query(`INSERT INTO agent.sessions(visitor_hash, locale, expires_at) VALUES ($1, $2, $3)
        ON CONFLICT(visitor_hash, locale) DO UPDATE SET visitor_hash = EXCLUDED.visitor_hash
        RETURNING id, locale, expires_at, clarification_count`, [visitor.hash, locale, visitor.expiresAt])).rows[0];
    },
    get(sessionId, visitorHash) { return owned(pool, sessionId, visitorHash); },
    async begin(sessionId, visitorHash, input, config) {
      return transaction(async (client) => {
        const session = await owned(client, sessionId, visitorHash, true);
        const duplicate = (await client.query("SELECT * FROM agent.runs WHERE session_id = $1 AND request_id = $2", [sessionId, input.requestId])).rows[0];
        if (duplicate) {
          if (duplicate.status === "completed") return { session, replay: duplicate };
          throw failure(duplicate.status === "running" ? "RUN_IN_PROGRESS" : "REQUEST_ALREADY_USED", 409);
        }
        if (session.busy_until && new Date(session.busy_until) > new Date()) throw failure("SESSION_BUSY", 409);
        if (session.active_run) await client.query("UPDATE agent.runs SET status = 'timeout', error_code = 'WORKER_INTERRUPTED', finished_at = now() WHERE id = $1 AND status = 'running'", [session.active_run]);
        await client.query("SELECT pg_advisory_xact_lock(1860030981)");
        const counts = (await client.query(`SELECT count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS daily,
          count(*) FILTER (WHERE visitor_hash = $1 AND created_at > now() - interval '1 hour')::int AS hourly
          FROM agent.runs WHERE created_at >= LEAST(date_trunc('day', now()), now() - interval '1 hour')`, [visitorHash])).rows[0];
        if (counts.daily >= config.dailyBudget) throw failure("DAILY_BUDGET_EXCEEDED", 429);
        if (counts.hourly >= config.visitorHourlyLimit) throw failure("VISITOR_RATE_LIMIT", 429);
        const runId = randomUUID();
        await client.query(`INSERT INTO agent.runs(id, session_id, request_id, visitor_hash, query_preview, model)
          VALUES ($1,$2,$3,$4,$5,$6)`, [runId, sessionId, input.requestId, visitorHash, redact(input.message).slice(0, 160), config.model]);
        await client.query("UPDATE agent.sessions SET active_run = $2, busy_until = now() + ($3 * interval '1 millisecond') WHERE id = $1", [sessionId, runId, config.timeoutMs + 10000]);
        return { session, runId };
      });
    },
    async finish(sessionId, runId, user, result, metrics, errorCode, status = "completed") {
      return transaction(async (client) => {
        const session = (await client.query("SELECT history, clarification_count, active_run FROM agent.sessions WHERE id = $1 FOR UPDATE", [sessionId])).rows[0];
        if (!session || session.active_run !== runId) throw failure("RUN_LEASE_LOST", 409);
        const history = result ? [...session.history, { user: redact(user), result, createdAt: new Date().toISOString() }].slice(-10) : session.history;
        await client.query(`UPDATE agent.runs SET status = $2, result = $3, metrics = $4, error_code = $5, finished_at = now()
          WHERE id = $1 AND status = 'running'`, [runId, status, result ? JSON.stringify(result) : null, JSON.stringify(metrics), errorCode || null]);
        await client.query(`UPDATE agent.sessions SET history = $2, clarification_count = LEAST(10, clarification_count + $3),
          active_run = NULL, busy_until = NULL WHERE id = $1`, [sessionId, JSON.stringify(history), result?.clarification ? 1 : 0]);
      });
    },
    async list({ status, page, pageSize }) {
      const filter = status || null;
      const summary = (await pool.query(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE status = 'failed' OR status = 'timeout')::int AS failures,
        round(avg((metrics->>'durationMs')::numeric)) AS average_ms,
        coalesce(sum((metrics->>'totalTokens')::bigint), 0)::text AS tokens,
        count(*) FILTER (WHERE metrics->>'totalTokens' IS NULL OR metrics->>'usageComplete' = 'false')::int AS unknown_usage
        FROM agent.runs WHERE created_at > now() - interval '30 days' AND ($1::text IS NULL OR status = $1)`, [filter])).rows[0];
      const rows = (await pool.query(`SELECT id, session_id, status, query_preview, model, metrics, error_code, created_at, finished_at
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
