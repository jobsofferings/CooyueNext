const { afterEach, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const nodemailer = require("nodemailer");
const { getContactMailConfig, sendContactEmail } = require("../src/modules/contact/mailer");

const qqAuthorization = randomUUID();
const gmailAuthorization = randomUUID();
const payload = {
  locale: "zh",
  name: "Test Visitor",
  email: "visitor@example.com",
  message: "Contact message for SMTP fallback testing.",
  pagePath: "/zh/contact",
  submittedAt: "2026-09-08T00:00:00.000Z",
};
const deliveryInfo = {
  messageId: "test-message-id",
  envelope: { to: ["recipient@example.com"] },
};
let originalContactEnv;

function clearContactEnv() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("CONTACT_")) {
      delete process.env[key];
    }
  }
}

beforeEach(() => {
  originalContactEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.startsWith("CONTACT_"))
  );
  clearContactEnv();
  Object.assign(process.env, {
    CONTACT_RECIPIENT_EMAIL: "recipient@example.com",
    CONTACT_FROM_NAME: "Cooyue Contact",
    CONTACT_MAIL_SUBJECT_PREFIX: "Cooyue Contact",
    CONTACT_QQ_SMTP_USER: "sender@qq.com",
    CONTACT_QQ_SMTP_PASS: qqAuthorization,
    CONTACT_SMTP_HOST: "smtp.gmail.com",
    CONTACT_SMTP_PORT: "587",
    CONTACT_SMTP_SECURE: "false",
    CONTACT_SMTP_REQUIRE_TLS: "true",
    CONTACT_SMTP_USER: "sender@gmail.com",
    CONTACT_SMTP_PASS: gmailAuthorization,
  });
});

afterEach(() => {
  clearContactEnv();
  Object.assign(process.env, originalContactEnv);
});

function mockTransports(testContext, responses) {
  const attempts = [];
  testContext.mock.method(nodemailer, "createTransport", (options) => {
    const attemptIndex = attempts.length;
    const attempt = { options };
    attempts.push(attempt);

    return {
      async sendMail(message) {
        attempt.message = message;
        const response = responses[attemptIndex];
        assert.ok(response, "Unexpected SMTP attempt");
        if (response instanceof Error) {
          throw response;
        }
        return response;
      },
    };
  });
  testContext.mock.method(console, "warn", () => {});
  return attempts;
}

test("QQ is first while the original Gmail configuration remains available", () => {
  const config = getContactMailConfig();
  assert.equal(config.enabled, true);
  assert.equal(config.recipientEmail, "recipient@example.com");
  assert.equal(config.smtpUser, "sender@gmail.com");
  assert.equal(config.smtpPass, gmailAuthorization);
  assert.deepEqual(config.transports.map((transport) => transport.smtpHost), [
    "smtp.qq.com",
    "smtp.gmail.com",
  ]);
  assert.equal(config.transports[0].smtpPort, 465);
  assert.equal(config.transports[0].secure, true);
  assert.equal(config.transports[0].requireTLS, false);
  assert.equal(config.transports[1].smtpPort, 587);
  assert.equal(config.transports[1].secure, false);
  assert.equal(config.transports[1].requireTLS, true);
});

test("SMTP settings and authorization whitespace are parsed independently", () => {
  Object.assign(process.env, {
    CONTACT_QQ_SMTP_HOST: " smtp.qq.com ",
    CONTACT_QQ_SMTP_USER: " sender@qq.com ",
    CONTACT_QQ_SMTP_PASS: ` ${qqAuthorization} \n`,
    CONTACT_QQ_SMTP_PORT: "587",
    CONTACT_QQ_SMTP_SECURE: "false",
    CONTACT_QQ_SMTP_REQUIRE_TLS: "true",
  });
  const [qqConfig, gmailConfig] = getContactMailConfig().transports;
  assert.equal(qqConfig.smtpHost, "smtp.qq.com");
  assert.equal(qqConfig.smtpUser, "sender@qq.com");
  assert.equal(qqConfig.smtpPass, qqAuthorization);
  assert.equal(qqConfig.smtpPort, 587);
  assert.equal(qqConfig.secure, false);
  assert.equal(qqConfig.requireTLS, true);
  assert.equal(gmailConfig.smtpPass, gmailAuthorization);
});

test("QQ success returns immediately without creating a Gmail transport", async (testContext) => {
  const attempts = mockTransports(testContext, [deliveryInfo]);
  const result = await sendContactEmail(payload);

  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].options.host, "smtp.qq.com");
  assert.equal(attempts[0].options.port, 465);
  assert.equal(attempts[0].options.secure, true);
  assert.deepEqual(attempts[0].options.auth, {
    user: "sender@qq.com",
    pass: qqAuthorization,
  });
  assert.equal(attempts[0].message.from, '"Cooyue Contact" <sender@qq.com>');
  assert.equal(attempts[0].message.to, "recipient@example.com");
  assert.equal(attempts[0].message.replyTo, payload.email);
  assert.equal(attempts[0].message.subject, "【Cooyue Contact】Test Visitor");
  assert.match(attempts[0].message.text, /Contact message for SMTP fallback testing\./);
  assert.deepEqual(result, { ...deliveryInfo, recipientEmail: "recipient@example.com" });
  assert.equal(console.warn.mock.callCount(), 0);
});

for (const code of ["ETIMEDOUT", "EAUTH", "ECONNECTION", "EENVELOPE", "EMESSAGE"]) {
  test(`QQ ${code} failure retries the same message through Gmail`, async (testContext) => {
    const qqError = Object.assign(new Error("QQ SMTP failed"), { code });
    const attempts = mockTransports(testContext, [qqError, deliveryInfo]);
    const result = await sendContactEmail(payload);

    assert.deepEqual(attempts.map((attempt) => attempt.options.host), [
      "smtp.qq.com",
      "smtp.gmail.com",
    ]);
    assert.equal(attempts[1].options.port, 587);
    assert.equal(attempts[1].options.secure, false);
    assert.equal(attempts[1].options.requireTLS, true);
    assert.deepEqual(attempts[1].options.auth, {
      user: "sender@gmail.com",
      pass: gmailAuthorization,
    });
    assert.deepEqual(attempts[1].message, {
      ...attempts[0].message,
      from: '"Cooyue Contact" <sender@gmail.com>',
    });
    assert.equal(result.messageId, deliveryInfo.messageId);
    assert.equal(console.warn.mock.callCount(), 1);
    assert.equal(console.warn.mock.calls[0].arguments[1], code);
  });
}

test("both providers failing propagates the final Gmail error", async (testContext) => {
  const qqError = new Error("QQ unavailable");
  const gmailError = Object.assign(new Error("Gmail unavailable"), { code: "EAUTH" });
  const attempts = mockTransports(testContext, [qqError, gmailError]);

  await assert.rejects(sendContactEmail(payload), (error) => error === gmailError);
  assert.equal(attempts.length, 2);
});

test("transport initialization failure also falls back to Gmail", async (testContext) => {
  const hosts = [];
  testContext.mock.method(console, "warn", () => {});
  testContext.mock.method(nodemailer, "createTransport", (options) => {
    hosts.push(options.host);
    if (options.host === "smtp.qq.com") {
      throw new Error("Unable to initialize QQ transport");
    }
    return { async sendMail() { return deliveryInfo; } };
  });

  await sendContactEmail(payload);
  assert.deepEqual(hosts, ["smtp.qq.com", "smtp.gmail.com"]);
});

for (const missingKey of ["CONTACT_QQ_SMTP_USER", "CONTACT_QQ_SMTP_PASS"]) {
  test(`incomplete QQ configuration (${missingKey}) preserves Gmail-only sending`, async (testContext) => {
    delete process.env[missingKey];
    const attempts = mockTransports(testContext, [deliveryInfo]);

    await sendContactEmail(payload);
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].options.host, "smtp.gmail.com");
    assert.equal(console.warn.mock.callCount(), 0);
  });
}

test("QQ works when Gmail is not configured", async (testContext) => {
  delete process.env.CONTACT_SMTP_PASS;
  const attempts = mockTransports(testContext, [deliveryInfo]);

  assert.equal(getContactMailConfig().enabled, true);
  await sendContactEmail(payload);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].options.host, "smtp.qq.com");
});

test("a sole configured transport failure is not retried", async (testContext) => {
  delete process.env.CONTACT_SMTP_PASS;
  const qqError = new Error("QQ unavailable");
  const attempts = mockTransports(testContext, [qqError]);

  await assert.rejects(sendContactEmail(payload), (error) => error === qqError);
  assert.equal(attempts.length, 1);
  assert.equal(console.warn.mock.callCount(), 0);
});

test("unconfigured mail service fails with 503 without connecting", async (testContext) => {
  clearContactEnv();
  const attempts = mockTransports(testContext, []);

  assert.equal(getContactMailConfig().enabled, false);
  await assert.rejects(sendContactEmail(payload), { status: 503 });
  assert.equal(attempts.length, 0);
});

test("legacy Gmail sender inference and default recipient are preserved", () => {
  clearContactEnv();
  process.env.CONTACT_SMTP_PASS = gmailAuthorization;
  let config = getContactMailConfig();
  assert.equal(config.enabled, true);
  assert.equal(config.recipientEmail, "a2821740092@gmail.com");
  assert.equal(config.transports[0].smtpUser, config.recipientEmail);
  assert.equal(config.transports[0].smtpHost, "smtp.gmail.com");

  process.env.CONTACT_FROM_EMAIL = "legacy@gmail.com";
  config = getContactMailConfig();
  assert.equal(config.transports[0].smtpUser, "legacy@gmail.com");
  assert.equal(config.recipientEmail, "a2821740092@gmail.com");
});

test("both transports retain the configured connection timeouts", async (testContext) => {
  Object.assign(process.env, {
    CONTACT_SMTP_CONNECTION_TIMEOUT_MS: "1200",
    CONTACT_SMTP_GREETING_TIMEOUT_MS: "2300",
    CONTACT_SMTP_SOCKET_TIMEOUT_MS: "3400",
  });
  const attempts = mockTransports(testContext, [new Error("QQ timed out"), deliveryInfo]);

  await sendContactEmail(payload);
  for (const { options } of attempts) {
    assert.equal(options.connectionTimeout, 1200);
    assert.equal(options.greetingTimeout, 2300);
    assert.equal(options.socketTimeout, 3400);
  }
});
