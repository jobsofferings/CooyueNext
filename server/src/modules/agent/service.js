const { createProvider } = require("./provider");
const { searchPublicContent } = require("./search");
const { redact } = require("./security");

function emptyMessage(locale) {
  return locale === "zh" ? "当前资料没有确认符合条件的产品" : "The current evidence does not confirm products matching these requirements.";
}

async function execute({ pool, config, session, message, signal, emit, provider = createProvider({ ...config, locale: session.locale }), search = searchPublicContent, metrics }) {
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
  const selection = await provider.select(session.history, message, signal, usage);
  signal.throwIfAborted();
  emit("status", { phase: "searching" });
  metrics.toolCalls += 1;
  const searchStarted = Date.now();
  const searchProvider = { ...provider, async embed(...args) { metrics.embeddingCalls += 1; return provider.embed(...args); } };
  const previous = session.history.at(-1)?.result;
  const result = await search({ pool, config, provider: searchProvider, input: selection.input, message,
    previousQuery: previous?.constraints || previous?.query, locale: session.locale, signal, onUsage: usage });
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
    metrics.modelCalls += 1;
    emit("status", { phase: "explaining" });
    try { await provider.explain(selection, result, signal, text, usage); }
    catch (error) {
      if (signal.aborted) throw error;
      metrics.explanationFallback = true;
      text(session.locale === "zh"
        ? "\n说明生成未完成。以下卡片来自当前公开资料，相关性不等于工况适用性确认；您可以自行选择产品对比或询盘。"
        : "\nThe explanation could not be completed. Cards are from public content; relevance does not establish suitability. Select products to compare or inquire manually.");
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
