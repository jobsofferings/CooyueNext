const { redact } = require("./security");

function contextTitle(value, locale) {
  const text = redact(value).replace(/https?:\/\/\S+/gi, "").replace(/\[(?:email|phone|credential)\]/g, "")
    .replace(/[<>`#\r\n]/g, " ").replace(/\s+/g, " ").trim()
    .replace(/^(?:(?:您好|你好|请问|麻烦|请|帮我|我想|我要|我需要|想要|需要|找一下|找|寻找|了解一下|了解|看看|查看|看|用于)[，,、：:\s]*)+/u, "")
    .replace(/(?:[，,；;]\s*)?(?:请|帮我)?(?:对比候选|对比一下|推荐一下|推荐候选|谢谢)[。.!！\s]*$/u, "")
    .replace(/^(?:please\s+)?(?:(?:help me|i (?:want|need|would like)(?: to)?|find|show me|search for|look for)\s+)+/i, "")
    .replace(/^[，,。.!！\s]+|[，,。.!！\s]+$/g, "").trim();
  const maximum = locale === "zh" ? 30 : 64;
  const characters = Array.from(text);
  return characters.length ? characters.slice(0, maximum).join("") + (characters.length > maximum ? "…" : "")
    : locale === "zh" ? "产品与资料查询" : "Product and information search";
}

function contextsOf(session) {
  const contexts = new Map();
  for (const turn of session.history || []) {
    const id = turn.contextId || session.id;
    if (!contexts.has(id)) {
      const saved = session.context_summaries?.[id];
      contexts.set(id, { id, title: contextTitle(saved?.title || turn.result?.query || turn.user, session.locale),
        turnCount: 0, clarificationCount: saved?.clarificationCount || 0, updatedAt: turn.createdAt });
    }
    const summary = contexts.get(id);
    summary.turnCount += 1;
    summary.updatedAt = turn.createdAt;
    if (turn.result?.clarification) summary.clarificationCount = Math.max(summary.clarificationCount,
      Number.isInteger(turn.result.clarification.remaining) ? 10 - turn.result.clarification.remaining : 1);
  }
  const current = session.context_id || session.id;
  for (const context of session.open_contexts || []) {
    if (!contexts.has(context.id)) contexts.set(context.id, { id: context.id,
      title: session.locale === "zh" ? "新对话" : "New conversation", turnCount: 0, updatedAt: null });
    Object.assign(contexts.get(context.id), { clarificationCount: context.clarification_count, running: Boolean(context.active_run) });
  }
  if (!contexts.has(current)) contexts.set(current, { id: current, title: session.locale === "zh" ? "新对话" : "New conversation",
    turnCount: 0, clarificationCount: 0, updatedAt: null });
  if (!session.open_contexts) contexts.get(current).clarificationCount = session.clarification_count || 0;
  return [...contexts.values()].sort((first, second) => {
    if (!first.turnCount) return -1;
    if (!second.turnCount) return 1;
    return String(second.updatedAt).localeCompare(String(first.updatedAt));
  });
}

function contextMetadata(session) {
  return Object.fromEntries(contextsOf(session).filter((context) => context.turnCount).map((context) => [context.id,
    { title: context.title, clarificationCount: context.clarificationCount }]));
}

function publicContexts(session) {
  return contextsOf(session).map(({ id, title, turnCount, updatedAt, running }) => ({ id, title, turnCount, updatedAt, running: Boolean(running) }));
}

module.exports = { contextTitle, contextsOf, contextMetadata, publicContexts };
