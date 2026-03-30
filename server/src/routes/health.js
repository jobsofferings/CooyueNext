const express = require("express");

const { pool } = require("../config/db");

const router = express.Router();

router.get("/", async (_req, res) => {
  let database = "not configured";

  if (process.env.DATABASE_URL) {
    console.log(process.env.DATABASE_URL, 'process.env.DATABASE_URL')
    try {
      const a =await pool.query("SELECT 1");
      console.log(a, 'a ')
      database = "connected";
    } catch (_error) {
      console.log(_error)
      database = "unavailable";
    }
  }

  res.json({
    ok: true,
    database,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
