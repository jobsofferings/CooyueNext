const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const rateLimit = require("express-rate-limit");
const path    = require("path");
const { randomUUID } = require("crypto");

const healthRouter    = require("./routes/health");
const seoRouter       = require("./modules/seo/routes");
const productsRouter  = require("./modules/products/routes");

const app = express();
const staticDir = path.join(__dirname, "..", "static");

app.set("trust proxy", true);

// ── Security & middleware ──────────────────────────────────────────────────

app.use(
  helmet({
    // Allow Next.js frontend to load assets from CDNs if needed
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: true,       // mirror all origins (Next.js dev/prod hosts)
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/static", express.static(staticDir));

// ── Global rate-limiting ────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max:      Number(process.env.RATE_LIMIT_MAX)       || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests – please slow down." },
});

// Apply only to API routes
app.use("/api", limiter);

app.use((req, res, next) => {
  const startedAt = Date.now();
  const requestId = req.headers["x-request-id"] || randomUUID();

  req.id = requestId;
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  console.log("[request:start]", {
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    query: req.query,
  });

  res.on("finish", () => {
    console.log("[request:end]", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.json({
    message: "Cooyue server is running.",
    version: "1.0.0",
    docs:    "/api",
  });
});

// Debug endpoint - shows loaded env vars (remove in production)
app.get("/api/debug/env", (_req, res) => {
  res.json({
    ok: true,
    env: {
      PORT: process.env.PORT,
      PRODUCTS_DATABASE_URL: process.env.PRODUCTS_DATABASE_URL ? "(set)" : "(not set)",
      PRODUCTS_PG_HOST: process.env.PRODUCTS_PG_HOST,
      PRODUCTS_PG_DATABASE: process.env.PRODUCTS_PG_DATABASE,
      SEO_DATABASE_URL: process.env.SEO_DATABASE_URL ? "(set)" : "(not set)",
      SEO_PG_HOST: process.env.SEO_PG_HOST,
      SEO_PG_DATABASE: process.env.SEO_PG_DATABASE,
      SEO_WEBHOOK_SECRET: process.env.SEO_WEBHOOK_SECRET ? "(set)" : "(not set)",
    },
    cwd: process.cwd(),
  });
});

// Health check
app.use("/api/health", healthRouter);

/**
 * SEO endpoints
 *
 * Public (no auth needed):
 *   GET /api/seo/:key?locale=en   – Next.js reads page SEO metadata here
 *
 * Admin (add your auth middleware before these):
 *   GET    /api/seo              – list seo_keys
 *   POST   /api/seo              – create seo_key
 *   DELETE /api/seo/:key         – delete seo_key + all its records
 *   GET    /api/seo/records      – list seo_records
 *   GET    /api/seo/:key/detail  – get seo_key + locale record
 *   PUT    /api/seo/:key         – upsert seo_record
 *   DELETE /api/seo/:key/:locale – delete seo_record
 *   POST   /api/seo/webhook      – CMS push webhook (validates SEO_WEBHOOK_SECRET)
 */
app.use("/api/seo", seoRouter);

/**
 * Products endpoints
 *
 * Public (no auth needed):
 *   GET /api/products/categories        – list categories
 *   GET /api/products/categories/:slug  – get one category
 *   GET /api/products                   – list products (filter: locale, category,
 *                                        tags, minPrice, maxPrice, search, sortBy,
 *                                        sortDir, page, pageSize)
 *   GET /api/products/:slug             – get one product
 *
 * Admin (add your auth middleware before these):
 *   POST   /api/products/categories           – upsert category
 *   DELETE /api/products/categories/:slug    – delete category
 *   POST   /api/products                      – upsert product
 *   DELETE /api/products/:slug                – delete product
 */
app.use("/api/products", productsRouter);

// ── 404 fallback ───────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Not found",
    requestId: req.id || res.locals.requestId,
  });
});

// ── Global error handler ────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500
    ? "Internal server error"
    : err.message || "Unknown error";
  const details = {
    ...(err.publicDetails || {}),
    ...(err.code ? { code: err.code } : {}),
    ...(err.detail ? { detail: err.detail } : {}),
    ...(err.hint ? { hint: err.hint } : {}),
  };

  console.error("[error]", {
    requestId: req.id || res.locals.requestId,
    status,
    message: err.message,
    method: req.method,
    path: req.originalUrl,
    query: req.query,
    params: req.params,
    details,
    stack: status === 500 ? err.stack : undefined,
  });

  res.status(status).json({
    ok: false,
    error: message,
    requestId: req.id || res.locals.requestId,
    ...(Object.keys(details).length ? { details } : {}),
  });
});

module.exports = app;
