const express = require("express");
const { getProductsPool } = require("../../config/db");
const mailQueries = require("../mail/queries");
const { buildContactEmail, getContactMailConfig, sendContactEmail } = require("./mailer");

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

function serviceUnavailable(res, message) {
  return res.status(503).json({
    ok: false,
    error: message,
    requestId: res.locals.requestId,
  });
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstForwardedIp(headerValue) {
  return String(headerValue || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)[0] || "";
}

function normalizePayload(body) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const payload = input.data && typeof input.data === "object" && !Array.isArray(input.data) ? input.data : input;

  return {
    name: trimText(payload.name),
    email: trimText(payload.email),
    message: trimText(payload.message),
    lang: trimText(payload.lang) || "en",
    pagePath: trimText(payload.pagePath),
    sourceUrl: trimText(payload.sourceUrl),
  };
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getTaskMetadata({ payload, req, submittedAt }) {
  return {
    source: "contact-form",
    locale: payload.lang,
    pagePath: payload.pagePath || null,
    sourceUrl: payload.sourceUrl || null,
    referrer: req.get("referer") || null,
    userAgent: req.get("user-agent") || null,
    ip: firstForwardedIp(req.headers["x-forwarded-for"]) || req.ip || null,
    submittedAt,
    sender: {
      name: payload.name,
      email: payload.email,
    },
  };
}

function buildTaskData({ payload, config, req, submittedAt }) {
  const email = buildContactEmail({
    locale: payload.lang,
    name: payload.name,
    email: payload.email,
    message: payload.message,
    pagePath: payload.pagePath,
    referrer: req.get("referer") || payload.sourceUrl || null,
    ip: firstForwardedIp(req.headers["x-forwarded-for"]) || req.ip || null,
    userAgent: req.get("user-agent") || null,
    submittedAt,
    subjectPrefix: config.subjectPrefix,
  });

  return {
    recipient_email: config.recipientEmail,
    subject: email.subject,
    template_key: "contact-form",
    body_preview: email.text,
    status: "queued",
    scheduled_at: null,
    sent_at: null,
    last_error: null,
    metadata: getTaskMetadata({ payload, req, submittedAt }),
  };
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = normalizePayload(req.body);

    if (!payload.name) {
      return badRequest(res, '"name" is required');
    }
    if (!payload.email) {
      return badRequest(res, '"email" is required');
    }
    if (!validateEmail(payload.email)) {
      return badRequest(res, '"email" must be a valid email address');
    }
    if (!payload.message) {
      return badRequest(res, '"message" is required');
    }
    if (payload.message.length > 5000) {
      return badRequest(res, '"message" is too long');
    }

    const config = getContactMailConfig();
    const submittedAt = new Date().toISOString();
    let pool = null;
    let task = null;

    try {
      pool = await getProductsPool();
    } catch (error) {
      console.warn("[contact] Unable to open products pool for logging:", error.message);
    }

    if (pool) {
      try {
        task = await mailQueries.createMailTask({
          pool,
          data: buildTaskData({ payload, config, req, submittedAt }),
        });
      } catch (error) {
        console.warn("[contact] Unable to persist contact task:", error.message);
      }
    }

    if (!config.enabled) {
      if (pool && task) {
        try {
          await mailQueries.setMailTaskStatus({
            pool,
            id: task.id,
            status: "failed",
            last_error: "Contact mail service is not configured",
          });
        } catch (error) {
          console.warn("[contact] Unable to mark task failed:", error.message);
        }
      }

      return serviceUnavailable(res, "Contact mail service is not configured");
    }

    try {
      const delivery = await sendContactEmail({
        locale: payload.lang,
        name: payload.name,
        email: payload.email,
        message: payload.message,
        pagePath: payload.pagePath,
        referrer: req.get("referer") || payload.sourceUrl || null,
        ip: firstForwardedIp(req.headers["x-forwarded-for"]) || req.ip || null,
        userAgent: req.get("user-agent") || null,
        submittedAt,
      });

      if (pool && task) {
        try {
          await mailQueries.setMailTaskStatus({
            pool,
            id: task.id,
            status: "sent",
          });
        } catch (error) {
          console.warn("[contact] Unable to mark task sent:", error.message);
        }
      }

      return ok(
        res,
        {
          message: "Contact message sent successfully",
          data: {
            taskId: task?.id || null,
            messageId: delivery.messageId,
            logged: Boolean(task),
          },
        },
        201
      );
    } catch (error) {
      if (pool && task) {
        try {
          await mailQueries.setMailTaskStatus({
            pool,
            id: task.id,
            status: "failed",
            last_error: error.message,
          });
        } catch (taskError) {
          console.warn("[contact] Unable to mark task failed:", taskError.message);
        }
      }

      const status = error.status || 502;
      return res.status(status).json({
        ok: false,
        error: status === 503 ? "Contact mail service is not configured" : "Failed to send contact message",
        requestId: res.locals.requestId,
        details: {
          reason: error.message,
        },
      });
    }
  })
);

module.exports = router;
