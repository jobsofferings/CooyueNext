const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const rateLimit = require("express-rate-limit");
const path    = require("path");
const { randomUUID } = require("crypto");

const healthRouter    = require("./routes/health");
const seoRouter       = require("./modules/seo/routes");
const productsRouter  = require("./modules/products/routes");
const mailRouter      = require("./modules/mail/routes");
const contactRouter   = require("./modules/contact/routes");
const managementRouter = require("./modules/management/routes");
const knowledgeRouters = require("./modules/knowledge/routes");
const {
  router: authRouter,
  authenticateSession,
  requireManagementAuthForApi,
} = require("./modules/auth/routes");

const app = express();
const staticDir = path.join(__dirname, "..", "static");

app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);

function isPrivateNetworkAddress(address) {
  const normalized = String(address || "").replace(/^::ffff:/i, "");
  return normalized === "::1"
    || /^10\./.test(normalized)
    || /^127\./.test(normalized)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
    || /^192\.168\./.test(normalized)
    || /^(fc|fd)[0-9a-f]{2}:/i.test(normalized)
    || /^fe80:/i.test(normalized);
}

function isServerRenderedRequest(req) {
  return req.method === "GET"
    && req.get("x-cooyue-internal") === "server-rendered"
    && isPrivateNetworkAddress(req.socket?.remoteAddress);
}

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
  skip: isServerRenderedRequest,
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

app.use(authenticateSession);

// ── Routes ─────────────────────────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.json({
    message: "Cooyue server is running.",
    version: "1.0.0",
    docs:    "/api",
  });
});

app.use("/api", authRouter);
app.use("/api/contact", contactRouter);
app.use("/api/knowledge", knowledgeRouters.publicRouter);
app.use("/api", requireManagementAuthForApi);
app.use("/api/knowledge/admin", knowledgeRouters.adminRouter);

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
 *   GET /api/seo/by-path?path=/about&locale=en – Next.js reads page SEO metadata here
 *
 * Admin (requires management login):
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
 *   GET /api/products/:slug/related     – get related products in same category
 *
 * Admin (requires management login):
 *   POST   /api/products/categories           – upsert category
 *   DELETE /api/products/categories/:slug    – delete category
 *   POST   /api/products                      – upsert product
 *   DELETE /api/products/:slug                – delete product
 */
app.use("/api/products", productsRouter);
app.use("/api/mail", mailRouter);
app.use("/api/management", managementRouter);

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
