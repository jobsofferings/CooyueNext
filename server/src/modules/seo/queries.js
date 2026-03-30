/**
 * SEO module – SQL queries
 *
 * Naming conventions
 *   get   – single row
 *   list  – multiple rows, paginated
 *   exist – boolean check
 */

const VALID_LOCALES = ["en", "zh"];

// ── helpers ────────────────────────────────────────────────────────────────

function validateLocale(locale) {
  if (!VALID_LOCALES.includes(locale)) {
    throw Object.assign(new Error(`Invalid locale: "${locale}"`), { status: 400 });
  }
}

// ── seo_keys ───────────────────────────────────────────────────────────────

/** List all seo_keys (admin/internal use). */
async function listSeoKeys({ pool, page = 1, pageSize = 20 } = {}) {
  const offset = (Math.max(1, page) - 1) * pageSize;
  const [countResult, rows] = await Promise.all([
    pool.query("SELECT COUNT(*) AS total FROM seo_keys"),
    pool.query(
      `SELECT key, targets, created_at, updated_at
       FROM seo_keys
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    ),
  ]);
  return {
    data: rows.rows,
    total: Number(countResult.rows[0].total),
    page,
    pageSize,
  };
}

/** Create a new seo_key. Throws on duplicate. */
async function createSeoKey({ pool, key, targets = [] } = {}) {
  if (!key || typeof key !== "string" || key.trim() === "") {
    throw Object.assign(new Error("key is required"), { status: 400 });
  }
  const [row] = (
    await pool.query(
      `INSERT INTO seo_keys (key, targets)
       VALUES ($1, $2)
       RETURNING key, targets, created_at, updated_at`,
      [key.trim(), targets]
    )
  ).rows;
  return row;
}

/** Delete a seo_key and all its seo_records (CASCADE). Returns the deleted key. */
async function deleteSeoKey({ pool, key } = {}) {
  if (!key) throw Object.assign(new Error("key is required"), { status: 400 });
  const [row] = (
    await pool.query(
      "DELETE FROM seo_keys WHERE key = $1 RETURNING key",
      [key]
    )
  ).rows;
  return row; // null if not found
}

// ── seo_records ────────────────────────────────────────────────────────────

/**
 * Fetch SEO config for a given key + locale.
 * Returns the seo_key metadata plus the matching record (or null).
 */
async function getSeo({ pool, key, locale } = {}) {
  if (!key) throw Object.assign(new Error("key is required"), { status: 400 });
  validateLocale(locale);

  const [metaResult, recordResult] = await Promise.all([
    pool.query(
      "SELECT key, targets, created_at, updated_at FROM seo_keys WHERE key = $1",
      [key]
    ),
    pool.query(
      `SELECT id, seo_key, locale, title, description, keywords, og_image,
              canonical, no_index, visibility, extra, created_at, updated_at
       FROM   seo_records
       WHERE  seo_key = $1 AND locale = $2`,
      [key, locale]
    ),
  ]);

  if (!metaResult.rows.length) return null;

  return {
    key:    metaResult.rows[0],
    record: recordResult.rows[0] || null,
  };
}

/**
 * Upsert an seo_record.
 * Also creates the seo_key row if it doesn't already exist.
 */
async function upsertSeoRecord({ pool, key, locale, data = {} } = {}) {
  if (!key) throw Object.assign(new Error("key is required"), { status: 400 });
  if (!locale) throw Object.assign(new Error("locale is required"), { status: 400 });
  validateLocale(locale);

  const {
    title          = null,
    description    = null,
    keywords       = [],
    og_image       = null,
    canonical      = null,
    no_index       = false,
    visibility     = "draft",
    extra          = {},
    targets        = [],
  } = data;

  if (!["published", "draft"].includes(visibility)) {
    throw Object.assign(new Error(`Invalid visibility: "${visibility}"`), { status: 400 });
  }

  // Ensure seo_key exists
  await pool.query(
    `INSERT INTO seo_keys (key, targets)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET targets = COALESCE(EXCLUDED.targets, seo_keys.targets)`,
    [key, targets]
  );

  const [row] = (
    await pool.query(
      `INSERT INTO seo_records
         (seo_key, locale, title, description, keywords, og_image,
          canonical, no_index, visibility, extra)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (seo_key, locale) DO UPDATE SET
         title       = EXCLUDED.title,
         description = EXCLUDED.description,
         keywords    = EXCLUDED.keywords,
         og_image    = EXCLUDED.og_image,
         canonical   = EXCLUDED.canonical,
         no_index    = EXCLUDED.no_index,
         visibility  = EXCLUDED.visibility,
         extra       = EXCLUDED.extra
       RETURNING *`,
      [
        key, locale,
        title, description, keywords, og_image,
        canonical, no_index, visibility,
        JSON.stringify(extra),
      ]
    )
  ).rows;

  return row;
}

/**
 * List seo_records with optional filters (admin/internal use).
 */
async function listSeoRecords({ pool, locale, visibility, page = 1, pageSize = 50 } = {}) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (locale) {
    validateLocale(locale);
    conditions.push(`sr.locale = $${paramIndex++}`);
    params.push(locale);
  }
  if (visibility) {
    if (!["published", "draft"].includes(visibility)) {
      throw Object.assign(new Error(`Invalid visibility: "${visibility}"`), { status: 400 });
    }
    conditions.push(`sr.visibility = $${paramIndex++}`);
    params.push(visibility);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (Math.max(1, page) - 1) * pageSize;

  const [countResult, rows] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS total FROM seo_records sr ${where}`,
      params
    ),
    pool.query(
      `SELECT sr.*, sk.targets
       FROM   seo_records sr
       JOIN   seo_keys    sk ON sk.key = sr.seo_key
       ${where}
       ORDER BY sr.updated_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, pageSize, offset]
    ),
  ]);

  return {
    data: rows.rows,
    total: Number(countResult.rows[0].total),
    page,
    pageSize,
  };
}

/** Delete a single seo_record by key + locale. */
async function deleteSeoRecord({ pool, key, locale } = {}) {
  if (!key)    throw Object.assign(new Error("key is required"),    { status: 400 });
  if (!locale) throw Object.assign(new Error("locale is required"), { status: 400 });
  validateLocale(locale);

  const [row] = (
    await pool.query(
      "DELETE FROM seo_records WHERE seo_key = $1 AND locale = $2 RETURNING *",
      [key, locale]
    )
  ).rows;
  return row;
}

module.exports = {
  VALID_LOCALES,
  validateLocale,
  listSeoKeys,
  createSeoKey,
  deleteSeoKey,
  getSeo,
  upsertSeoRecord,
  listSeoRecords,
  deleteSeoRecord,
};
