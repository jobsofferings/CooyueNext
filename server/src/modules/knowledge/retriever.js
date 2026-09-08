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

function analyzeQuery(query) {
  const normalized = query.normalize("NFKC").toLowerCase();
  const matched = concepts.filter((concept) => concept.pattern.test(normalized));
  const tokens = [...new Set(normalized.match(/[a-z][a-z0-9-]{1,30}|[\u4e00-\u9fff]{2,}/g) || [])]
    .filter((token) => !["what", "which", "the", "for", "can", "does", "with", "and", "camera", "imaging", "this", "that"].includes(token));
  const models = normalized.match(/\b(?:pv\d+[a-z]*|gf?\d+[a-z]*|adgile)\b/g) || [];
  const broad = /气体|泄漏|成像|红外|选型|gas|leak|optical|infrared|ogi/i.test(normalized);
  return { normalized, matched, tokens, models, broad };
}

function createRetriever(pool) {
  const provider = process.env.KNOWLEDGE_RETRIEVER || "postgres-lexical";
  if (provider !== "postgres-lexical") throw new Error(`Unsupported knowledge retriever: ${provider}`);
  return {
    name: provider,
    async retrieve({ query, locale, productSlugs = [], limit = 12 }) {
      const intent = analyzeQuery(query);
      let documents = await getDocuments(pool, locale);
      if (productSlugs.length) documents = documents.filter((document) => productSlugs.includes(document.product_slug));
      if (!documents.length) return { provider, matches: [], evidence: [] };
      const chunks = (await pool.query(`SELECT chunk.id, chunk.document_id, chunk.section, chunk.content
        FROM knowledge.chunks chunk JOIN knowledge.documents document ON document.id = chunk.document_id
        WHERE document.id = ANY($1::uuid[]) AND document.content_hash = ANY($2::text[])
        AND document.approval_status = 'approved' AND document.is_public ORDER BY document.id, chunk.ordinal`,
      [documents.map((document) => document.id), documents.map((document) => document.content_hash)])).rows;
      const scored = documents.map((document) => {
        const identity = `${document.product_name} ${document.title}`.toLowerCase();
        const searchable = `${identity} ${chunks.filter((chunk) => chunk.document_id === document.id).map((chunk) => chunk.content).join(" ")}`.toLowerCase();
        const matchesConcepts = intent.matched.every((concept) => concept.kind === "gas"
          ? document.facts.gases?.includes(concept.key) : document.facts.formFactor === concept.key);
        const matchesModels = !intent.models.length || intent.models.some((model) => identity.includes(model));
        const tokenScore = intent.tokens.filter((token) => searchable.includes(token)).length * 5;
        const score = tokenScore + intent.matched.length * 10 + (intent.broad ? 1 : 0);
        return { document, score: matchesConcepts && matchesModels ? score : 0 };
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
