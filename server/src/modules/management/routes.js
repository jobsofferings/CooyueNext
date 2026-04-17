const express = require("express");
const { getProductsPool, getSeoPool } = require("../../config/db");
const { isMissingMailTasksTableError } = require("../mail/queries");

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function queryMailOverview(pool) {
  try {
    const [mailSummary, recentMail] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'queued') AS queued,
           COUNT(*) FILTER (WHERE status = 'failed') AS failed
         FROM mail_tasks`
      ),
      pool.query(
        `SELECT id, recipient_email, subject, status, updated_at
         FROM mail_tasks
         ORDER BY updated_at DESC
         LIMIT 5`
      ),
    ]);

    return {
      available: true,
      summary: mailSummary.rows[0],
      recent: recentMail.rows,
    };
  } catch (err) {
    if (!isMissingMailTasksTableError(err)) {
      throw err;
    }

    return {
      available: false,
      summary: {
        total: "0",
        queued: "0",
        failed: "0",
      },
      recent: [],
    };
  }
}

router.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [productsPool, seoPool] = await Promise.all([getProductsPool(), getSeoPool()]);

    const [productSummary, seoSummary, mailOverview, recentProducts, recentSeo] =
      await Promise.all([
        productsPool.query(
          `SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE visibility = 'published') AS published,
             COUNT(*) FILTER (WHERE visibility = 'draft') AS draft
           FROM products_key`
        ),
        seoPool.query(
          `SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE visibility = 'published') AS published,
             COUNT(*) FILTER (WHERE visibility = 'draft') AS draft
           FROM seo_records`
        ),
        queryMailOverview(productsPool),
        productsPool.query(
          `SELECT slug, locale, name, visibility, updated_at
           FROM products_key
           ORDER BY updated_at DESC
           LIMIT 5`
        ),
        seoPool.query(
          `SELECT seo_key, locale, title, visibility, updated_at
           FROM seo_records
           ORDER BY updated_at DESC
           LIMIT 5`
        ),
      ]);

    res.json({
      ok: true,
      requestId: res.locals.requestId,
      data: {
        products: productSummary.rows[0],
        seo: seoSummary.rows[0],
        mail: mailOverview.summary,
        recentProducts: recentProducts.rows,
        recentSeo: recentSeo.rows,
        recentMail: mailOverview.recent,
        mailAvailable: mailOverview.available,
      },
    });
  })
);

module.exports = router;
