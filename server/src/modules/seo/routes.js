/**
 * SEO HTTP handlers
 *
 * Public:
 *   GET  /api/seo/:key?locale=en    – page SEO  (next.js calls this)
 *
 * Admin (prefix /api/admin/seo – swap the prefix in app.js to add auth):
 *   GET    /seo               – list seo_keys
 *   POST   /seo               – create seo_key
 *   DELETE /seo/:key           – delete seo_key + all its records
 *   GET    /seo/records        – list seo_records
 *   GET    /seo/:key           – get seo_key + specific locale record
 *   PUT    /seo/:key           – upsert seo_record
 *   DELETE /seo/:key/:locale  – delete seo_record
 *   POST   /seo/webhook        – receive CMS push (optional)
 */

const express = require("express");
const { getSeoPool } = require("../../config/db");
const seoQueries = require("./queries");

const router = express.Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, ...data });
}

function notFound(res, message = "Not found") {
  return res.status(404).json({ ok: false, error: message });
}

function badRequest(res, message) {
  return res.status(400).json({ ok: false, error: message });
}

function validateQueryLocale(locale) {
  if (!locale) return "en";
  if (!seoQueries.VALID_LOCALES.includes(locale)) {
    throw Object.assign(new Error(`Invalid locale: "${locale}"`), { status: 400 });
  }
  return locale;
}

// ── ADMIN  GET /api/seo ─────────────────────────────────────────────────────

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const pool = await getSeoPool();
    const page     = Number(req.query.page)     || 1;
    const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);

    const result = await seoQueries.listSeoKeys({ pool, page, pageSize });
    return ok(res, result);
  })
);

// ── ADMIN  POST /api/seo  – create seo_key ──────────────────────────────────

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const pool = await getSeoPool();
    const { key, targets = [] } = req.body;

    if (!key) return badRequest(res, '"key" is required');

    const row = await seoQueries.createSeoKey({ pool, key, targets });
    return ok(res, { data: row }, 201);
  })
);

// ── ADMIN  DELETE /api/seo/:key ─────────────────────────────────────────────

router.delete(
  "/:key",
  asyncHandler(async (req, res) => {
    const pool = await getSeoPool();
    const row = await seoQueries.deleteSeoKey({ pool, key: req.params.key });
    if (!row) return notFound(res, `SEO key "${req.params.key}" not found`);
    return ok(res, { deleted: row.key });
  })
);

// ── ADMIN  GET /api/seo/records ──────────────────────────────────────────────

router.get(
  "/records",
  asyncHandler(async (req, res) => {
    const pool      = await getSeoPool();
    const page      = Number(req.query.page)     || 1;
    const pageSize  = Math.min(Number(req.query.pageSize) || 50, 200);
    const locale    = req.query.locale    || null;
    const visibility = req.query.visibility || null;

    const result = await seoQueries.listSeoRecords({ pool, locale, visibility, page, pageSize });
    return ok(res, result);
  })
);

// ── ADMIN  GET /api/seo/:key (full key detail) ───────────────────────────────

router.get(
  "/:key/detail",
  asyncHandler(async (req, res) => {
    const pool   = await getSeoPool();
    const locale = req.query.locale ? validateQueryLocale(req.query.locale) : null;

    const result = await seoQueries.getSeo({ pool, key: req.params.key, locale: locale || "en" });
    if (!result) return notFound(res, `SEO key "${req.params.key}" not found`);

    return ok(res, { data: result });
  })
);

// ── PUBLIC  GET /api/seo/:key ────────────────────────────────────────────────

/**
 * Public-facing SEO endpoint consumed by Next.js pages.
 * Keep this route after the static admin GET routes so "/records" and
 * "/:key/detail" are not swallowed by the catch-all param route.
 */
router.get(
  "/:key",
  asyncHandler(async (req, res) => {
    const { key } = req.params;
    const locale = validateQueryLocale(req.query.locale);
    const pool = await getSeoPool();

    const result = await seoQueries.getSeo({ pool, key, locale });

    if (!result) {
      return notFound(res, `SEO key "${key}" not found`);
    }

    const record = result.record;
    if (!record || record.visibility !== "published") {
      return notFound(res, `No published SEO record for key "${key}" (locale: ${locale})`);
    }

    return ok(res, {
      key: result.key.key,
      locale,
      title: record.title,
      description: record.description,
      keywords: record.keywords,
      og_image: record.og_image,
      canonical: record.canonical,
      no_index: record.no_index,
      extra: record.extra,
    });
  })
);

// ── ADMIN  PUT /api/seo/:key ────────────────────────────────────────────────

router.put(
  "/:key",
  asyncHandler(async (req, res) => {
    const pool   = await getSeoPool();
    const { key: pathKey } = req.params;
    const { locale, ...data } = req.body;

    if (!locale) return badRequest(res, '"locale" is required in body');

    const row = await seoQueries.upsertSeoRecord({ pool, key: pathKey, locale, data });
    return ok(res, { data: row });
  })
);

// ── ADMIN  DELETE /api/seo/:key/:locale ─────────────────────────────────────

router.delete(
  "/:key/:locale",
  asyncHandler(async (req, res) => {
    const pool   = await getSeoPool();
    const { key, locale } = req.params;
    const row = await seoQueries.deleteSeoRecord({ pool, key, locale });
    if (!row) return notFound(res, `No seo_record for key "${key}" locale "${locale}"`);
    return ok(res, { deleted: row });
  })
);

// ── WEBHOOK  POST /api/seo/webhook ───────────────────────────────────────────

router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const secret = process.env.SEO_WEBHOOK_SECRET;
    if (secret) {
      const sig = req.headers["x-webhook-secret"];
      if (sig !== secret) {
        return badRequest(res, "Invalid webhook secret");
      }
    }

    // Expected payload shape mirrors the PUT body
    const { key, locale, data } = req.body;
    if (!key || !locale || !data) {
      return badRequest(res, '"key", "locale" and "data" are required');
    }

    const pool = await getSeoPool();
    const row  = await seoQueries.upsertSeoRecord({ pool, key, locale, data });
    return ok(res, { message: "SEO record updated via webhook", data: row });
  })
);

module.exports = router;
