const nodemailer = require("nodemailer");

const DEFAULT_RECIPIENT_EMAIL = "cooyue@gmail.com";
const DEFAULT_FROM_NAME = "Cooyue Contact";
const DEFAULT_SUBJECT_PREFIX = "Cooyue Contact";

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
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

function getContactMailConfig() {
  const recipientEmail = String(
    process.env.CONTACT_RECIPIENT_EMAIL ||
      process.env.CONTACT_SMTP_USER ||
      DEFAULT_RECIPIENT_EMAIL
  ).trim();
  const smtpUser = String(
    process.env.CONTACT_SMTP_USER ||
      process.env.CONTACT_FROM_EMAIL ||
      recipientEmail
  ).trim();
  const smtpPass = String(process.env.CONTACT_SMTP_PASS || "").replace(/\s+/g, "");
  const smtpHost = String(
    process.env.CONTACT_SMTP_HOST || inferSmtpHost(smtpUser)
  ).trim();
  const smtpPort = Number(process.env.CONTACT_SMTP_PORT) || 465;
  const secure = parseBoolean(process.env.CONTACT_SMTP_SECURE, smtpPort === 465);
  const fromName = String(process.env.CONTACT_FROM_NAME || DEFAULT_FROM_NAME).trim();
  const subjectPrefix = String(
    process.env.CONTACT_MAIL_SUBJECT_PREFIX || DEFAULT_SUBJECT_PREFIX
  ).trim();

  return {
    recipientEmail,
    smtpUser,
    smtpPass,
    smtpHost,
    smtpPort,
    secure,
    fromName,
    subjectPrefix,
    enabled: Boolean(recipientEmail && smtpUser && smtpPass && smtpHost),
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

  const transport = createTransport(config);
  const content = buildContactEmail({
    ...payload,
    subjectPrefix: config.subjectPrefix,
  });
  const info = await transport.sendMail({
    from: `"${config.fromName}" <${config.smtpUser}>`,
    to: config.recipientEmail,
    replyTo: payload.email,
    subject: content.subject,
    text: content.text,
  });

  return {
    messageId: info.messageId,
    envelope: info.envelope,
    recipientEmail: config.recipientEmail,
  };
}

module.exports = {
  DEFAULT_RECIPIENT_EMAIL,
  getContactMailConfig,
  buildContactEmail,
  sendContactEmail,
};
