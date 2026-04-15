/**
 * Products HTTP handlers
 *
 * Public:
 *   GET  /products/categories          – list categories
 *   GET  /products/categories/:slug    – get one category
 *   GET  /products                      – list products_key
 *   GET  /products/:slug               – get one product
 *   GET  /products/:slug/related       – list related products in same category
 *
 * Admin (secured later – currently open; see app.js prefix comment):
 *   POST      /products/categories           – upsert category
 *   DELETE    /products/categories/:slug    – delete category
 *   POST      /products                      – upsert product
 *   DELETE    /products/:slug                – delete product
 */

const express = require("express");
const { getProductsPool } = require("../../config/db");
const productQueries = require("./queries");

const router = express.Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function ok(res, data, status = 200) {
  return res.status(status).json({
    ok: true,
    requestId: res.locals.requestId,
    ...data,
  });
}

function notFound(res, message = "Not found") {
  return res.status(404).json({
    ok: false,
    error: message,
    requestId: res.locals.requestId,
  });
}

function badRequest(res, message) {
  return res.status(400).json({
    ok: false,
    error: message,
    requestId: res.locals.requestId,
  });
}

async function writeProduct(req, res) {
  const pool = await getProductsPool();
  const pathSlug = req.params.slug;
  const { slug: bodySlug, locale, data } = req.body;
  const slug = pathSlug || bodySlug;

  if (!slug)   return badRequest(res, '"slug" is required');
  if (!locale) return badRequest(res, '"locale" is required');
  if (pathSlug && bodySlug && pathSlug !== bodySlug) {
    return badRequest(res, '"slug" in body must match URL path');
  }

  const row = await productQueries.upsertProduct({ pool, slug, locale, data });
  return ok(res, { data: row }, req.method === "POST" ? 201 : 200);
}

function validateQueryLocale(locale) {
  if (!locale) return "en";
  if (!productQueries.VALID_LOCALES.includes(locale)) {
    throw Object.assign(new Error(`Invalid locale: "${locale}"`), { status: 400 });
  }
  return locale;
}

function parseBool(value) {
  if (value === undefined || value === null) return undefined;
  return value === "true" || value === true;
}

function attachRouteDebug(err, debug) {
  err.publicDetails = { ...(err.publicDetails || {}), ...debug };
  return err;
}

// ════════════════════════════════════════════════════════════════════════════════
//  CATEGORIES
// ════════════════════════════════════════════════════════════════════════════════

// GET /products/categories
router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const locale     = validateQueryLocale(req.query.locale);
    const includeHidden = parseBool(req.query.includeHidden) ?? false;
    const requestMeta = {
      requestId: req.id,
      route: "GET /api/products/categories",
      locale,
      includeHidden,
      query: req.query,
    };

    console.log("[products.categories] request", requestMeta);

    try {
      const pool = await getProductsPool();
      const rows = await productQueries.listCategories({ pool, locale, includeHidden });

      console.log("[products.categories] success", {
        ...requestMeta,
        total: rows.length,
      });

      return ok(res, {
        data: rows,
        total: rows.length,
        meta: {
          locale,
          includeHidden,
        },
      });
    } catch (err) {
      console.error("[products.categories] failed", {
        ...requestMeta,
        error: err.message,
        code: err.code,
        detail: err.detail,
      });

      throw attachRouteDebug(err, {
        route: "GET /api/products/categories",
        locale,
        includeHidden,
      });
    }
  })
);

// GET /products/categories/:slug
router.get(
  "/categories/:slug",
  asyncHandler(async (req, res) => {
    const pool   = await getProductsPool();
    const locale = validateQueryLocale(req.query.locale);
    const row    = await productQueries.getCategory({ pool, slug: req.params.slug, locale });
    if (!row) return notFound(res, `Category "${req.params.slug}" not found`);
    return ok(res, { data: row });
  })
);

// POST /products/categories
router.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const pool   = await getProductsPool();
    const { slug, locale, data } = req.body;
    if (!slug)   return badRequest(res, '"slug" is required');
    if (!locale) return badRequest(res, '"locale" is required');

    const row = await productQueries.upsertCategory({ pool, slug, locale, data });
    return ok(res, { data: row }, 201);
  })
);

// DELETE /products/categories/:slug?locale=en
router.delete(
  "/categories/:slug",
  asyncHandler(async (req, res) => {
    const pool   = await getProductsPool();
    const locale = req.query.locale || "en";
    const row    = await productQueries.deleteCategory({ pool, slug: req.params.slug, locale });
    if (!row) return notFound(res, `Category "${req.params.slug}" (locale: ${locale}) not found`);
    return ok(res, { deleted: row });
  })
);

// ════════════════════════════════════════════════════════════════════════════════
//  PRODUCTS
// ════════════════════════════════════════════════════════════════════════════════

// GET /products
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const pool      = await getProductsPool();
    const locale    = validateQueryLocale(req.query.locale);
    const page      = Math.max(1, Number(req.query.page)     || 1);
    const pageSize  = Math.min(100, Number(req.query.pageSize) || 20);
    const includeHidden = parseBool(req.query.includeHidden) ?? false;

    const result = await productQueries.listProducts({
      pool, locale,
      categorySlug:  req.query.category || null,
      tags:          req.query.tags     || null,
      visibility:    includeHidden ? null : "published",
      minPrice:      req.query.minPrice  !== undefined ? Number(req.query.minPrice)  : null,
      maxPrice:      req.query.maxPrice  !== undefined ? Number(req.query.maxPrice)  : null,
      search:        req.query.search    || null,
      page, pageSize,
      sortBy:        req.query.sortBy    || "display_order",
      sortDir:       req.query.sortDir   || "ASC",
    });

    return ok(res, result);
  })
);

// GET /products/:slug
router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const pool   = await getProductsPool();
    const locale = validateQueryLocale(req.query.locale);

    const row = await productQueries.getProduct({ pool, slug: req.params.slug, locale });

    if (!row) {
      return notFound(res, `Product "${req.params.slug}" not found`);
    }
    if (row.visibility !== "published") {
      return notFound(res, `Product "${req.params.slug}" not found`);
    }

    return ok(res, { data: row });
  })
);

// GET /products/:slug/related
router.get(
  "/:slug/related",
  asyncHandler(async (req, res) => {
    const pool   = await getProductsPool();
    const locale = validateQueryLocale(req.query.locale);
    const limit  = Math.min(12, Math.max(1, Number(req.query.limit) || 3));
    const includeHidden = parseBool(req.query.includeHidden) ?? false;

    const product = await productQueries.getProduct({ pool, slug: req.params.slug, locale });
    if (!product) {
      return notFound(res, `Product "${req.params.slug}" not found`);
    }
    if (!includeHidden && product.visibility !== "published") {
      return notFound(res, `Product "${req.params.slug}" not found`);
    }

    const rows = await productQueries.listRelatedProducts({
      pool,
      slug: req.params.slug,
      locale,
      limit,
      includeHidden,
    });

    return ok(res, {
      data: rows,
      total: rows.length,
      meta: {
        locale,
        limit,
        sourceSlug: req.params.slug,
      },
    });
  })
);

// POST /products
router.post(
  "/",
  asyncHandler(writeProduct)
);

// PUT /products/:slug
router.put(
  "/:slug",
  asyncHandler(writeProduct)
);

// DELETE /products/:slug?locale=en
router.delete(
  "/:slug",
  asyncHandler(async (req, res) => {
    const pool   = await getProductsPool();
    const locale = req.query.locale || "en";
    const row    = await productQueries.deleteProduct({ pool, slug: req.params.slug, locale });
    if (!row) return notFound(res, `Product "${req.params.slug}" (locale: ${locale}) not found`);
    return ok(res, { deleted: row });
  })
);

module.exports = router;
