const { createProvider } = require("./provider");
const { searchPublicContent } = require("./search");
const { redact } = require("./security");
const { createTrace, diagnostic } = require("./trace");
const { contextTitle } = require("./contexts");

function emptyMessage(locale) {
  return locale === "zh" ? "当前资料没有确认符合条件的产品" : "The current evidence does not confirm products matching these requirements.";
}

async function execute({ pool, config, session, message, signal, emit, provider = createProvider({ ...config, locale: session.locale }), search = searchPublicContent, metrics, trace = createTrace(metrics) }) {
  const started = Date.now();
  metrics.modelCalls = 0;
  metrics.toolCalls = 0;
  metrics.embeddingCalls = 0;
  metrics.totalTokens = null;
  metrics.usageReports = 0;
  metrics.events = [];
  const usage = (value) => {
    if (Number.isFinite(value?.total_tokens)) {
      metrics.totalTokens = (metrics.totalTokens || 0) + value.total_tokens;
      metrics.usageReports += 1;
    }
  };
  emit("status", { phase: "understanding" });
  metrics.modelCalls += 1;
  let selection;
  try {
    selection = await trace.step("model_select", (phaseSignal, mark) => provider.select(session.history, message, phaseSignal, usage, mark),
      { signal, timeoutMs: config.selectTimeoutMs || 18000 });
  } catch (error) {
    if (signal.aborted || /^INVALID_TOOL|TOOL_BUDGET/.test(error.code || "")) throw error;
    metrics.selectionFallback = diagnostic(error);
    selection = { input: { query: message, type: /新闻|指南|文章|\bnews\b|\bguide\b/i.test(message) ? "news" : "all" }, fallback: true };
    emit("status", { phase: "search_fallback", code: metrics.selectionFallback.code });
  }
  signal.throwIfAborted();
  emit("status", { phase: "searching" });
  metrics.toolCalls += 1;
  const searchStarted = Date.now();
  const searchProvider = { ...provider, async embed(texts, phaseSignal) {
    metrics.embeddingCalls += 1;
    return trace.step("embedding", (embeddingSignal) => provider.embed(texts, embeddingSignal), { signal: phaseSignal, timeoutMs: 4000 });
  } };
  const previous = session.history.at(-1)?.result;
  const result = await trace.step("search", (phaseSignal) => search({ pool, config, provider: searchProvider, input: selection.input, message,
    previousQuery: previous?.query, previousConditions: previous?.constraints, locale: session.locale, signal: phaseSignal, onUsage: usage, trace }), { signal, timeoutMs: 12000 });
  if (selection.fallback) result.retrieval = { ...result.retrieval, degraded: true, understandingFallback: true };
  if (!session.history.length) metrics.contextTitle = contextTitle(selection.input.title || result.query || message, session.locale);
  signal.throwIfAborted();
  metrics.events.push({ tool: "search_public_content", durationMs: Date.now() - searchStarted, products: result.products.length, news: result.news.length, retrieval: result.retrieval });
  metrics.retrieval = result.retrieval.mode;
  metrics.productCount = result.products.length;
  metrics.newsCount = result.news.length;
  let explanation = "";
  const text = (delta) => {
    if (signal.aborted) return;
    if (metrics.firstTextMs == null) metrics.firstTextMs = Date.now() - started;
    explanation += delta;
    emit("message_delta", { delta });
  };
  if (!result.products.length) text(`${emptyMessage(session.locale)}${session.locale === "zh" ? "。" : " "}`);
  if (result.status === "matches") {
    const counts = session.locale === "zh"
      ? [result.products.length ? `${result.products.length} 款产品` : "", result.news.length ? `${result.news.length} 篇文章` : ""].filter(Boolean).join("、")
      : [result.products.length ? `${result.products.length} products` : "", result.news.length ? `${result.news.length} articles` : ""].filter(Boolean).join(" and ");
    text(session.locale === "zh" ? `为您找到 ${counts}，可以查看下方候选。\n\n` : `Found ${counts}. You can explore the candidates below.\n\n`);
    if (!selection.fallback) {
      metrics.modelCalls += 1;
      emit("status", { phase: "explaining" });
      try {
        await trace.step("model_explain", (phaseSignal, mark) => provider.explain(selection, result, phaseSignal,
          (delta) => { if (!phaseSignal.aborted) text(delta); }, usage, mark), { signal, timeoutMs: config.explainTimeoutMs || 15000 });
      } catch (error) {
        if (signal.aborted) throw error;
        metrics.explanationFallback = diagnostic(error);
      }
    }
    if (selection.fallback || metrics.explanationFallback) {
      if (metrics.explanationFallback) text("\n\n");
      text(result.products.map((product) => `${product.name}：${(product.matchReasons || []).join("；") || product.description || (session.locale === "zh" ? "公开资料与您的需求相关" : "Public information is relevant to your request")}`).join("\n"));
      if (!result.products.length) text(result.news.map((item) => `${item.title}：${item.description || ""}`).join("\n"));
      text(session.locale === "zh"
        ? "\n\n您可以选择候选查看参数、手动对比或询盘。具体气体、镜头配置与工况适用性请由工程师确认。"
        : "\n\nSelect candidates to view specifications, compare or inquire. Confirm gas, lens configuration and operating suitability with an engineer.");
    }
  } else if (session.clarification_count < 10) {
    result.status = "needs_clarification";
    result.clarification = {
      question: session.locale === "zh" ? "请补充或明确一个条件，例如产品型号、用途、目标气体，或者您想查的新闻主题。" : "Please clarify a model, application, target gas or news topic.",
      remaining: 9 - session.clarification_count,
    };
    text(`\n${result.clarification.question}`);
  }
  result.message = redact(explanation);
  result.query = redact(result.query);
  metrics.usageComplete = metrics.usageReports === metrics.modelCalls + metrics.embeddingCalls;
  return result;
}

module.exports = { emptyMessage, execute };
