const nodemailer = require("nodemailer");

const DEFAULT_RECIPIENT_EMAIL = "a2821740092@gmail.com";
const DEFAULT_FROM_NAME = "Cooyue Contact";
const DEFAULT_SUBJECT_PREFIX = "Cooyue Contact";

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function inferSmtpHost(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  if (normalized.endsWith("@gmail.com")) {
    return "smtp.gmail.com";
  }

  if (normalized.endsWith("@qq.com")) {
    return "smtp.qq.com";
  }

  return "";
}

function getSmtpConfig(prefix, fallbackUser = "") {
  const smtpUser = String(
    process.env[`${prefix}_USER`] || fallbackUser
  ).trim();
  const smtpPass = String(process.env[`${prefix}_PASS`] || "").replace(/\s+/g, "");
  const smtpHost = String(
    process.env[`${prefix}_HOST`] || inferSmtpHost(smtpUser)
  ).trim();
  const smtpPort = Number(process.env[`${prefix}_PORT`]) || 465;
  const secure = parseBoolean(process.env[`${prefix}_SECURE`], smtpPort === 465);
  const requireTLS = parseBoolean(
    process.env[`${prefix}_REQUIRE_TLS`],
    !secure && smtpPort === 587
  );

  return {
    smtpUser,
    smtpPass,
    smtpHost,
    smtpPort,
    secure,
    requireTLS,
    enabled: Boolean(smtpUser && smtpPass && smtpHost),
  };
}

function getContactMailConfig() {
  const recipientEmail = String(
    process.env.CONTACT_RECIPIENT_EMAIL ||
      process.env.CONTACT_SMTP_USER ||
      DEFAULT_RECIPIENT_EMAIL
  ).trim();
  const smtpConfig = getSmtpConfig(
    "CONTACT_SMTP",
    process.env.CONTACT_FROM_EMAIL || recipientEmail
  );
  const transports = [getSmtpConfig("CONTACT_QQ_SMTP"), smtpConfig].filter(
    (config) => config.enabled
  );
  const connectionTimeoutMs = parsePositiveInteger(
    process.env.CONTACT_SMTP_CONNECTION_TIMEOUT_MS,
    15_000
  );
  const greetingTimeoutMs = parsePositiveInteger(
    process.env.CONTACT_SMTP_GREETING_TIMEOUT_MS,
    15_000
  );
  const socketTimeoutMs = parsePositiveInteger(
    process.env.CONTACT_SMTP_SOCKET_TIMEOUT_MS,
    30_000
  );
  const fromName = String(process.env.CONTACT_FROM_NAME || DEFAULT_FROM_NAME).trim();
  const subjectPrefix = String(
    process.env.CONTACT_MAIL_SUBJECT_PREFIX || DEFAULT_SUBJECT_PREFIX
  ).trim();

  return {
    ...smtpConfig,
    recipientEmail,
    connectionTimeoutMs,
    greetingTimeoutMs,
    socketTimeoutMs,
    fromName,
    subjectPrefix,
    transports,
    enabled: Boolean(recipientEmail && transports.length),
  };
}

function getLocaleLabelSet(locale) {
  const isZh = String(locale || "").toLowerCase().startsWith("zh");

  if (isZh) {
    return {
      subject: "网站留言",
      title: "来自网站的留言",
      name: "姓名",
      email: "邮箱",
      pagePath: "页面",
      referrer: "来源",
      ip: "IP",
      userAgent: "浏览器",
      submittedAt: "提交时间",
      message: "留言内容",
    };
  }

  return {
    subject: "New contact message",
    title: "New contact form submission",
    name: "Name",
    email: "Email",
    pagePath: "Page",
    referrer: "Referrer",
    ip: "IP",
    userAgent: "User Agent",
    submittedAt: "Submitted at",
    message: "Message",
  };
}

function buildContactEmail({
  locale,
  name,
  email,
  message,
  pagePath,
  referrer,
  ip,
  userAgent,
  submittedAt,
  subjectPrefix = DEFAULT_SUBJECT_PREFIX,
}) {
  const labels = getLocaleLabelSet(locale);
  const subject = String(
    String(locale || "").toLowerCase().startsWith("zh")
      ? `【${subjectPrefix}】${name}`
      : `[${subjectPrefix}] ${name}`
  );

  const lines = [
    labels.title,
    "",
    `${labels.name}: ${name}`,
    `${labels.email}: ${email}`,
    `${labels.pagePath}: ${pagePath || "-"}`,
    `${labels.referrer}: ${referrer || "-"}`,
    `${labels.ip}: ${ip || "-"}`,
    `${labels.userAgent}: ${userAgent || "-"}`,
    `${labels.submittedAt}: ${submittedAt}`,
    "",
    `${labels.message}:`,
    message,
  ];

  return {
    subject,
    text: lines.join("\n"),
  };
}

function createTransport(config) {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.secure,
    requireTLS: config.requireTLS,
    connectionTimeout: config.connectionTimeoutMs,
    greetingTimeout: config.greetingTimeoutMs,
    socketTimeout: config.socketTimeoutMs,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

async function sendContactEmail(payload = {}) {
  const config = getContactMailConfig();
  if (!config.enabled) {
    throw Object.assign(new Error("Contact mail service is not configured"), {
      status: 503,
    });
  }

  const content = buildContactEmail({
    ...payload,
    subjectPrefix: config.subjectPrefix,
  });

  for (const [attemptIndex, smtpConfig] of config.transports.entries()) {
    try {
      const transport = createTransport({ ...config, ...smtpConfig });
      const info = await transport.sendMail({
        from: `"${config.fromName}" <${smtpConfig.smtpUser}>`,
        to: config.recipientEmail,
        replyTo: payload.email,
        subject: content.subject,
        text: content.text,
        ...(payload.messageId ? { messageId: payload.messageId } : {}),
      });

      return {
        messageId: info.messageId,
        envelope: info.envelope,
        recipientEmail: config.recipientEmail,
      };
    } catch (error) {
      if (attemptIndex === config.transports.length - 1) {
        throw error;
      }

      console.warn(
        `[contact] SMTP delivery via ${smtpConfig.smtpHost} failed; trying fallback:`,
        error.code || "SMTP_ERROR"
      );
    }
  }
}

module.exports = {
  DEFAULT_RECIPIENT_EMAIL,
  getContactMailConfig,
  buildContactEmail,
  sendContactEmail,
};
