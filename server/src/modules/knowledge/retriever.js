const { getDocuments } = require("./store");

const concepts = [
  { key: "methane", pattern: /甲烷|methane|\bch4\b/i, kind: "gas" },
  { key: "sf6", pattern: /六氟化硫|\bsf[6₆]\b|sulfur hexafluoride|sulphur hexafluoride/i, kind: "gas" },
  { key: "voc", pattern: /挥发性有机|\bvocs?\b|volatile organic/i, kind: "gas" },
  { key: "ammonia", pattern: /氨|ammonia|\bnh3\b/i, kind: "gas" },
  { key: "ethylene", pattern: /乙烯|ethylene|\bc2h4\b/i, kind: "gas" },
  { key: "co2", pattern: /二氧化碳|carbon dioxide|\bco2\b/i, kind: "gas" },
  { key: "hydrogen", pattern: /氢气|hydrogen|\bh2\b/i, kind: "gas" },
  { key: "handheld", pattern: /手持|便携|handheld|portable/i, kind: "form" },
  { key: "fixed", pattern: /固定|在线监测|fixed|continuous monitoring/i, kind: "form" },
];

const ignoredTerms = new Set([
  "a", "an", "the", "for", "in", "at", "of", "to", "on", "with", "and", "that", "this", "which", "what", "is", "are", "can", "does",
  "i", "me", "my", "we", "need", "want", "please", "find", "show", "recommend", "looking", "search", "support", "supports", "device", "devices", "equipment",
  "camera", "cameras", "imaging", "image", "thermal", "infrared", "optical", "ogi", "gas", "gases", "leak", "leaks", "leakage", "detect", "detecting", "detection", "inspection", "monitoring", "detector", "resolution", "pixel", "pixels",
  "我", "我们", "我想", "你", "帮", "帮我", "请", "请问", "想", "想要", "找", "查找", "查询", "搜索", "推荐", "需要", "要", "一", "一个", "一台", "一款", "台", "款", "个",
  "的", "了", "是", "为", "有", "能", "能够", "可以", "支持", "满足", "具有", "具备", "要求", "条件", "用于", "用来", "用", "进行", "和", "与", "及", "以及", "且", "并且", "同时",
  "相机", "摄像机", "设备", "产品", "仪器", "系统", "型", "式", "气体", "泄漏", "检测", "探测", "探测器", "巡检", "监测", "红外", "热", "成像", "热成像", "光学", "选型", "分辨率", "像素",
]);
const wordSegmenter = new Intl.Segmenter("zh", { granularity: "word" });
const ignoredPhrases = [...ignoredTerms].filter((term) => /^[\u4e00-\u9fff]{2,}$/.test(term)).sort((left, right) => right.length - left.length);

function resolutionOperator(prefix, suffix) {
  if (/至少|不低于|大于等于|>=|≥|at\s+least/.test(prefix) || suffix === "以上") return "gte";
  if (/至多|不高于|不超过|小于等于|<=|≤|at\s+most/.test(prefix) || suffix === "以下") return "lte";
  if (/高于|大于|>|more\s+than/.test(prefix)) return "gt";
  if (/低于|小于|<|less\s+than/.test(prefix)) return "lt";
  return "eq";
}

function analyzeRequirements(normalized, matched, models) {
  let remainder = normalized;
  const resolutions = [];
  const resolutionPattern = /(?:(至少|不低于|大于等于|>=|≥|高于|大于|>|至多|不高于|不超过|小于等于|<=|≤|低于|小于|<|at\s+least|at\s+most|more\s+than|less\s+than)\s*)?(\d{2,5})\s*[x×*乘]\s*(\d{2,5})(?:\s*(以上|以下))?/g;
  remainder = remainder.replace(resolutionPattern, (raw, prefix, width, height, suffix) => {
    resolutions.push({ width: Number(width), height: Number(height), operator: resolutionOperator(prefix || "", suffix), label: raw });
    return " ";
  });
  const cooling = [];
  remainder = remainder.replace(/非制冷|\buncooled\b/g, () => { cooling.push("uncooled"); return " "; });
  remainder = remainder.replace(/制冷|\bcooled\b/g, () => { cooling.push("cooled"); return " "; });
  for (const concept of matched) {
    remainder = concept.pattern
      ? remainder.replace(new RegExp(concept.pattern.source, "gi"), " ")
      : remainder.replaceAll(concept.key.replace("unverified:", ""), " ");
  }
  for (const model of models) remainder = remainder.replaceAll(model, " ");
  const unsupported = [...new Set(remainder.match(/\b(?:or|not|no|without|except|excluding|exclude|over|under|above|below)\b|\b(?:at least|at most|more than|less than)\b|或者|或|要么|不|非|排除|至少|至多|最多|最少|以内|以上|以下|高于|低于|大于|小于|[<>≤≥|]|\d\s*[-~～至]\s*\d/g) || [])];
  if (matched.filter((concept) => concept.kind === "gas").length > 1 && /同时|同一配置|simultaneous|same configuration/.test(normalized)) unsupported.push("single-configuration gas compatibility");
  for (const phrase of ignoredPhrases) remainder = remainder.replaceAll(phrase, " ");
  const requiredTerms = [...new Set([...wordSegmenter.segment(remainder)]
    .filter((segment) => segment.isWordLike && !ignoredTerms.has(segment.segment)).map((segment) => segment.segment))];
  return { resolutions, cooling: [...new Set(cooling)], requiredTerms, unsupported };
}

function containsTerm(text, term) {
  if (!/^[a-z0-9-]+$/i.test(term)) return text.includes(term);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i").test(text);
}

function matchesResolution(actual, required) {
  const dimensions = String(actual || "").normalize("NFKC").match(/(\d+)\s*[x×*]\s*(\d+)/i);
  if (!dimensions) return false;
  const width = Number(dimensions[1]);
  const height = Number(dimensions[2]);
  if (required.operator === "gte") return width >= required.width && height >= required.height;
  if (required.operator === "lte") return width <= required.width && height <= required.height;
  if (required.operator === "gt") return width >= required.width && height >= required.height && (width > required.width || height > required.height);
  if (required.operator === "lt") return width <= required.width && height <= required.height && (width < required.width || height < required.height);
  return width === required.width && height === required.height;
}

function matchesRequirements(document, searchable, intent) {
  const cooling = /非制冷|\buncooled\b/.test(searchable) ? "uncooled" : /制冷|\bcooled\b/.test(searchable) ? "cooled" : null;
  return intent.resolutions.every((resolution) => matchesResolution(document.facts.resolution, resolution))
    && intent.cooling.every((requirement) => requirement === cooling)
    && intent.requiredTerms.every((term) => containsTerm(searchable, term));
}

function analyzeQuery(query) {
  const normalized = query.normalize("NFKC").toLowerCase();
  const matched = concepts.filter((concept) => concept.pattern.test(normalized));
  const incompleteGas = /(^|[\s,，;；:：、。【（(\[])烷(?=$|[\s,，;；:：、。】）)\]]|泄漏|巡检|检测|气体|成像)/;
  const clarification = incompleteGas.test(query) ? {
    term: "烷",
    suggestions: [{ label: "甲烷 / Methane", query: query.replace(incompleteGas, "$1甲烷") }],
  } : null;
  const unverifiedGases = [...new Set(normalized.match(/[乙丙丁戊己庚辛壬癸]烷/g) || [])];
  matched.push(...unverifiedGases.map((name) => ({ key: `unverified:${name}`, kind: "gas" })));
  const tokens = [...new Set(normalized.match(/[a-z][a-z0-9-]{1,30}|[\u4e00-\u9fff]{2,}/g) || [])]
    .filter((token) => !["what", "which", "the", "for", "can", "does", "with", "and", "camera", "imaging", "this", "that"].includes(token));
  const models = normalized.match(/\b(?:pv\d+[a-z]*|gf?\d+[a-z]*|adgile)\b/g) || [];
  const broad = /气体|泄漏|成像|红外|选型|分辨率|像素|gas|leak|optical|infrared|ogi|resolution|pixel/i.test(normalized);
  return { normalized, matched, tokens, models, broad, clarification, ...analyzeRequirements(normalized, matched, models) };
}

function createRetriever(pool) {
  const provider = process.env.KNOWLEDGE_RETRIEVER || "postgres-lexical";
  if (provider !== "postgres-lexical") throw new Error(`Unsupported knowledge retriever: ${provider}`);
  return {
    name: provider,
    async retrieve({ query, locale, productSlugs = [], limit = 12, requireAll = false }) {
      const intent = analyzeQuery(query);
      if (intent.clarification) return { provider, matches: [], evidence: [], clarification: intent.clarification };
      if (requireAll && intent.unsupported.length) return {
        provider, matches: [], evidence: [],
        clarification: { reason: "unsupported_conditions", term: intent.unsupported.join("、"), suggestions: [] },
      };
      let documents = await getDocuments(pool, locale);
      if (productSlugs.length) documents = documents.filter((document) => productSlugs.includes(document.product_slug));
      if (!documents.length) return { provider, matches: [], evidence: [] };
      const chunks = (await pool.query(`SELECT chunk.id, chunk.document_id, chunk.section, chunk.content
        FROM knowledge.chunks chunk JOIN knowledge.documents document ON document.id = chunk.document_id
        WHERE document.id = ANY($1::uuid[]) AND document.content_hash = ANY($2::text[])
        AND document.approval_status = 'approved' AND document.is_public ORDER BY document.id, chunk.ordinal`,
      [documents.map((document) => document.id), documents.map((document) => document.content_hash)])).rows;
      const scored = documents.map((document) => {
        const identity = `${document.product_name} ${document.title}`.normalize("NFKC").toLowerCase();
        const searchable = `${identity} ${chunks.filter((chunk) => chunk.document_id === document.id).map((chunk) => chunk.content).join(" ")}`.normalize("NFKC").toLowerCase();
        const matchesConcepts = intent.matched.every((concept) => concept.kind === "gas"
          ? document.facts.gases?.includes(concept.key) : document.facts.formFactor === concept.key);
        const matchesModels = !intent.models.length || (requireAll
          ? intent.models.every((model) => containsTerm(identity, model))
          : intent.models.some((model) => containsTerm(identity, model)));
        const tokenScore = intent.tokens.filter((token) => searchable.includes(token)).length * 5;
        const score = tokenScore + intent.matched.length * 10 + intent.resolutions.length * 10 + intent.cooling.length * 10 + (intent.broad ? 1 : 0);
        const matchesAll = !requireAll || matchesRequirements(document, searchable, intent);
        return { document, score: matchesConcepts && matchesModels && matchesAll ? score : 0 };
      }).filter((match) => match.score > 0).sort((left, right) => right.score - left.score || left.document.source_key.localeCompare(right.document.source_key));
      if (!scored.length) return { provider, matches: [], evidence: [] };
      const evidence = scored.flatMap(({ document, score }) => chunks.filter((chunk) => chunk.document_id === document.id).map((chunk) => ({
        id: chunk.id, documentId: document.id, productSlug: document.product_slug, title: document.title,
        url: document.source_url, section: chunk.section, content: chunk.content, version: document.version,
        reviewedAt: document.reviewed_at, score,
      }))).slice(0, limit);
      return { provider, matches: scored.filter(({ document }) => evidence.some((item) => item.documentId === document.id)), evidence };
    },
  };
}

module.exports = { analyzeQuery, createRetriever };
