const { hash } = require("./store");

function catalogScope() {
  return `FROM public.products_key product
    JOIN public.product_categories category ON category.slug = product.category_slug AND category.locale = product.locale
    WHERE product.visibility = 'published' AND category.visibility = 'published'
      AND COALESCE(product.extra->>'sample_entry', 'false') <> 'true'
      AND COALESCE(product.specifications->>'sample_entry', 'false') <> 'true'`;
}

async function getCatalog(pool, locale, slugs = null) {
  const { rows } = await pool.query(`SELECT product.*, category.name AS category_name,
    (SELECT document.facts FROM knowledge.documents document
      WHERE document.product_slug = product.slug AND document.locale = product.locale
        AND document.approval_status = 'approved' AND document.is_public AND document.reviewed_at <= now()
      ORDER BY document.reviewed_at DESC LIMIT 1) AS reviewed_facts
    ${catalogScope()} AND product.locale = $1 AND ($2::text[] IS NULL OR product.slug = ANY($2::text[]))
    ORDER BY product.display_order, product.slug`, [locale, slugs]);
  return rows;
}

function strings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function publicCatalogProduct(record) {
  const extra = record.extra || {};
  const specifications = record.specifications || {};
  const metrics = [...(Array.isArray(extra.metrics) ? extra.metrics : []), ...(Array.isArray(specifications.metrics) ? specifications.metrics : [])]
    .filter((metric) => metric && typeof metric.label === "string" && ["string", "number"].includes(typeof metric.value)
      && !/价格|报价|price|cost/i.test(metric.label))
    .map((metric) => ({ label: metric.label, value: String(metric.value) }))
    .filter((metric, index, entries) => entries.findIndex((entry) => entry.label === metric.label) === index);
  const facts = record.reviewed_facts || {};
  const product = {
    slug: record.slug,
    name: record.name,
    model: typeof extra.model === "string" ? extra.model : record.name,
    category: record.category_slug,
    categoryName: record.category_name,
    description: extra.card_description || record.short_description || "",
    specs: strings(specifications.cards).length ? strings(specifications.cards) : strings(record.tags).slice(0, 6),
    metrics,
    facts: { gases: strings(facts.gases), formFactor: facts.formFactor || "", resolution: facts.resolution || "" },
    detailPath: `/${record.locale}/products/${record.slug}`,
  };
  return { ...product, version: hash(JSON.stringify(product)) };
}

function searchableFields(record) {
  const product = publicCatalogProduct(record);
  const extra = record.extra || {};
  const specifications = record.specifications || {};
  const values = Object.entries(specifications)
    .filter(([key, value]) => !/source|price|cost|image|url|sample|unverified/i.test(key) && ["string", "number"].includes(typeof value))
    .map(([, value]) => String(value));
  return [
    { text: `${product.model} ${record.slug} ${product.name}`, weight: 5 },
    { text: `${product.categoryName} ${extra.subtitle || ""} ${values.join(" ")}`, weight: 3 },
    { text: [...product.specs, ...product.metrics.map((metric) => `${metric.label} ${metric.value}`), ...strings(record.tags)].join(" "), weight: 2 },
    { text: [product.description, record.description || "", ...strings(extra.highlights), ...strings(extra.applications), ...product.facts.gases].join(" "), weight: 1 },
  ];
}

module.exports = { catalogScope, getCatalog, publicCatalogProduct, searchableFields };
