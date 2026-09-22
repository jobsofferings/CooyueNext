const { features, normalizeVector } = require("../knowledge/catalog-retriever");
const { loadContent } = require("./content");
const { hardConditions, literalPattern, mergeConditions, resolveSearch } = require("./intent");
const { redact } = require("./security");
const { embeddingAudit, embeddingVersion } = require("./embeddings");
const { diagnostic } = require("./trace");
const { readVectorIndex, scoreVectorIndex } = require("./vector-index");

function cosine(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) return 0;
  let dot = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;
  for (let index = 0; index < first.length; index += 1) {
    if (!Number.isFinite(first[index]) || !Number.isFinite(second[index])) return 0;
    dot += first[index] * second[index];
    firstMagnitude += first[index] ** 2;
    secondMagnitude += second[index] ** 2;
  }
  return dot / (Math.sqrt(firstMagnitude * secondMagnitude) || 1);
}

function modelMatch(item, model, direct = false) {
  return literalPattern(model).test(`${item.card.model} ${item.card.name} ${item.card.id}${direct ? "" : ` ${item.text}`}`);
}

function eligible(item, conditions) {
  if (item.type !== "product") return true;
  if (conditions.blocked) return false;
  const facts = item.evidence?.facts || {};
  const gasRequired = conditions.matched.some((condition) => condition.kind === "gas");
  if (!conditions.matched.every((condition) => condition.kind === "gas"
    ? facts.gases?.includes(condition.key) : (facts.formFactor || (!gasRequired && item.declaredForm)) === condition.key)) return false;
  if (conditions.models.length && !conditions.models.some((model) => modelMatch(item, model))) return false;
  if (conditions.series?.length && !conditions.series.some((prefix) => literalPattern(prefix, "-?\\d").test(`${item.card.model} ${item.card.name}`))) return false;
  if (conditions.categories?.length && !conditions.categories.includes(item.card.category)) return false;
  const dimensions = String(facts.resolution || "").match(/(\d+)\s*[×x*]\s*(\d+)/);
  if (!conditions.resolutions.every((resolution) => {
    if (!dimensions) return false;
    const width = Number(dimensions[1]);
    const height = Number(dimensions[2]);
    if (resolution.operator === "gte") return width >= resolution.width && height >= resolution.height;
    if (resolution.operator === "lte") return width <= resolution.width && height <= resolution.height;
    if (resolution.operator === "gt") return width >= resolution.width && height >= resolution.height && (width > resolution.width || height > resolution.height);
    if (resolution.operator === "lt") return width <= resolution.width && height <= resolution.height && (width < resolution.width || height < resolution.height);
    return width === resolution.width && height === resolution.height;
  })) return false;
  if (conditions.cooling.length) return false;
  return true;
}

function fuse(keyword, dense) {
  const scores = new Map();
  for (const ranking of [keyword, dense]) ranking.forEach((entry, index) => scores.set(entry.key, (scores.get(entry.key) || 0) + 1 / (60 + index + 1)));
  return [...scores].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([key]) => key);
}

async function searchPublicContent({ pool, config, provider, input, message, previousQuery, previousConditions, locale, signal, onUsage, onEmbedding, trace, contentLoader = loadContent }) {
  const { items, newsUnavailable } = await contentLoader(pool, config, locale, signal, trace);
  const { query, conditions, intent } = resolveSearch({ input, message, previousQuery, previousConditions, items });
  const candidates = items.filter((item) => (input.type === "all" || item.type === input.type) && eligible(item, conditions));
  const queryFeatures = normalizeVector(features(query));
  const keyword = candidates.map((item) => {
    const itemFeatures = normalizeVector(features(item.text));
    const score = Object.entries(queryFeatures).reduce((total, [key, value]) => total + value * (itemFeatures[key] || 0), 0);
    const exact = item.type === "product" && (conditions.models.some((model) => modelMatch(item, model, true)) || conditions.series.length);
    const mentioned = item.type === "product" && (conditions.models.length || conditions.categories.length);
    return { key: item.key, score: Math.max(score, exact ? 0.3 : mentioned ? 0.1 : 0) };
  }).filter((entry) => entry.score > 0.015).sort((left, right) => right.score - left.score);
  let dense = [];
  let reason = config.embeddingModel ? null : "embedding_not_configured";
  let embeddingStage = "vector_index";
  const embedding = { ...embeddingAudit(config), locale, index: { published: items.length, eligible: candidates.length,
    stored: null, current: null, valid: null, missing: null, stale: null, invalid: null } };
  onEmbedding?.(embedding);
  if (config.embeddingModel && candidates.length) {
    try {
      const loadIndex = () => readVectorIndex(pool, config, locale);
      const stored = await (trace ? trace.step("vector_index", loadIndex, { signal, timeoutMs: 3500 }) : loadIndex());
      const byKey = new Map(stored.map((row) => [row.content_key, row]));
      const current = (item) => {
        const row = byKey.get(item.key);
        return row?.content_hash === item.hash && row.valid && row.dimensions === config.dimensions;
      };
      Object.assign(embedding.index, { stored: stored.length, current: items.filter(current).length, missing: 0, stale: 0, invalid: 0 });
      const valid = candidates.flatMap((item) => {
        const row = byKey.get(item.key);
        if (!row) embedding.index.missing += 1;
        else if (row.content_hash !== item.hash) embedding.index.stale += 1;
        else if (!row.valid || row.dimensions !== config.dimensions) embedding.index.invalid += 1;
        else return [{ ...row, key: item.key }];
        return [];
      });
      embedding.index.valid = valid.length;
      if (valid.length) {
        embedding.status = "running";
        embedding.calls += 1;
        onEmbedding?.(embedding);
        const started = Date.now();
        let embedded;
        embeddingStage = "embedding";
        try { embedded = await provider.embed([query], signal); }
        finally { embedding.durationMs = Date.now() - started; }
        onUsage?.(embedded.usage);
        embedding.totalTokens = Number.isFinite(embedded.usage?.total_tokens) ? embedded.usage.total_tokens : null;
        embeddingStage = "vector_rank";
        const scoreIndex = () => scoreVectorIndex(pool, config, locale, embedded.vectors[0], valid);
        const scored = await (trace ? trace.step("vector_rank", scoreIndex, { signal, timeoutMs: 3500 }) : scoreIndex());
        dense = scored.map((item) => ({ key: item.content_key, score: item.score }))
          .filter((entry) => Number.isFinite(entry.score) && entry.score >= config.minSimilarity).sort((left, right) => right.score - left.score);
        embedding.status = "completed";
        if (valid.length !== candidates.length) reason = "partial_or_stale_index";
      } else { reason = "index_missing_or_stale"; embedding.status = "skipped"; }
    } catch (error) {
      embedding.error = diagnostic(error);
      embedding.error.phase = embeddingStage;
      if (/^[0-9A-Z]{5}$/.test(error.code || "")) embedding.error.sqlState = error.code;
      embedding.status = /TIMEOUT/.test(error.code || "") || error.name === "TimeoutError" ? "timeout" : signal?.aborted ? "cancelled" : "failed";
      if (signal?.aborted) { embedding.reason = "request_cancelled"; onEmbedding?.(embedding); throw error; }
      reason = embeddingStage === "embedding" ? "embedding_unavailable" : "index_unavailable";
    }
  } else if (config.embeddingModel) {
    embedding.status = "skipped";
    embedding.reason = "no_eligible_content";
  }
  const ranked = fuse(keyword, dense).map((key) => candidates.find((item) => item.key === key));
  const products = ranked.filter((item) => item.type === "product").slice(0, 20).map((item) => ({
    ...item.card,
    matchReasons: [
      ...conditions.matched.map((condition) => `${item.evidence ? locale === "zh" ? "审核资料记录" : "Reviewed evidence" : locale === "zh" ? "公开产品资料" : "Public product content"}: ${condition.key}`),
      ...conditions.models.filter((model) => modelMatch(item, model)).map((model) => modelMatch(item, model, true)
        ? `${locale === "zh" ? "型号匹配" : "Model match"}: ${model.toUpperCase()}`
        : locale === "zh" ? `公开资料提及 ${model.toUpperCase()} 组件或关联型号，不代表独立型号或兼容性确认` : `Public content mentions component/related model ${model.toUpperCase()}; standalone availability and compatibility are not confirmed`),
      ...conditions.series.map((prefix) => `${locale === "zh" ? "型号系列匹配" : "Model series match"}: ${prefix.toUpperCase()} (${item.card.model})`),
      ...(conditions.categories.length ? [`${locale === "zh" ? "公开产品分类" : "Public product category"}: ${item.card.categoryName}`] : []),
      ...(!conditions.matched.length && !conditions.models.length && !conditions.series.length && !conditions.categories.length
        ? [locale === "zh" ? "公开目录与需求相关；尚不代表适用性已确认" : "Relevant public catalog content; suitability is not confirmed"] : []),
    ],
    caveat: locale === "zh" ? "实际气体适用性、镜头配置和工况请交由工程师确认。" : "Gas suitability, lens configuration and operating conditions require engineering confirmation.",
  }));
  const news = ranked.filter((item) => item.type === "news").slice(0, 8).map((item) => item.card);
  const returnedKeys = new Set([...products.map((item) => `product:${item.id}`), ...news.map((item) => `news:${item.id}`)]);
  const keywordKeys = new Set(keyword.map((item) => item.key));
  const itemsByKey = new Map(candidates.map((item) => [item.key, item]));
  embedding.reason = reason || embedding.reason || (embedding.status === "completed" && !dense.length ? "no_vector_matches" : null);
  embedding.vectorMatches = dense.length;
  embedding.topMatches = dense.slice(0, 20).map((entry, index) => ({ key: entry.key, type: itemsByKey.get(entry.key).type,
    score: Number(entry.score.toFixed(6)), rank: index + 1, keywordMatch: keywordKeys.has(entry.key), returned: returnedKeys.has(entry.key) }));
  onEmbedding?.(embedding);
  return { status: products.length || news.length ? "matches" : "no_matches", query, constraints: conditions, products, news,
    clarification: null, message: "", retrieval: {
      mode: config.embeddingModel && !["embedding_not_configured", "index_missing_or_stale", "embedding_unavailable", "index_unavailable"].includes(reason) && candidates.length ? "hybrid" : "keyword-only",
      degraded: Boolean(reason || newsUnavailable), reason, newsUnavailable, embedding,
      constraintsUnverified: conditions.blocked || Boolean(conditions.cooling.length),
      intent: { ...intent, proposedQuery: redact(input.query), effectiveQuery: redact(query) },
      filters: conditions,
      counts: { publishedProducts: items.filter((item) => item.type === "product").length,
        eligibleProducts: candidates.filter((item) => item.type === "product").length, keywordMatches: keyword.length, vectorMatches: dense.length, returnedProducts: products.length },
    } };
}

module.exports = { cosine, eligible, embeddingVersion, fuse, hardConditions, mergeConditions, searchPublicContent };
