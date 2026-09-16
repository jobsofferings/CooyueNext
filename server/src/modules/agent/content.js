const { getCatalog, publicCatalogProduct, searchableFields } = require("../knowledge/catalog");
const { getDocuments } = require("../knowledge/store");
const { digest, redact } = require("./security");
const { failure } = require("./config");

async function readOnly(pool, operation) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '3000ms'");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function readNews(config, locale, signal) {
  const origin = new URL(config.newsOrigin);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/"
    || !["http:", "https:"].includes(origin.protocol)) throw failure("NEWS_SOURCE_INVALID", 503);
  const response = await fetch(`${origin.origin}/api/agent-content?locale=${locale}`, {
    signal: AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(4000)]), redirect: "error",
  });
  if (!response.ok || !response.body) throw failure("NEWS_SOURCE_UNAVAILABLE", 503);
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 512000) throw failure("NEWS_SOURCE_TOO_LARGE", 503);
    text += decoder.decode(chunk, { stream: true });
  }
  text += decoder.decode();
  const payload = JSON.parse(text);
  if (!Array.isArray(payload.items) || payload.items.length > 100) throw failure("NEWS_SOURCE_INVALID", 503);
  return payload.items.filter((item) => typeof item.id === "string" && /^[a-z0-9-]{1,120}$/i.test(item.id)
    && typeof item.title === "string" && typeof item.description === "string" && typeof item.text === "string")
    .map((item) => {
      const card = { id: item.id, type: "news", title: redact(item.title).slice(0, 300),
        description: redact(item.description).slice(0, 1000), detailPath: `/${locale}/news/${encodeURIComponent(item.id)}` };
      const content = `${card.title}\n${card.description}\n${redact(item.text).slice(0, 10000)}`;
      return { key: `news:${item.id}`, type: "news", card, text: content, hash: digest(content) };
    });
}

function productItem(record, document) {
  const card = { ...publicCatalogProduct(record), id: record.slug, type: "product" };
  card.name = String(card.name || "").slice(0, 300);
  card.description = String(card.description || "").slice(0, 1500);
  card.specs = card.specs.slice(0, 12).map((spec) => spec.slice(0, 300));
  card.metrics = card.metrics.slice(0, 24).map((metric) => ({ label: metric.label.slice(0, 100), value: metric.value.slice(0, 300) }));
  const text = searchableFields(record).map((field) => field.text).join("\n").slice(0, 12000);
  const handheld = /手持|便携|\bhandheld\b|\bportable\b/i.test(text);
  const fixed = /固定式|固定安装|在线监测|\bfixed\b/i.test(text);
  const contradictoryForm = /非手持|不可手持|不适合手持|not handheld|not portable|非固定|not fixed/i.test(text);
  const declaredForm = !contradictoryForm && handheld !== fixed ? handheld ? "handheld" : "fixed" : null;
  const evidence = document ? { facts: document.facts, text: JSON.stringify(document.facts),
    source: { title: document.title, url: document.source_url, reviewedAt: document.reviewed_at, version: document.version } } : null;
  return { key: `product:${record.slug}`, type: "product", card, text, hash: digest(JSON.stringify({ card, text, evidence })), evidence, declaredForm };
}

async function loadContent(pool, config, locale, signal) {
  const { records, documents } = await readOnly(pool, async (client) => ({
    records: await getCatalog(client, locale), documents: await getDocuments(client, locale),
  }));
  if (records.length > 2500) throw failure("CATALOG_CAPACITY_EXCEEDED", 503);
  let news = [];
  let newsUnavailable = false;
  try { news = await readNews(config, locale, signal); }
  catch { if (signal?.aborted) throw signal.reason; newsUnavailable = true; }
  const items = records.map((record) => productItem(record, documents.find((document) => document.product_slug === record.slug)));
  return { items: [...items, ...news], newsUnavailable };
}

async function refreshResult(result, pool, config, locale, signal) {
  const { items, newsUnavailable } = await loadContent(pool, config, locale, signal);
  const products = result.products.flatMap((product) => {
    const current = items.find((item) => item.key === `product:${product.id}`);
    return current && current.card.version === product.version ? [{ ...current.card, matchReasons: product.matchReasons, caveat: product.caveat }] : [];
  });
  const news = result.news.flatMap((item) => {
    const current = items.find((entry) => entry.key === `news:${item.id}`);
    return current ? [current.card] : [];
  });
  const changed = products.length !== result.products.length || news.length !== result.news.length;
  return { ...result, products, news, message: changed ? (locale === "zh" ? "部分内容已更新或不再公开，请重新搜索。" : "Some content has changed or is no longer public. Please search again.") : result.message,
    status: products.length || news.length ? "matches" : result.clarification ? "needs_clarification" : "no_matches", retrieval: { ...result.retrieval, newsUnavailable } };
}

module.exports = { loadContent, productItem, readNews, readOnly, refreshResult };
