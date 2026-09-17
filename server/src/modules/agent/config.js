function failure(code, status = 400) {
  return Object.assign(new Error(code), { code, status });
}

function integer(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function getConfig() {
  return {
    enabled: process.env.AGENT_ENABLED === "true",
    apiKey: process.env.AGENT_API_KEY || "",
    baseURL: process.env.AGENT_BASE_URL || "",
    allowedHttpBaseURL: process.env.AGENT_ALLOWED_HTTP_BASE_URL || "",
    httpSiteOrigins: (process.env.AGENT_HTTP_SITE_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean),
    model: process.env.AGENT_CHAT_MODEL || "",
    embeddingModel: process.env.AGENT_EMBEDDING_MODEL || "",
    dimensions: integer(process.env.AGENT_EMBEDDING_DIMENSIONS, 1536, 64, 4096),
    cookieSecret: process.env.AGENT_COOKIE_SECRET || "",
    proxySecret: process.env.AGENT_PROXY_SECRET || "",
    newsOrigin: process.env.AGENT_NEWS_ORIGIN || "http://127.0.0.1:3000",
    timeoutMs: integer(process.env.AGENT_TIMEOUT_MS, 60000, 5000, 60000),
    selectTimeoutMs: integer(process.env.AGENT_SELECT_TIMEOUT_MS, 18000, 1000, 25000),
    explainTimeoutMs: integer(process.env.AGENT_EXPLAIN_TIMEOUT_MS, 15000, 1000, 20000),
    maxConcurrent: integer(process.env.AGENT_MAX_CONCURRENT, 4, 1, 10),
    dailyBudget: integer(process.env.AGENT_DAILY_RUN_LIMIT, 500, 1, 10000),
    visitorHourlyLimit: integer(process.env.AGENT_VISITOR_HOURLY_LIMIT, 20, 1, 100),
    minSimilarity: Number(process.env.AGENT_MIN_SIMILARITY) > 0 && Number(process.env.AGENT_MIN_SIMILARITY) < 1
      ? Number(process.env.AGENT_MIN_SIMILARITY) : 0.35,
  };
}

function validateConfig(config) {
  if (!config.enabled) throw failure("AGENT_DISABLED", 503);
  if (config.cookieSecret.length < 32 || config.proxySecret.length < 32 || !config.apiKey || !config.model) {
    throw failure("AGENT_NOT_CONFIGURED", 503);
  }
  let endpoint;
  try { endpoint = new URL(config.baseURL); } catch { throw failure("AGENT_NOT_CONFIGURED", 503); }
  const allowedHttp = endpoint.protocol === "http:" && config.baseURL.replace(/\/+$/, "") === (config.allowedHttpBaseURL || "").replace(/\/+$/, "");
  if ((endpoint.protocol !== "https:" && !allowedHttp) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw failure("AGENT_NOT_CONFIGURED", 503);
  }
  for (const origin of config.httpSiteOrigins || []) {
    let site;
    try { site = new URL(origin); } catch { throw failure("AGENT_NOT_CONFIGURED", 503); }
    if (site.protocol !== "http:" || site.origin !== origin || site.username || site.password) throw failure("AGENT_NOT_CONFIGURED", 503);
  }
}

module.exports = { failure, getConfig, integer, validateConfig };
