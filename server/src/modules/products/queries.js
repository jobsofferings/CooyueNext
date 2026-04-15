/**
 * Products module – SQL queries
 *
 * Naming conventions
 *   get   – single row
 *   list  – multiple rows, paginated / filterable
 *   exist – boolean check
 */

const VALID_LOCALES = ["en", "zh"];

// ── helpers ────────────────────────────────────────────────────────────────

function validateLocale(locale) {
  if (!VALID_LOCALES.includes(locale)) {
    throw Object.assign(new Error(`Invalid locale: "${locale}"`), { status: 400 });
  }
}

// ── product_categories ──────────────────────────────────────────────────────

/** List categories (flat or nested), optionally filtered by locale. */
async function listCategories({ pool, locale, includeHidden = false } = {}) {
  const conditions = [];
  const params    = [];
  let   idx       = 1;

  if (locale) {
    validateLocale(locale);
    conditions.push(`locale = $${idx++}`);
    params.push(locale);
  }
  if (!includeHidden) {
    conditions.push(`visibility = 'published'`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `SELECT slug, parent_slug, locale, name, description, display_order,
            visibility, created_at, updated_at
     FROM   product_categories
     ${where}
     ORDER BY display_order ASC, name ASC`,
    params
  );
  return rows;
}

/** Get a single category by slug + locale. */
async function getCategory({ pool, slug, locale } = {}) {
  if (!slug) throw Object.assign(new Error("slug is required"), { status: 400 });
  if (!locale) throw Object.assign(new Error("locale is required"), { status: 400 });
  validateLocale(locale);

  const { rows } = await pool.query(
    `SELECT slug, parent_slug, locale, name, description, display_order,
            visibility, created_at, updated_at
     FROM   product_categories
     WHERE  slug = $1 AND locale = $2`,
    [slug, locale]
  );
  return rows[0] || null;
}

/** Upsert a product category. */
async function upsertCategory({ pool, slug, locale, data = {} } = {}) {
  if (!slug)   throw Object.assign(new Error("slug is required"),   { status: 400 });
  if (!locale) throw Object.assign(new Error("locale is required"), { status: 400 });
  validateLocale(locale);

  const { name = null, description = null, parent_slug = null,
          display_order = 0, visibility = "draft" } = data;

  if (!["published", "draft"].includes(visibility)) {
    throw Object.assign(new Error(`Invalid visibility: "${visibility}"`), { status: 400 });
  }

  const [row] = (
    await pool.query(
      `INSERT INTO product_categories
         (slug, parent_slug, locale, name, description, display_order, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug, locale) DO UPDATE SET
         name          = EXCLUDED.name,
         description   = EXCLUDED.description,
         parent_slug    = EXCLUDED.parent_slug,
         display_order  = EXCLUDED.display_order,
         visibility     = EXCLUDED.visibility
       RETURNING *`,
      [slug, parent_slug, locale, name, description, display_order, visibility]
    )
  ).rows;

  return row;
}

/** Delete a product category. Returns the deleted row. */
async function deleteCategory({ pool, slug, locale } = {}) {
  if (!slug)   throw Object.assign(new Error("slug is required"),   { status: 400 });
  if (!locale) throw Object.assign(new Error("locale is required"), { status: 400 });
  validateLocale(locale);

  const { rows } = await pool.query(
    "DELETE FROM product_categories WHERE slug = $1 AND locale = $2 RETURNING *",
    [slug, locale]
  );
  return rows[0] || null;
}

// ── products_key ────────────────────────────────────────────────────────────────

/**
 * List products_key with optional filters.
 * Public calls should omit includeHidden / set it to false.
 */
async function listProducts({
  pool,
  locale,
  categorySlug = null,
  tags         = null,   // string[] or comma-separated
  visibility  = null,
  minPrice    = null,
  maxPrice    = null,
  search      = null,   // ILIKE on name + short_description
  page        = 1,
  pageSize    = 20,
  includeHidden = false,
  sortBy      = "display_order",  // display_order | price | created_at | name
  sortDir     = "ASC",
} = {}) {
  const conditions = [];
  const params    = [];
  let   idx       = 1;

  if (locale) {
    validateLocale(locale);
    conditions.push(`p.locale = $${idx++}`);
    params.push(locale);
  }
  if (categorySlug) {
    conditions.push(`p.category_slug = $${idx++}`);
    params.push(categorySlug);
  }
  if (!includeHidden || visibility) {
    const v = visibility || "published";
    conditions.push(`p.visibility = $${idx++}`);
    params.push(v);
  }
  if (minPrice !== null) {
    conditions.push(`p.price >= $${idx++}`);
    params.push(minPrice);
  }
  if (maxPrice !== null) {
    conditions.push(`p.price <= $${idx++}`);
    params.push(maxPrice);
  }
  if (search) {
    const s = `%${search}%`;
    conditions.push(`(p.name ILIKE $${idx} OR p.short_description ILIKE $${idx})`);
    idx++;
    params.push(s);
  }
  if (tags) {
    const tagArr = Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim());
    conditions.push(`p.tags && $${idx++}`);
    params.push(tagArr);
  }

  const where   = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset  = (Math.max(1, page) - 1) * pageSize;
  const validSortCols = { display_order: 1, price: 1, created_at: 1, name: 1 };
  const col     = validSortCols[sortBy] ? sortBy : "display_order";
  const dir     = sortDir === "DESC" ? "DESC" : "ASC";

  const [countResult, rows] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM products_key p ${where}`, params),
    pool.query(
      `SELECT p.slug, p.category_slug, p.locale, p.name, p.short_description,
              p.description, p.price, p.original_price, p.currency,
              p.images, p.tags, p.specifications,
              p.display_order, p.visibility, p.extra,
              c.name AS category_name,
              p.created_at, p.updated_at
       FROM   products_key p
       LEFT JOIN product_categories c
         ON c.slug = p.category_slug
        AND c.locale = p.locale
       ${where}
       ORDER BY ${col} ${dir}
       LIMIT  $${idx++} OFFSET $${idx}`,
      [...params, pageSize, offset]
    ),
  ]);

  return {
    data:  rows.rows,
    total: Number(countResult.rows[0].total),
    page,
    pageSize,
  };
}

/** Get a single product by slug + locale. */
async function getProduct({ pool, slug, locale } = {}) {
  if (!slug)   throw Object.assign(new Error("slug is required"),   { status: 400 });
  if (!locale) throw Object.assign(new Error("locale is required"), { status: 400 });
  validateLocale(locale);

  const { rows } = await pool.query(
    `SELECT *
     FROM   products_key
     WHERE  slug = $1 AND locale = $2`,
    [slug, locale]
  );
  return rows[0] || null;
}

async function listRelatedProducts({ pool, slug, locale, limit = 3, includeHidden = false } = {}) {
  if (!slug)   throw Object.assign(new Error("slug is required"),   { status: 400 });
  if (!locale) throw Object.assign(new Error("locale is required"), { status: 400 });
  validateLocale(locale);

  const visibilityClause = includeHidden ? "" : `AND p.visibility = 'published'`;

  const { rows } = await pool.query(
    `WITH current_product AS (
       SELECT category_slug, locale
       FROM   products_key
       WHERE  slug = $1 AND locale = $2
       LIMIT 1
     )
     SELECT p.slug, p.category_slug, p.locale, p.name, p.short_description,
            p.description, p.price, p.original_price, p.currency,
            p.images, p.tags, p.specifications,
            p.display_order, p.visibility, p.extra,
            c.name AS category_name,
            p.created_at, p.updated_at
     FROM   products_key p
     JOIN   current_product cp
       ON   cp.category_slug = p.category_slug
      AND   cp.locale = p.locale
     LEFT JOIN product_categories c
       ON   c.slug = p.category_slug
      AND   c.locale = p.locale
     WHERE  p.slug <> $1
       AND  p.locale = $2
       ${visibilityClause}
     ORDER BY p.display_order ASC, p.name ASC
     LIMIT  $3`,
    [slug, locale, Math.max(1, Number(limit) || 3)]
  );

  return rows;
}

/**
 * Upsert a product.
 * If visibility is omitted, defaults to 'draft' (safe default for admin writes).
 */
async function upsertProduct({ pool, slug, locale, data = {} } = {}) {
  if (!slug)   throw Object.assign(new Error("slug is required"),   { status: 400 });
  if (!locale) throw Object.assign(new Error("locale is required"), { status: 400 });
  validateLocale(locale);

  const {
    category_slug    = null,
    name              = null,
    short_description = null,
    description       = null,
    price             = null,
    original_price    = null,
    currency          = "USD",
    images            = [],
    tags              = [],
    specifications    = {},
    visibility        = "draft",
    display_order     = 0,
    extra             = {},
  } = data;

  if (!["published", "draft"].includes(visibility)) {
    throw Object.assign(new Error(`Invalid visibility: "${visibility}"`), { status: 400 });
  }

  const [row] = (
    await pool.query(
      `INSERT INTO products_key
         (slug, category_slug, locale, name, short_description, description,
          price, original_price, currency, images, tags, specifications,
          visibility, display_order, extra)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (slug, locale) DO UPDATE SET
         name              = EXCLUDED.name,
         short_description  = EXCLUDED.short_description,
         description       = EXCLUDED.description,
         category_slug     = EXCLUDED.category_slug,
         price             = EXCLUDED.price,
         original_price    = EXCLUDED.original_price,
         currency          = EXCLUDED.currency,
         images            = EXCLUDED.images,
         tags              = EXCLUDED.tags,
         specifications    = EXCLUDED.specifications,
         visibility        = EXCLUDED.visibility,
         display_order     = EXCLUDED.display_order,
         extra             = EXCLUDED.extra
       RETURNING *`,
      [
        slug, category_slug, locale,
        name, short_description, description,
        price, original_price, currency,
        images, tags,
        JSON.stringify(specifications),
        visibility, display_order,
        JSON.stringify(extra),
      ]
    )
  ).rows;

  return row;
}

/** Delete a product. Returns the deleted row. */
async function deleteProduct({ pool, slug, locale } = {}) {
  if (!slug)   throw Object.assign(new Error("slug is required"),   { status: 400 });
  if (!locale) throw Object.assign(new Error("locale is required"), { status: 400 });
  validateLocale(locale);

  const { rows } = await pool.query(
    "DELETE FROM products_key WHERE slug = $1 AND locale = $2 RETURNING *",
    [slug, locale]
  );
  return rows[0] || null;
}

module.exports = {
  VALID_LOCALES,
  validateLocale,
  listCategories,
  getCategory,
  upsertCategory,
  deleteCategory,
  listProducts,
  getProduct,
  listRelatedProducts,
  upsertProduct,
  deleteProduct,
};
