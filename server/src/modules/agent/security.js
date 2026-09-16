const { createHash, createHmac, randomBytes, timingSafeEqual } = require("crypto");
const { failure } = require("./config");

const COOKIE = "cooyue_agent_visitor";
const RETENTION_SECONDS = 30 * 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function equal(left, right) {
  const first = Buffer.from(String(left || ""));
  const second = Buffer.from(String(right || ""));
  return first.length === second.length && timingSafeEqual(first, second);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function redact(value) {
  return String(value || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:sk|sess)-[a-z0-9_-]{12,}\b/gi, "[credential]")
    .replace(/\b(?:bearer|api[_ -]?key|password|密码)\s*[:=]?\s*\S+/gi, "[credential]")
    .replace(/(?<!\d)(?:\+?\d[\s-]?){11,15}(?!\d)/g, "[phone]")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function visitor(req, res, config, create = false) {
  const value = String(req.headers.cookie || "").split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || "";
  const [identifier, expiry, signature, extra] = value.split(".");
  const expires = Number(expiry);
  if (!extra && /^[a-f0-9]{64}$/.test(identifier || "") && /^\d{10}$/.test(expiry || "")
    && expires > Date.now() / 1000 && expires <= Date.now() / 1000 + RETENTION_SECONDS + 60
    && equal(signature, sign(`${identifier}.${expiry}`, config.cookieSecret))) {
    return { hash: digest(identifier), expiresAt: new Date(expires * 1000) };
  }
  if (!create) throw failure("SESSION_NOT_FOUND", 404);
  const token = randomBytes(32).toString("hex");
  const newExpiry = Math.floor(Date.now() / 1000) + RETENTION_SECONDS;
  const signed = `${token}.${newExpiry}.${sign(`${token}.${newExpiry}`, config.cookieSecret)}`;
  res.append("Set-Cookie", `${COOKIE}=${signed}; Path=/api/agent; HttpOnly; SameSite=Lax; Max-Age=${RETENTION_SECONDS}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return { hash: digest(token), expiresAt: new Date(newExpiry * 1000) };
}

function requireProxy(req, config) {
  if (!equal(req.get("x-agent-proxy-secret"), config.proxySecret) || config.proxySecret.length < 32) {
    throw failure("FORBIDDEN", 403);
  }
}

function messageInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).some((key) => !["message", "requestId"].includes(key))
    || typeof body.message !== "string" || !body.message.trim() || body.message.length > 1000
    || typeof body.requestId !== "string" || !UUID.test(body.requestId)) throw failure("INVALID_MESSAGE");
  return { message: redact(body.message.trim()), requestId: body.requestId };
}

module.exports = { COOKIE, RETENTION_SECONDS, UUID, digest, equal, messageInput, redact, requireProxy, visitor };
