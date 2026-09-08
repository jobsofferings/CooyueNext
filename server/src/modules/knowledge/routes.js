const express = require("express");
const rateLimit = require("express-rate-limit");
const { getProductsPool } = require("../../config/db");
const { createService } = require("./service");

function createRouters(resolvePool = getProductsPool) {
  const publicRouter = express.Router();
  const adminRouter = express.Router();
  const limitDrafts = rateLimit({ windowMs: 60 * 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false,
    message: { ok: false, error: "Too many inquiry drafts; try again later" } });
  publicRouter.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  const handle = (operation) => async (req, res, next) => {
    try {
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return res.status(400).json({ ok: false, error: "Invalid request body" });
      const service = createService(await resolvePool());
      const data = operation === "confirm" ? await service.confirm(req.params.id, req.body) : await service[operation](req.body);
      res.status(operation === "draft" ? 201 : 200).json({ ok: true, data });
    } catch (error) { next(error); }
  };
  publicRouter.post("/search", handle("search"));
  publicRouter.post("/compare", handle("compare"));
  publicRouter.post("/answer", handle("answer"));
  publicRouter.post("/inquiries/draft", limitDrafts, handle("draft"));
  publicRouter.post("/inquiries/:id/confirm", handle("confirm"));

  adminRouter.get("/inquiries", async (_req, res, next) => {
    try {
      const pool = await resolvePool();
      const { rows } = await pool.query(`SELECT id, locale, summary, status, contact_name, contact_email, confirmed_at
        FROM knowledge.inquiries WHERE status = 'submitted' ORDER BY confirmed_at DESC LIMIT 100`);
      res.set("Cache-Control", "no-store").json({ ok: true, data: rows });
    } catch (error) { next(error); }
  });
  return { publicRouter, adminRouter };
}

module.exports = { ...createRouters(), createRouters };
