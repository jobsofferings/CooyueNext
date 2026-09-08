const { createHash } = require("crypto");

const CATEGORY = "gas-imaging-cameras";
const hash = (value) => createHash("sha256").update(value).digest("hex");

function eligibleSql() {
  return `FROM knowledge.documents document
    JOIN public.products_key product ON product.slug = document.product_slug AND product.locale = document.locale
    JOIN public.product_categories category ON category.slug = product.category_slug AND category.locale = product.locale
    WHERE document.category_slug = '${CATEGORY}' AND product.category_slug = '${CATEGORY}'
      AND document.approval_status = 'approved' AND document.is_public AND document.reviewed_at <= now()
      AND product.visibility = 'published' AND category.visibility = 'published'
      AND COALESCE(product.extra->>'sample_entry', 'false') <> 'true'
      AND COALESCE(product.specifications->>'sample_entry', 'false') <> 'true'`;
}

async function getDocuments(pool, locale) {
  const { rows } = await pool.query(`SELECT document.*, product.name AS product_name,
    product.price, product.currency, product.updated_at AS product_updated_at
    ${eligibleSql()} AND document.locale = $1 ORDER BY document.source_key LIMIT 501`, [locale]);
  if (rows.length > 500) throw Object.assign(new Error("Lexical validation corpus is too large; configure a scalable retriever"), { status: 503 });
  return rows;
}

function validateSource(source) {
  if (!source || !/^[a-z0-9-]{1,160}$/.test(source.key) || !/^[a-z0-9-]{1,120}$/.test(source.productSlug)
    || !["zh", "en"].includes(source.locale) || source.category !== CATEGORY
    || typeof source.title !== "string" || !source.title.trim() || source.title.length > 300
    || typeof source.version !== "string" || !source.version || source.version.length > 80
    || !source.facts || typeof source.facts.name !== "string" || !Array.isArray(source.facts.gases)
    || source.facts.gases.some((gas) => typeof gas !== "string")
    || !["handheld", "fixed"].includes(source.facts.formFactor) || typeof source.facts.resolution !== "string"
    || !Number.isFinite(Date.parse(source.reviewedAt)) || Date.parse(source.reviewedAt) > Date.now()
    || !Array.isArray(source.sections) || !source.sections.length || source.sections.length > 100) {
    throw new Error("Invalid reviewed knowledge source");
  }
  const sourceUrl = new URL(source.sourceUrl);
  if (sourceUrl.protocol !== "https:" || sourceUrl.username || sourceUrl.password) throw new Error("Source must be a public HTTPS reference");
  const keys = new Set();
  for (const section of source.sections) {
    if (!/^[a-z0-9-]{1,80}$/.test(section.key) || keys.has(section.key)
      || typeof section.content !== "string" || !section.content.trim() || section.content.length > 8000
      || typeof section.title !== "string" || !section.title.trim()) throw new Error("Invalid or duplicate knowledge section");
    keys.add(section.key);
  }
}

async function indexDocument(pool, source) {
  validateSource(source);
  const contentHash = hash(JSON.stringify(source));
  const job = (await pool.query("INSERT INTO knowledge.index_jobs(source_key, status) VALUES ($1, 'running') RETURNING id", [source.key])).rows[0];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [source.key]);
    const existing = (await client.query("SELECT content_hash, product_slug, locale FROM knowledge.documents WHERE source_key = $1", [source.key])).rows[0];
    if (existing && (existing.product_slug !== source.productSlug || existing.locale !== source.locale)) {
      throw new Error("A source key cannot change product or locale; create a new source key");
    }
    const unchanged = existing?.content_hash === contentHash;
    if (!unchanged) {
      const product = await client.query(`SELECT 1 FROM public.products_key WHERE slug = $1 AND locale = $2
        AND category_slug = $3 AND visibility = 'published'
        AND COALESCE(extra->>'sample_entry', 'false') <> 'true'
        AND COALESCE(specifications->>'sample_entry', 'false') <> 'true'`, [source.productSlug, source.locale, CATEGORY]);
      if (!product.rowCount) throw new Error("Source product is missing, unpublished, a sample, or outside the gas-imaging category");
      const document = (await client.query(`INSERT INTO knowledge.documents
        (source_key, product_slug, locale, category_slug, title, source_url, version, content_hash, approval_status, is_public, reviewed_at, facts)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'approved',TRUE,$9,$10)
        ON CONFLICT(source_key) DO UPDATE SET title = EXCLUDED.title, source_url = EXCLUDED.source_url,
          version = EXCLUDED.version, content_hash = EXCLUDED.content_hash, approval_status = 'approved',
          is_public = TRUE, reviewed_at = EXCLUDED.reviewed_at, facts = EXCLUDED.facts, updated_at = now()
        RETURNING id`, [source.key, source.productSlug, source.locale, CATEGORY, source.title, source.sourceUrl,
        source.version, contentHash, source.reviewedAt, JSON.stringify(source.facts)])).rows[0];
      await client.query("DELETE FROM knowledge.chunks WHERE document_id = $1", [document.id]);
      for (const [ordinal, section] of source.sections.entries()) {
        await client.query(`INSERT INTO knowledge.chunks(id, document_id, ordinal, section, content, content_hash)
          VALUES ($1,$2,$3,$4,$5,$6)`, [`${source.key}:${section.key}`, document.id, ordinal, section.title, section.content, hash(section.content)]);
      }
    }
    await client.query("UPDATE knowledge.index_jobs SET status = 'succeeded', finished_at = now() WHERE id = $1", [job.id]);
    await client.query("COMMIT");
    return { sourceKey: source.key, unchanged, jobId: job.id };
  } catch (error) {
    await client.query("ROLLBACK");
    await pool.query("UPDATE knowledge.index_jobs SET status = 'failed', error = $2, finished_at = now() WHERE id = $1", [job.id, error.message.slice(0, 500)]);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { CATEGORY, hash, eligibleSql, getDocuments, validateSource, indexDocument };
