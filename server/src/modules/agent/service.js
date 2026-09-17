const { createProvider } = require("./provider");
const { searchPublicContent } = require("./search");
const { redact } = require("./security");
const { createTrace, diagnostic } = require("./trace");

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
    previousQuery: previous?.constraints || previous?.query, locale: session.locale, signal: phaseSignal, onUsage: usage, trace }), { signal, timeoutMs: 12000 });
  if (selection.fallback) result.retrieval = { ...result.retrieval, degraded: true, understandingFallback: true };
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
    text(session.locale === "zh" ? `已检索到 ${result.products.length} 款产品、${result.news.length} 篇新闻。正在整理匹配说明…\n\n`
      : `Found ${result.products.length} products and ${result.news.length} articles. Preparing the explanation…\n\n`);
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
      text(result.products.map((product) => `${product.name}：${(product.matchReasons || []).join("；")}`).join("\n"));
      text(session.locale === "zh"
        ? "\n模型响应超时或暂不可用，已使用只读检索结果和资料摘要。相关性不等于工况适用性确认，气体和镜头配置请由工程师确认；您可以手动选择产品对比或询盘。"
        : "\nThe model is slow or unavailable; read-only results and source summaries are shown instead. Relevance does not confirm suitability or lens configuration; compare or inquire manually.");
    }
  } else if (session.clarification_count < 10) {
    result.status = "needs_clarification";
    result.clarification = {
      question: session.locale === "zh" ? "请补充或明确一个条件，例如产品型号、用途、目标气体，或者您想查的新闻主题。" : "Please clarify a model, application, target gas or news topic.",
      remaining: 9 - session.clarification_count,
    };
    text(`\n${result.clarification.question}`);
  }
  if (result.retrieval.degraded) text(session.locale === "zh" ? "\n部分检索能力暂不可用，结果按当前可用资料返回。" : "\nSome retrieval capabilities are unavailable; results use currently available content.");
  result.message = redact(explanation);
  result.query = redact(result.query);
  metrics.usageComplete = metrics.usageReports === metrics.modelCalls + metrics.embeddingCalls;
  return result;
}

module.exports = { emptyMessage, execute };
