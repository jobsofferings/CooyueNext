const { features, normalizeVector } = require("../knowledge/catalog-retriever");
const { analyzeQuery } = require("../knowledge/retriever");
const { loadContent, readOnly } = require("./content");

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

function embeddingVersion(config) {
  return `v1:${config.baseURL}:${config.embeddingModel}:${config.dimensions}`;
}

function hardConditions(query) {
  const intent = analyzeQuery(query);
  const models = [...new Set(query.normalize("NFKC").toLowerCase().match(/\b[a-z]{1,10}[-]?\d+[a-z0-9-]*\b/g) || [])]
    .filter((model) => !["sf6", "ch4", "co2", "h2", "o2", "nh3", "c2h4"].includes(model));
  const unknownGas = /氢气|二氧化碳|氧气|一氧化碳|硫化氢|乙烷|丙烷|丁烷|\bhydrogen\b|carbon dioxide|\bethane\b|\bpropane\b/i.test(query);
  const withoutResolutions = intent.resolutions.reduce((text, resolution) => text.replace(resolution.label, ""), query);
  const unsafe = /排除|不要|不需要|不包括|低于|高于|以内|以上|以下|至少|至多|同一配置|同时检测|防爆|认证|\bcertified\b|\bwithout\b|\bexcluding\b|\bunder\b|\bover\b|\bnot\b|[<>≤≥]/i.test(withoutResolutions);
  const ambiguous = Boolean(intent.clarification) || /(?:气体|目标).*\?|\bunknown gas\b/.test(query);
  return { matched: intent.matched, resolutions: intent.resolutions, cooling: intent.cooling, models,
    ambiguous, restricted: unknownGas || unsafe, blocked: unknownGas || unsafe || ambiguous };
}

function mergeConditions(query, message, previousQuery) {
  const planned = hardConditions(query);
  const current = hardConditions(message);
  const previous = previousQuery && typeof previousQuery === "object" ? previousQuery : hardConditions(previousQuery || "");
  const reset = /换|改|重新|另一|不.*而|instead|change|switch|new search|rather than/i.test(message);
  const newTopic = /重新搜索|新的搜索|新话题|new search|new topic|start over/i.test(message);
  const resolvesGas = previous.ambiguous && current.matched.some((condition) => condition.kind === "gas");
  const replacementKinds = new Set(reset ? current.matched.map((condition) => condition.kind) : []);
  const inherited = newTopic ? [] : previous.matched.filter((condition) => !replacementKinds.has(condition.kind));
  const matched = [...new Map([...planned.matched, ...current.matched, ...(!reset ? previous.matched : [])]
    .map((condition) => [`${condition.kind}:${condition.key}`, condition])).values()];
  const verifiedMatched = [...new Map([...matched, ...inherited].map((condition) => [`${condition.kind}:${condition.key}`, { key: condition.key, kind: condition.kind }])).values()];
  return {
    matched: verifiedMatched,
    resolutions: current.resolutions.length ? current.resolutions : planned.resolutions.length ? planned.resolutions : !reset ? previous.resolutions : [],
    cooling: current.cooling.length ? current.cooling : planned.cooling.length ? planned.cooling : !reset ? previous.cooling : [],
    models: current.models.length ? current.models : planned.models.length ? planned.models : !reset ? previous.models : [],
    ambiguous: planned.ambiguous || current.ambiguous || (!reset && previous.ambiguous && !resolvesGas),
    restricted: planned.restricted || current.restricted || (!reset && previous.restricted),
    blocked: planned.blocked || current.blocked || (!reset && previous.blocked && !(resolvesGas && !previous.restricted)),
  };
}

function eligible(item, conditions) {
  if (item.type !== "product") return true;
  if (conditions.blocked) return false;
  const facts = item.evidence?.facts || {};
  const gasRequired = conditions.matched.some((condition) => condition.kind === "gas");
  if (!conditions.matched.every((condition) => condition.kind === "gas"
    ? facts.gases?.includes(condition.key) : (facts.formFactor || (!gasRequired && item.declaredForm)) === condition.key)) return false;
  if (conditions.models.length && !conditions.models.some((model) => {
    const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i").test(`${item.card.model} ${item.card.name} ${item.card.id}`);
  })) return false;
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

async function searchPublicContent({ pool, config, provider, input, message, previousQuery, locale, signal, onUsage, contentLoader = loadContent }) {
  const { items, newsUnavailable } = await contentLoader(pool, config, locale, signal);
  const conditions = mergeConditions(input.query, message, previousQuery);
  const candidates = items.filter((item) => (input.type === "all" || item.type === input.type) && eligible(item, conditions));
  const queryFeatures = normalizeVector(features(input.query));
  const keyword = candidates.map((item) => {
    const itemFeatures = normalizeVector(features(item.text));
    const score = Object.entries(queryFeatures).reduce((total, [key, value]) => total + value * (itemFeatures[key] || 0), 0);
    return { key: item.key, score };
  }).filter((entry) => entry.score > 0.015).sort((left, right) => right.score - left.score);
  let dense = [];
  let reason = config.embeddingModel ? null : "embedding_not_configured";
  if (config.embeddingModel && candidates.length) {
    try {
      const stored = await readOnly(pool, async (client) => (await client.query(
        "SELECT content_key, content_hash, embedding FROM agent.search_vectors WHERE locale = $1 AND model_version = $2",
        [locale, embeddingVersion(config)])).rows);
      const valid = candidates.flatMap((item) => {
        const index = stored.find((row) => row.content_key === item.key && row.content_hash === item.hash);
        return index ? [{ ...index, key: item.key }] : [];
      });
      if (valid.length) {
        const embedded = await provider.embed([input.query], signal);
        onUsage?.(embedded.usage);
        dense = valid.map((item) => ({ key: item.key, score: cosine(embedded.vectors[0], item.embedding) }))
          .filter((entry) => entry.score >= config.minSimilarity).sort((left, right) => right.score - left.score);
        if (valid.length !== candidates.length) reason = "partial_or_stale_index";
      } else reason = "index_missing_or_stale";
    } catch (error) {
      if (signal?.aborted) throw error;
      reason = "embedding_unavailable";
    }
  }
  const ranked = fuse(keyword, dense).map((key) => candidates.find((item) => item.key === key));
  const products = ranked.filter((item) => item.type === "product").slice(0, 20).map((item) => ({
    ...item.card,
    matchReasons: conditions.matched.length
      ? conditions.matched.map((condition) => `${item.evidence ? locale === "zh" ? "审核资料记录" : "Reviewed evidence" : locale === "zh" ? "公开产品资料" : "Public product content"}: ${condition.key}`)
      : [locale === "zh" ? "公开目录与需求相关；尚不代表适用性已确认" : "Relevant public catalog content; suitability is not confirmed"],
    caveat: locale === "zh" ? "实际气体适用性、镜头配置和工况请交由工程师确认。" : "Gas suitability, lens configuration and operating conditions require engineering confirmation.",
  }));
  const news = ranked.filter((item) => item.type === "news").slice(0, 8).map((item) => item.card);
  return { status: products.length || news.length ? "matches" : "no_matches", query: input.query, constraints: conditions, products, news,
    clarification: null, message: "", retrieval: {
      mode: config.embeddingModel && !["embedding_not_configured", "index_missing_or_stale", "embedding_unavailable"].includes(reason) && candidates.length ? "hybrid" : "keyword-only",
      degraded: Boolean(reason || newsUnavailable), reason, newsUnavailable,
      constraintsUnverified: conditions.blocked || Boolean(conditions.cooling.length),
    } };
}

module.exports = { cosine, eligible, embeddingVersion, fuse, hardConditions, mergeConditions, searchPublicContent };
