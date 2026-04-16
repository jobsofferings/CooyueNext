const express = require("express");
const { getProductsPool } = require("../../config/db");
const mailQueries = require("./queries");

const router = express.Router();

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

function badRequest(res, message) {
  return res.status(400).json({
    ok: false,
    error: message,
    requestId: res.locals.requestId,
  });
}

function notFound(res, message = "Not found") {
  return res.status(404).json({
    ok: false,
    error: message,
    requestId: res.locals.requestId,
  });
}

router.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const pool = await getProductsPool();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

    const result = await mailQueries.listMailTasks({
      pool,
      status: req.query.status || null,
      search: req.query.search || null,
      page,
      pageSize,
    });

    return ok(res, result);
  })
);

router.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    if (!req.body?.data) {
      return badRequest(res, '"data" is required');
    }

    const pool = await getProductsPool();
    const row = await mailQueries.createMailTask({ pool, data: req.body.data });
    return ok(res, { data: row }, 201);
  })
);

router.put(
  "/tasks/:id",
  asyncHandler(async (req, res) => {
    if (!req.body?.data) {
      return badRequest(res, '"data" is required');
    }

    const pool = await getProductsPool();
    const row = await mailQueries.updateMailTask({ pool, id: req.params.id, data: req.body.data });
    if (!row) {
      return notFound(res, `Mail task "${req.params.id}" not found`);
    }
    return ok(res, { data: row });
  })
);

router.post(
  "/tasks/:id/queue",
  asyncHandler(async (req, res) => {
    const pool = await getProductsPool();
    const row = await mailQueries.setMailTaskStatus({ pool, id: req.params.id, status: "queued" });
    if (!row) {
      return notFound(res, `Mail task "${req.params.id}" not found`);
    }
    return ok(res, { data: row });
  })
);

router.post(
  "/tasks/:id/mark-sent",
  asyncHandler(async (req, res) => {
    const pool = await getProductsPool();
    const row = await mailQueries.setMailTaskStatus({ pool, id: req.params.id, status: "sent" });
    if (!row) {
      return notFound(res, `Mail task "${req.params.id}" not found`);
    }
    return ok(res, { data: row });
  })
);

router.delete(
  "/tasks/:id",
  asyncHandler(async (req, res) => {
    const pool = await getProductsPool();
    const row = await mailQueries.deleteMailTask({ pool, id: req.params.id });
    if (!row) {
      return notFound(res, `Mail task "${req.params.id}" not found`);
    }
    return ok(res, { deleted: row });
  })
);

module.exports = router;
