const express = require("express");
const { randomUUID } = require("crypto");
const rateLimit = require("express-rate-limit");
const { getProductsPool } = require("../../config/db");
const { failure, getConfig, integer, validateConfig } = require("./config");
const { UUID, messageInput, requireProxy, visitor } = require("./security");
const { createStore } = require("./store");
const { execute } = require("./service");
const { refreshResult, loadContent } = require("./content");
const { createTrace, diagnostic } = require("./trace");
const { publicResult } = require("./presentation");
const { publicContexts } = require("./contexts");

function createRouters(dependencies = {}) {
  const publicRouter = express.Router();
  const adminRouter = express.Router();
  const resolvePool = dependencies.resolvePool || getProductsPool;
  const configOf = dependencies.configOf || getConfig;
  const storeOf = dependencies.storeOf || createStore;
  const run = dependencies.execute || execute;
  let active = 0;
  const safe = (operation) => async (req, res) => {
    try { await operation(req, res); }
    catch (error) {
      console.warn("[agent:request]", { requestId: req.agentRequestId, action: req.method, ...diagnostic(error) });
      if (!res.headersSent) res.status(error.status || 503).json({ ok: false, error: error.status ? error.code : "AGENT_UNAVAILABLE", requestId: req.agentRequestId });
    }
  };
  publicRouter.use((req, res, next) => {
    req.agentRequestId = UUID.test(req.body?.requestId || "") ? req.body.requestId : randomUUID();
    res.set("x-agent-request-id", req.agentRequestId);
    try {
      const config = configOf();
      validateConfig(config);
      requireProxy(req, config);
      res.set("Cache-Control", "no-store");
      req.agentConfig = config;
      next();
    } catch (error) {
      console.warn("[agent:request]", { requestId: req.agentRequestId, phase: "access", ...diagnostic(error) });
      res.status(error.status || 503).json({ ok: false, error: error.code || "AGENT_UNAVAILABLE", requestId: req.agentRequestId });
    }
  });
  publicRouter.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: true, legacyHeaders: false,
    message: { ok: false, error: "AGENT_ENTRY_RATE_LIMIT" } }));

  publicRouter.post("/sessions", safe(async (req, res) => {
    if (!req.body || !["zh", "en"].includes(req.body.locale) || Object.keys(req.body).length !== 1) throw failure("INVALID_LOCALE");
    const identity = visitor(req, res, req.agentConfig, true);
    const store = storeOf(await resolvePool());
    const session = await store.session(identity, req.body.locale);
    res.json({ ok: true, data: { id: session.id, locale: session.locale, contextId: session.context_id, expiresAt: session.expires_at, clarificationCount: session.clarification_count } });
  }));

  publicRouter.post("/sessions/:id/contexts", rateLimit({ windowMs: 60000, limit: 10, standardHeaders: true, legacyHeaders: false,
    message: { ok: false, error: "CONTEXT_RATE_LIMIT" } }), safe(async (req, res) => {
    if (!UUID.test(req.params.id) || !req.body || Array.isArray(req.body) || Object.keys(req.body).length !== 1
      || typeof req.body.contextId !== "string" || !UUID.test(req.body.contextId)) throw failure("INVALID_CONTEXT");
    const identity = visitor(req, res, req.agentConfig);
    const session = await storeOf(await resolvePool()).newContext(req.params.id, identity.hash, req.body.contextId);
    res.json({ ok: true, data: { id: session.id, locale: session.locale, contextId: session.context_id, contexts: publicContexts(session), revision: session.context_revision, expiresAt: session.expires_at, clarificationCount: session.clarification_count } });
  }));

  publicRouter.post("/sessions/:id/contexts/:contextId/activate", rateLimit({ windowMs: 60000, limit: 90, standardHeaders: true, legacyHeaders: false,
    message: { ok: false, error: "CONTEXT_RATE_LIMIT" } }), safe(async (req, res) => {
    if (!UUID.test(req.params.id) || !UUID.test(req.params.contextId) || !req.body || Array.isArray(req.body) || Object.keys(req.body).length !== 1
      || typeof req.body.contextId !== "string" || !UUID.test(req.body.contextId)) throw failure("INVALID_CONTEXT");
    const identity = visitor(req, res, req.agentConfig);
    const session = await storeOf(await resolvePool()).activateContext(req.params.id, identity.hash, req.params.contextId, req.body.contextId);
    res.json({ ok: true, data: { id: session.id, contextId: session.context_id } });
  }));

  publicRouter.get("/sessions/:id", safe(async (req, res) => {
    if (!UUID.test(req.params.id)) throw failure("SESSION_NOT_FOUND", 404);
    const identity = visitor(req, res, req.agentConfig);
    const pool = await resolvePool();
    const session = await storeOf(pool).get(req.params.id, identity.hash);
    const activeHistory = session.history;
    const snapshot = activeHistory.some((turn) => turn.result.products.length || turn.result.news.length)
      ? await loadContent(pool, req.agentConfig, session.locale, AbortSignal.timeout(8000)) : null;
    const history = activeHistory.map((turn) => {
      const products = turn.result.products.filter((product) => snapshot?.items.some((item) => item.key === `product:${product.id}` && item.card.version === product.version));
      const news = turn.result.news.filter((item) => snapshot?.items.some((entry) => entry.key === `news:${item.id}`));
      const changed = products.length !== turn.result.products.length || news.length !== turn.result.news.length;
      return { ...turn, contextId: turn.contextId || session.id, result: publicResult({ ...turn.result, products, news, message: changed ? (session.locale === "zh" ? "部分内容已更新或下架，请重新搜索。" : "Some content has changed. Please search again.") : turn.result.message }) };
    });
    res.json({ ok: true, data: { id: session.id, locale: session.locale, contextId: session.context_id, history, contexts: publicContexts(session), revision: session.context_revision, expiresAt: session.expires_at, clarificationCount: session.clarification_count } });
  }));

  publicRouter.post("/sessions/:id/messages", safe(async (req, res) => {
    if (!UUID.test(req.params.id)) throw failure("SESSION_NOT_FOUND", 404);
    const input = messageInput(req.body);
    const config = req.agentConfig;
    const identity = visitor(req, res, config);
    if (active >= config.maxConcurrent) throw failure("AGENT_BUSY", 429);
    active += 1;
    const controller = new AbortController();
    let state;
    let store;
    let heartbeat;
    let checkpointPending = false;
    let checkpointWrite = Promise.resolve();
    const startedAt = Date.now();
    const metrics = { requestId: input.requestId, timeoutMs: config.timeoutMs, phases: [], streamEvents: 0, streamBytes: 0 };
    const log = (event) => console.info("[agent:trace]", { requestId: input.requestId, runId: state?.runId, ...event });
    const checkpoint = () => {
      if (!store?.checkpoint || !state?.runId || state.finished || res.writableEnded || checkpointPending) return;
      checkpointPending = true;
      checkpointWrite = store.checkpoint(state.runId, structuredClone(metrics))
        .catch(() => log({ phase: "checkpoint", status: "failed", code: "AUDIT_WRITE_FAILED" }))
        .finally(() => { checkpointPending = false; });
    };
    const trace = createTrace(metrics, { startedAt, onChange: checkpoint, log });
    const timeout = setTimeout(() => {
      controller.abort(failure("RUN_TIMEOUT", 504));
      if (res.destroyed || res.writableEnded) return;
      const details = { code: "RUN_TIMEOUT", phase: metrics.currentPhase, requestId: input.requestId, runId: state?.runId };
      if (res.headersSent) { res.write(`event: error\ndata: ${JSON.stringify(details)}\n\n`); res.end(); }
      else res.status(504).json({ ok: false, error: "RUN_TIMEOUT", ...details });
    }, config.timeoutMs);
    const onClose = () => { if (!res.writableEnded) controller.abort(failure("CLIENT_DISCONNECTED", 499)); };
    res.on("close", onClose);
    const emit = (event, data) => {
      if (!res.destroyed && !res.writableEnded && !controller.signal.aborted) {
        if (res.writableLength > 131072) { controller.abort(failure("SLOW_CLIENT", 499)); return; }
        const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        metrics.streamEvents += 1;
        metrics.streamBytes += Buffer.byteLength(frame);
        if (metrics.firstEventMs == null) metrics.firstEventMs = Date.now() - startedAt;
        res.write(frame);
        res.flush?.();
      }
    };
    try {
      const pool = await trace.step("database_connect", () => resolvePool(), { signal: controller.signal, timeoutMs: 6000 });
      store = storeOf(pool);
      state = await trace.step("session_claim", () => store.begin(req.params.id, identity.hash, input, config), { signal: controller.signal, timeoutMs: 6000 });
      metrics.contextId = state.session.context_id;
      metrics.contextTurns = state.session.history.length;
      controller.signal.throwIfAborted();
      res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", "Content-Encoding": "identity", "X-Accel-Buffering": "no", Connection: "keep-alive" });
      res.socket?.setNoDelay(true);
      res.flushHeaders();
      heartbeat = setInterval(() => {
        emit("progress", { phase: metrics.currentPhase, elapsedMs: Date.now() - startedAt });
        checkpoint();
      }, 2000);
      emit("meta", { runId: state.runId || state.replay.id, requestId: input.requestId, sessionId: state.session.id, replay: Boolean(state.replay) });
      emit("status", { phase: "accepted" });
      checkpoint();
      if (state.replay) {
        const result = await trace.step("refresh", (phaseSignal) => refreshResult(state.replay.result, pool, config, state.session.locale, phaseSignal, trace), { signal: controller.signal });
        emit("message_delta", { delta: publicResult(result).message });
        emit("results", publicResult(result));
        const saved = await store.get(state.session.id, identity.hash);
        emit("context", { contextId: state.session.context_id, contexts: publicContexts(saved), revision: saved.context_revision });
      } else {
        let result = await run({ pool, config, session: state.session, message: input.message, signal: controller.signal, emit, metrics, trace });
        if (!dependencies.skipRefresh) result = await trace.step("refresh", (phaseSignal) => refreshResult(result, pool, config, state.session.locale, phaseSignal, trace), { signal: controller.signal });
        controller.signal.throwIfAborted();
        metrics.durationMs = Date.now() - startedAt;
        emit("status", { phase: "saving" });
        await checkpointWrite;
        await trace.step("audit", async () => {
          const context = await store.finish(state.session.id, state.runId, input.message, result, metrics);
          state.finished = true;
          if (context) emit("context", context);
        }, { timeoutMs: 8000 });
        await checkpointWrite;
        await store.checkpoint?.(state.runId, metrics, "completed").catch(() => log({ phase: "audit", code: "METRICS_FINALIZE_FAILED" }));
        emit("results", publicResult(result));
      }
      emit("done", { ok: true });
      log({ phase: "delivery", status: "completed", durationMs: Date.now() - startedAt, streamEvents: metrics.streamEvents, streamBytes: metrics.streamBytes });
      res.end();
      if (state.finished && store.checkpoint) {
        metrics.deliveryCompleted = true;
        metrics.durationMs = Date.now() - startedAt;
        await store.checkpoint(state.runId, metrics, "completed").catch(() => log({ phase: "delivery", code: "METRICS_FINALIZE_FAILED" }));
      }
    } catch (error) {
      const reason = controller.signal.aborted ? controller.signal.reason : error;
      const code = reason?.status && /^[A-Z_]+$/.test(reason.code || "") ? reason.code : "AGENT_UPSTREAM_ERROR";
      metrics.durationMs = Date.now() - startedAt;
      metrics.error = { ...diagnostic(reason), phase: reason.agentPhase || metrics.currentPhase };
      metrics.usageComplete = metrics.usageReports === (metrics.modelCalls || 0) + (metrics.embeddingCalls || 0);
      log({ phase: metrics.error.phase, status: "failed", ...metrics.error });
      if (state?.runId && !state.finished) {
        await checkpointWrite;
        await store.finish(state.session.id, state.runId, input.message, null, metrics, code,
          /TIMEOUT/.test(code) ? "timeout" : controller.signal.aborted ? "cancelled" : "failed")
          .catch(() => console.error("[agent:audit]", { runId: state.runId, code: "AUDIT_WRITE_FAILED" }));
      }
      if (res.headersSent) {
        if (!res.destroyed && !res.writableEnded) { res.write(`event: error\ndata: ${JSON.stringify({ code, phase: metrics.error.phase, runId: state?.runId, requestId: input.requestId })}\n\n`); res.end(); }
      } else if (!res.destroyed && !res.writableEnded) res.status(reason?.status && reason.status !== 499 ? reason.status : 503).json({ ok: false, error: code, phase: metrics.error.phase, requestId: input.requestId });
    } finally {
      clearTimeout(timeout);
      clearInterval(heartbeat);
      res.off("close", onClose);
      active -= 1;
    }
  }));
  publicRouter.use((_req, res) => res.status(404).json({ ok: false, error: "NOT_FOUND" }));

  adminRouter.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (req.currentUser?.access !== "admin") return res.status(401).json({ ok: false, error: "Unauthorized" });
    next();
  });
  adminRouter.get("/runs", safe(async (req, res) => {
    const status = req.query.status || null;
    if (status && !["running", "completed", "failed", "timeout", "cancelled"].includes(status)) throw failure("INVALID_STATUS");
    const data = await storeOf(await resolvePool()).list({ status, page: integer(req.query.page, 1, 1, 10000), pageSize: integer(req.query.pageSize, 20, 1, 100) });
    res.json({ ok: true, data });
  }));
  adminRouter.get("/runs/:id", safe(async (req, res) => {
    if (!UUID.test(req.params.id)) throw failure("RUN_NOT_FOUND", 404);
    res.json({ ok: true, data: await storeOf(await resolvePool()).detail(req.params.id) });
  }));
  return { publicRouter, adminRouter };
}

module.exports = { ...createRouters(), createRouters };
