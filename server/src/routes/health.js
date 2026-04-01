const express = require("express");

const { getProductsPool, getSeoPool } = require("../config/db");

const router = express.Router();

async function checkPool(name, poolFn) {
  try {
    const pool = await poolFn();
    await pool.query("SELECT 1");
    return { name, status: "connected" };
  } catch (_error) {
    return { name, status: "unavailable", error: _error.message };
  }
}

router.get("/", async (_req, res) => {
  const [products, seo] = await Promise.all([
    checkPool("products", getProductsPool),
    checkPool("seo",      getSeoPool),
  ]);

  const allUp = products.status === "connected" && seo.status === "connected";

  res.json({
    ok: allUp,
    databases: { products, seo },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
