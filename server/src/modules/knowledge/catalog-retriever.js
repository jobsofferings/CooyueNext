const { hash } = require("./store");
const { catalogScope, getCatalog, publicCatalogProduct, searchableFields } = require("./catalog");

const MODEL_VERSION = "catalog-sparse-v1";
const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
const stopWords = new Set("我 我们 我想 想 想要 要 需要 一 个 台 款 一个 一款 一台 的 是 或 或者 或是 也 和 与 有 用 用于 可以 请 帮我 找 查找 搜索 推荐 产品 设备 参数 资料 支持 公司 相关 型号 信息 官方 来源 页面 以 为 准 a an the i we want need would like looking look for of to in on or and is are with please find show product products device model page official source".split(" "));
const aliases = [
  { key: "board", pattern: /板子|板卡|电路板|主板|开发板|转接板|转换板|\bboards?\b|\bpcb\b/gi },
  { key: "eyepiece", pattern: /目镜|接目镜|\beye[ -]?pieces?\b|\boculars?\b/gi },
  { key: "lens", pattern: /镜头|透镜|\blens(?:es)?\b/gi },
  { key: "infrared", pattern: /红外|热成像|\binfrared\b|\bthermal\b/gi },
  { key: "gas-imaging", pattern: /气体成像|气体红外成像|光学气体|\bgas imaging\b|\bogi\b/gi },
  { key: "methane", pattern: /甲烷|\bmethane\b|\bch4\b/gi },
  { key: "sf6", pattern: /六氟化硫|\bsf[6₆]\b|sulph?ur hexafluoride/gi },
  { key: "handheld", pattern: /手持|便携|\bhandheld\b|\bportable\b/gi },
  { key: "ethernet", pattern: /以太网|网口|\bethernet\b/gi },
];

function features(value) {
  const normalized = String(value).normalize("NFKC").toLowerCase().replace(/<[^>]*>/g, " ");
  const weights = {};
  for (const alias of aliases) {
    alias.pattern.lastIndex = 0;
    if (alias.pattern.test(normalized)) weights[`concept:${alias.key}`] = alias.key === "infrared" ? 0.4 : 3;
  }
  for (const part of segmenter.segment(normalized)) {
    const term = part.segment;
    if (!part.isWordLike || stopWords.has(term) || /^\d$/.test(term)) continue;
    weights[`term:${term}`] = /[a-z]/.test(term) && /\d/.test(term) ? 4 : term === "红外" || term === "infrared" ? 0.3 : 1;
    if (/^[\u4e00-\u9fff]{3,}$/.test(term)) {
      for (let index = 0; index < term.length - 1; index += 1) weights[`gram:${term.slice(index, index + 2)}`] = 0.3;
    }
  }
  return weights;
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(Object.values(vector).reduce((sum, weight) => sum + weight * weight, 0));
  return Object.fromEntries(Object.entries(vector).map(([key, weight]) => [key, weight / (magnitude || 1)]));
}

function productVector(record) {
  const vector = {};
  for (const field of searchableFields(record)) {
    for (const [key, weight] of Object.entries(features(field.text))) vector[key] = Math.max(vector[key] || 0, weight * field.weight);
  }
  return normalizeVector(vector);
}

function queryBranches(query) {
  return [...new Set(query.split(/或者(?:是)?|或是|要么|或|\bor\b|[,，;；、]/i).map((branch) => branch.trim()).filter(Boolean))].slice(0, 8);
}

function queryVector(query) {
  const vector = features(query);
  const models = Object.entries(vector).filter(([key]) => key.startsWith("term:") && /[a-z]/i.test(key.slice(5)) && /\d/.test(key));
  if (models.length) return normalizeVector(Object.fromEntries(models));
  const generic = new Set(["concept:infrared", "term:红外", "term:infrared", "term:thermal", "term:成像", "term:imaging", "term:的"]);
  if (vector["concept:eyepiece"]) {
    for (const key of ["concept:lens", "term:镜头", "term:透镜", "term:lens", "term:lenses"]) generic.add(key);
  }
  if (Object.keys(vector).some((key) => !generic.has(key))) {
    for (const key of generic) delete vector[key];
  }
  return normalizeVector(vector);
}

async function retrieveCatalog(pool, { locale, query }) {
  const records = await getCatalog(pool, locale);
  const documents = records.map((record) => ({
    slug: record.slug, content_hash: hash(JSON.stringify(searchableFields(record))), vector: productVector(record),
  }));
  if (documents.length) {
    await pool.query(`INSERT INTO knowledge.product_vectors(product_slug, locale, model_version, content_hash, embedding)
      SELECT entry.slug, $1, $2, entry.content_hash, entry.vector
      FROM jsonb_to_recordset($3::jsonb) AS entry(slug text, content_hash text, vector jsonb)
      ON CONFLICT(product_slug, locale) DO UPDATE SET model_version = EXCLUDED.model_version,
        content_hash = EXCLUDED.content_hash, embedding = EXCLUDED.embedding, updated_at = now()
      WHERE knowledge.product_vectors.content_hash <> EXCLUDED.content_hash OR knowledge.product_vectors.model_version <> EXCLUDED.model_version`,
    [locale, MODEL_VERSION, JSON.stringify(documents)]);
  }
  const queries = queryBranches(query).map(queryVector);
  const { rows } = await pool.query(`WITH query_vectors AS (
      SELECT value AS embedding, ordinality AS branch FROM jsonb_array_elements($3::jsonb) WITH ORDINALITY
    ), eligible AS (
      SELECT product.slug ${catalogScope()} AND product.locale = $1
    ), scores AS (
      SELECT stored.product_slug, requested.branch,
        SUM(feature.value::double precision * (requested.embedding->>feature.key)::double precision) AS score
      FROM knowledge.product_vectors stored
      JOIN eligible ON eligible.slug = stored.product_slug
      CROSS JOIN query_vectors requested
      CROSS JOIN LATERAL jsonb_each_text(stored.embedding) feature
      WHERE stored.locale = $1 AND stored.model_version = $2 AND requested.embedding ? feature.key
      GROUP BY stored.product_slug, requested.branch
    ) SELECT product_slug, branch, score FROM scores WHERE score >= 0.06 ORDER BY score DESC, product_slug`,
  [locale, MODEL_VERSION, JSON.stringify(queries)]);
  const scoreBySlug = new Map();
  for (const match of rows) scoreBySlug.set(match.product_slug, Math.max(scoreBySlug.get(match.product_slug) || 0, Number(match.score)));
  const lexicalTerms = queries.map((vector) => Object.keys(vector).filter((key) => key.startsWith("term:")).map((key) => key.slice(5)));
  for (const document of documents) {
    const matched = lexicalTerms.flat().filter((term) => document.vector[`term:${term}`]);
    if (matched.length) scoreBySlug.set(document.slug, (scoreBySlug.get(document.slug) || 0)
      + matched.reduce((sum, term) => sum + (/[a-z]/i.test(term) && /\d/.test(term) ? 2 : document.vector[`term:${term}`] * 0.2), 0));
  }
  const products = records.filter((record) => scoreBySlug.has(record.slug))
    .sort((left, right) => scoreBySlug.get(right.slug) - scoreBySlug.get(left.slug))
    .map(publicCatalogProduct);
  return { mode: "sparse-vector-hybrid", provider: "postgres-sparse-vector", matchMode: "any", query,
    status: products.length ? "matches" : "no_matches", clarification: null, products };
}

module.exports = { MODEL_VERSION, features, normalizeVector, productVector, queryBranches, queryVector, retrieveCatalog };
