const crypto = require("crypto");
const express = require("express");

const router = express.Router();

const COOKIE_NAME = "cooyue_admin_session";
const DEFAULT_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function getAdminConfig() {
  return {
    username: process.env.MANAGEMENT_ADMIN_USERNAME || "admin",
    password: process.env.MANAGEMENT_ADMIN_PASSWORD || "",
    sessionSecret:
      process.env.MANAGEMENT_SESSION_SECRET ||
      process.env.MANAGEMENT_ADMIN_PASSWORD ||
      "cooyue-management-session-dev",
    sessionMaxAgeSeconds:
      Number(process.env.MANAGEMENT_SESSION_MAX_AGE_SECONDS) ||
      DEFAULT_SESSION_MAX_AGE_SECONDS,
  };
}

function currentUser(username) {
  return {
    name: username,
    avatar: "/logo.svg",
    userid: username,
    email: "admin@cooyue.com",
    access: "admin",
  };
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};

  return String(cookieHeader)
    .split(";")
    .reduce((cookies, part) => {
      const index = part.indexOf("=");
      if (index === -1) return cookies;

      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (!key) return cookies;

      try {
        cookies[key] = decodeURIComponent(value);
      } catch (_err) {
        cookies[key] = value;
      }

      return cookies;
    }, {});
}

function signPayload(encodedPayload) {
  const { sessionSecret } = getAdminConfig();
  return crypto
    .createHmac("sha256", sessionSecret)
    .update(encodedPayload)
    .digest("base64url");
}

function createSessionToken(username) {
  const { sessionMaxAgeSeconds } = getAdminConfig();
  const payload = {
    sub: username,
    access: "admin",
    exp: Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  if (!safeEqual(signature, signPayload(encodedPayload))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    const { username } = getAdminConfig();

    if (payload.access !== "admin") return null;
    if (payload.sub !== username) return null;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

    return currentUser(payload.sub);
  } catch (_err) {
    return null;
  }
}

function cookieOptions(req, maxAgeSeconds) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const secure = Boolean(req.secure || forwardedProto === "https");

  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    secure ? "Secure" : "",
  ].filter(Boolean);
}

function setSessionCookie(req, res, token) {
  const { sessionMaxAgeSeconds } = getAdminConfig();
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieOptions(req, sessionMaxAgeSeconds).join("; ")}`
  );
}

function clearSessionCookie(req, res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; ${cookieOptions(req, 0).join("; ")}`
  );
}

function unauthorized(req, res) {
  return res.status(401).json({
    ok: false,
    success: false,
    error: "Unauthorized",
    errorCode: "401",
    errorMessage: "请先登录",
    requestId: req.id || res.locals.requestId,
  });
}

function authenticateSession(req, _res, next) {
  const cookies = parseCookies(req.headers.cookie);
  req.currentUser = verifySessionToken(cookies[COOKIE_NAME]);
  next();
}

function requireManagementAuth(req, res, next) {
  if (req.currentUser?.access === "admin") return next();
  return unauthorized(req, res);
}

function parseBool(value) {
  return value === true || value === "true";
}

function isProtectedApiRequest(req) {
  const requestPath = req.path;

  if (requestPath === "/health" || requestPath.startsWith("/health/")) return false;
  if (requestPath === "/currentUser" || requestPath.startsWith("/login/")) return false;
  if (req.method === "GET" && requestPath === "/seo/by-path") return false;
  if (req.method === "POST" && requestPath === "/seo/webhook") return false;

  if (req.method === "GET" && requestPath.startsWith("/products")) {
    return parseBool(req.query.includeHidden);
  }

  return true;
}

function requireManagementAuthForApi(req, res, next) {
  if (!isProtectedApiRequest(req)) return next();
  return requireManagementAuth(req, res, next);
}

router.get("/currentUser", (req, res) => {
  if (!req.currentUser) return unauthorized(req, res);

  return res.json({
    ok: true,
    success: true,
    data: req.currentUser,
  });
});

router.post("/login/account", (req, res) => {
  const { username, password } = getAdminConfig();
  const requestedType = req.body?.type || "account";
  const loginOk =
    requestedType === "account" &&
    Boolean(password) &&
    safeEqual(req.body?.username, username) &&
    safeEqual(req.body?.password, password);

  if (!loginOk) {
    clearSessionCookie(req, res);
    return res.json({
      ok: true,
      success: true,
      status: "error",
      type: requestedType,
      currentAuthority: "guest",
    });
  }

  setSessionCookie(req, res, createSessionToken(username));

  return res.json({
    ok: true,
    success: true,
    status: "ok",
    type: requestedType,
    currentAuthority: "admin",
    data: currentUser(username),
  });
});

router.post("/login/outLogin", (req, res) => {
  clearSessionCookie(req, res);
  return res.json({
    ok: true,
    success: true,
    data: {},
  });
});

module.exports = {
  router,
  authenticateSession,
  requireManagementAuthForApi,
};
