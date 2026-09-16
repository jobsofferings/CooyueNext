const express = require("express");
const rateLimit = require("express-rate-limit");
const { getProductsPool } = require("../../config/db");
const { failure, getConfig, integer, validateConfig } = require("./config");
const { UUID, messageInput, requireProxy, visitor } = require("./security");
const { createStore } = require("./store");
const { execute } = require("./service");
const { refreshResult, loadContent } = require("./content");

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
      if (!res.headersSent) res.status(error.status || 503).json({ ok: false, error: error.status ? error.code : "AGENT_UNAVAILABLE" });
    }
  };
  publicRouter.use((req, res, next) => {
    try {
      const config = configOf();
      validateConfig(config);
      requireProxy(req, config);
      res.set("Cache-Control", "no-store");
      req.agentConfig = config;
      next();
    } catch (error) { res.status(error.status || 503).json({ ok: false, error: error.code || "AGENT_UNAVAILABLE" }); }
  });
  publicRouter.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: true, legacyHeaders: false,
    message: { ok: false, error: "AGENT_ENTRY_RATE_LIMIT" } }));

  publicRouter.post("/sessions", safe(async (req, res) => {
    if (!req.body || !["zh", "en"].includes(req.body.locale) || Object.keys(req.body).length !== 1) throw failure("INVALID_LOCALE");
    const identity = visitor(req, res, req.agentConfig, true);
    const store = storeOf(await resolvePool());
    const session = await store.session(identity, req.body.locale);
    res.json({ ok: true, data: { id: session.id, locale: session.locale, expiresAt: session.expires_at, clarificationCount: session.clarification_count } });
  }));

  publicRouter.get("/sessions/:id", safe(async (req, res) => {
    if (!UUID.test(req.params.id)) throw failure("SESSION_NOT_FOUND", 404);
    const identity = visitor(req, res, req.agentConfig);
    const pool = await resolvePool();
    const session = await storeOf(pool).get(req.params.id, identity.hash);
    const snapshot = session.history.length ? await loadContent(pool, req.agentConfig, session.locale, AbortSignal.timeout(8000)) : null;
    const history = session.history.map((turn) => {
      const products = turn.result.products.filter((product) => snapshot?.items.some((item) => item.key === `product:${product.id}` && item.card.version === product.version));
      const news = turn.result.news.filter((item) => snapshot?.items.some((entry) => entry.key === `news:${item.id}`));
      const changed = products.length !== turn.result.products.length || news.length !== turn.result.news.length;
      return { ...turn, result: { ...turn.result, products, news, message: changed ? (session.locale === "zh" ? "部分内容已更新或下架，请重新搜索。" : "Some content has changed. Please search again.") : turn.result.message } };
    });
    res.json({ ok: true, data: { id: session.id, locale: session.locale, history, expiresAt: session.expires_at, clarificationCount: session.clarification_count } });
  }));

  publicRouter.post("/sessions/:id/messages", safe(async (req, res) => {
    if (!UUID.test(req.params.id)) throw failure("SESSION_NOT_FOUND", 404);
    const input = messageInput(req.body);
    const config = req.agentConfig;
    const identity = visitor(req, res, config);
    if (active >= config.maxConcurrent) throw failure("AGENT_BUSY", 429);
    active += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort(failure("RUN_TIMEOUT", 504));
      if (res.destroyed || res.writableEnded) return;
      if (res.headersSent) { res.write('event: error\ndata: {"code":"RUN_TIMEOUT"}\n\n'); res.end(); }
      else res.status(504).json({ ok: false, error: "RUN_TIMEOUT" });
    }, config.timeoutMs);
    const onClose = () => { if (!res.writableEnded) controller.abort(failure("CLIENT_DISCONNECTED", 499)); };
    res.on("close", onClose);
    let state;
    let store;
    let heartbeat;
    const startedAt = Date.now();
    const metrics = {};
    const emit = (event, data) => {
      if (!res.destroyed && !res.writableEnded && !controller.signal.aborted) {
        if (res.writableLength > 131072) { controller.abort(failure("SLOW_CLIENT", 499)); return; }
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };
    try {
      const pool = await resolvePool();
      store = storeOf(pool);
      state = await store.begin(req.params.id, identity.hash, input, config);
      controller.signal.throwIfAborted();
      res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no", Connection: "keep-alive" });
      res.flushHeaders();
      heartbeat = setInterval(() => { if (!res.destroyed && !controller.signal.aborted) res.write(": heartbeat\n\n"); }, 10000);
      emit("meta", { runId: state.runId || state.replay.id, sessionId: state.session.id, replay: Boolean(state.replay) });
      if (state.replay) {
        const result = await refreshResult(state.replay.result, pool, config, state.session.locale, controller.signal);
        emit("message_delta", { delta: result.message });
        emit("results", result);
      } else {
        let result = await run({ pool, config, session: state.session, message: input.message, signal: controller.signal, emit, metrics });
        if (!dependencies.skipRefresh) result = await refreshResult(result, pool, config, state.session.locale, controller.signal);
        controller.signal.throwIfAborted();
        metrics.durationMs = Date.now() - startedAt;
        await store.finish(state.session.id, state.runId, input.message, result, metrics);
        state.finished = true;
        emit("results", result);
      }
      emit("done", { ok: true });
      res.end();
    } catch (error) {
      const reason = controller.signal.aborted ? controller.signal.reason : error;
      const code = reason?.status && /^[A-Z_]+$/.test(reason.code || "") ? reason.code : "AGENT_UPSTREAM_ERROR";
      metrics.durationMs = Date.now() - startedAt;
      if (state?.runId && !state.finished) {
        await store.finish(state.session.id, state.runId, input.message, null, metrics, code,
          code === "RUN_TIMEOUT" ? "timeout" : controller.signal.aborted ? "cancelled" : "failed")
          .catch(() => console.error("[agent:audit]", { runId: state.runId, code: "AUDIT_WRITE_FAILED" }));
      }
      if (res.headersSent) {
        if (!res.destroyed && !res.writableEnded) { res.write(`event: error\ndata: ${JSON.stringify({ code })}\n\n`); res.end(); }
      } else if (!res.destroyed) res.status(reason?.status && reason.status !== 499 ? reason.status : 503).json({ ok: false, error: code });
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
