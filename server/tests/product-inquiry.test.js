const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const express = require("express");
const { createService, text, slugsOf } = require("../src/modules/knowledge/service");
const { publicCatalogProduct, catalogScope } = require("../src/modules/knowledge/catalog");
const { features, normalizeVector, productVector, queryBranches, retrieveCatalog } = require("../src/modules/knowledge/catalog-retriever");
const { inquiryMessage } = require("../src/modules/knowledge/inquiry-delivery");
const mailer = require("../src/modules/contact/mailer");

function records() {
  return [
    { slug: "k10-board", name: "K10 视频转换板", category_name: "板卡", extra: { model: "K10", metrics: [{ label: "输出", value: "Ethernet" }, { label: "目录价格", value: "99" }] }, specifications: { cards: ["SDI 转以太网"] } },
    { slug: "ir-eyepiece", name: "红外镜头目镜", category_name: "红外镜头", extra: { model: "EP25" }, specifications: { cards: ["红外目镜"] } },
    { slug: "k100-board", name: "K100 转接板", category_name: "板卡", extra: { model: "K100" } },
    { slug: "game-computer", name: "游戏电脑", category_name: "计算机" },
  ].map((record) => ({ locale: "zh", category_slug: "components", tags: [], display_order: 0, visibility: "published", ...record }));
}

function fixturePool() {
  const products = records();
  const drafts = new Map();
  const tasks = new Map();
  const token = "a".repeat(64);
  let vectors = [];
  const pool = {
    products, drafts, tasks, token,
    async query(sql, parameters = []) {
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rows: [] };
      if (sql.startsWith("SELECT product.*")) {
        assert.match(sql, /category.visibility = 'published'/);
        assert.match(sql, /sample_entry/);
        return { rows: products.filter((product) => product.locale === parameters[0] && product.visibility === "published"
          && (!parameters[1] || parameters[1].includes(product.slug))) };
      }
      if (sql.startsWith("INSERT INTO knowledge.product_vectors")) { vectors = JSON.parse(parameters[2]); return { rows: [] }; }
      if (sql.startsWith("WITH query_vectors")) {
        const rows = JSON.parse(parameters[2]).flatMap((query, index) => vectors.map((vector) => ({
          product_slug: vector.slug, branch: index + 1,
          score: Object.entries(vector.vector).reduce((sum, [key, weight]) => sum + weight * (query[key] || 0), 0),
        })).filter((match) => match.score >= 0.06));
        return { rows };
      }
      if (sql.startsWith("INSERT INTO knowledge.inquiries")) {
        const draft = { id: randomUUID(), locale: parameters[0], confirmation_token_hash: parameters[1], summary: JSON.parse(parameters[2]),
          expires_at: new Date(Date.now() + 1800000), status: "draft", delivery_status: "pending" };
        drafts.set(draft.id, draft);
        return { rows: [draft] };
      }
      if (sql.startsWith("SELECT * FROM knowledge.inquiries")) {
        assert.match(sql, /FOR UPDATE$/);
        const draft = drafts.get(parameters[0]);
        return { rows: draft?.confirmation_token_hash === parameters[1] ? [draft] : [] };
      }
      if (sql.includes("INSERT INTO mail_tasks")) {
        const task = { id: randomUUID(), status: parameters[4] };
        tasks.set(task.id, task);
        return { rows: [task] };
      }
      if (sql.startsWith("UPDATE knowledge.inquiries")) {
        const draft = drafts.get(parameters[0]);
        if (sql.includes("delivery_status = 'sending'")) Object.assign(draft, { delivery_status: "sending", contact_name: parameters[1], contact_email: parameters[2], mail_task_id: parameters[3] });
        if (sql.includes("delivery_status = 'failed'")) draft.delivery_status = "failed";
        if (sql.includes("delivery_status = 'sent'")) Object.assign(draft, { delivery_status: "sent", status: "submitted", message_id: parameters[1] });
        return { rows: [draft], rowCount: 1 };
      }
      if (sql.includes("UPDATE mail_tasks")) {
        const task = tasks.get(parameters[0]); task.status = parameters[1];
        return { rows: [task] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
    async connect() { return { query: pool.query.bind(pool), release() {} }; },
  };
  return pool;
}

function mockMail(context, send) {
  context.mock.method(mailer, "getContactMailConfig", () => ({ enabled: true, recipientEmail: "staff@example.invalid", subjectPrefix: "Test inquiry" }));
  return context.mock.method(mailer, "sendContactEmail", send || (async () => ({ messageId: "test-inquiry" })));
}

async function draftFor(pool) {
  return createService(pool).draft({ locale: "zh", query: "K10 或红外目镜", requirements: "请确认配置", productSlugs: ["k10-board", "ir-eyepiece"] });
}

function confirmation(draft, overrides = {}) {
  return { confirmed: true, confirmationToken: draft.confirmationToken, name: "测试客户", email: "customer@example.invalid", ...overrides };
}

test("fuzzy alternative queries union catalog vectors and exact keywords", async () => {
  const result = await retrieveCatalog(fixturePool(), { locale: "zh", query: "我想要一个 K10 的板子或者是红外镜头的目镜" });
  assert.equal(result.matchMode, "any");
  assert.equal(result.provider, "postgres-sparse-vector");
  assert.ok(result.products.some((product) => product.slug === "k10-board"));
  assert.ok(result.products.some((product) => product.slug === "ir-eyepiece"));
  assert.ok(!result.products.some((product) => product.slug === "game-computer"));
  assert.equal(new Set(result.products.map((product) => product.slug)).size, result.products.length);
  assert.equal((await retrieveCatalog(fixturePool(), { locale: "zh", query: "K10" })).products[0].slug, "k10-board");
  assert.deepEqual((await retrieveCatalog(fixturePool(), { locale: "en", query: "K10" })).products, []);
});

test("sparse features support bilingual component aliases and model boundaries", () => {
  assert.ok(features("目镜")["concept:eyepiece"]);
  assert.ok(features("eyepiece")["concept:eyepiece"]);
  assert.ok(features("板子")["concept:board"]);
  assert.equal(features("K100")["term:k10"], undefined);
  assert.equal(Object.values(normalizeVector({ first: 3, second: 4 })).reduce((sum, weight) => sum + weight ** 2, 0), 1);
  assert.ok(productVector(records()[0])["term:k10"] > 0);
  assert.deepEqual(queryBranches("K10或者是目镜 or K10"), ["K10", "目镜"]);
  assert.match(catalogScope(), /product.visibility = 'published'/);
});

test("comparison handles twelve products and uses only internal product details without prices", async () => {
  const pool = fixturePool();
  pool.products.push(...Array.from({ length: 8 }, (_, index) => ({ ...pool.products[0], slug: `board-${index}` })));
  const result = await createService(pool).compare({ locale: "zh", productSlugs: pool.products.map((product) => product.slug) });
  assert.equal(result.products.length, 12);
  assert.ok(result.products.every((product) => product.detailPath.startsWith("/zh/products/") && !("price" in product)));
  assert.ok(result.products.every((product) => product.metrics.every((metric) => !metric.label.includes("价格"))));
  assert.throws(() => slugsOf(Array.from({ length: 13 }, (_, index) => `board-${index}`)));
});

test("draft enforces a combined 1000-character manual-content limit before storing", async () => {
  const pool = fixturePool();
  const service = createService(pool);
  const input = { locale: "zh", query: "K10", requirements: "字".repeat(997), productSlugs: ["k10-board"] };
  await service.draft(input);
  await assert.rejects(service.draft({ ...input, requirements: "字".repeat(998) }), /1000/);
  await assert.rejects(service.draft({ ...input, question: "额外" }), /1000/);
  await assert.rejects(service.draft({ ...input, requirements: " ".repeat(1001) }), /1000/);
  assert.equal(pool.drafts.size, 1);
  assert.equal(text("字".repeat(100), "name", 100).length, 100);
  assert.throws(() => text("字".repeat(101), "name", 100), /100/);
});

test("confirmation sends the selected products and contact details once, then returns sent", async (context) => {
  const send = mockMail(context);
  const pool = fixturePool();
  const service = createService(pool);
  const draft = await draftFor(pool);
  const result = await service.confirm(draft.id, confirmation(draft));
  assert.deepEqual(result, { status: "submitted", delivery: "sent" });
  assert.deepEqual(await service.confirm(draft.id, confirmation(draft)), result);
  assert.equal(send.mock.callCount(), 1);
  const payload = send.mock.calls[0].arguments[0];
  assert.match(payload.message, /K10 视频转换板/);
  assert.match(payload.message, /红外镜头目镜/);
  assert.match(payload.message, /https:\/\/www.cooyue.tech\/zh\/products\/k10-board/);
  assert.equal(payload.email, "customer@example.invalid");
  assert.equal(pool.drafts.get(draft.id).delivery_status, "sent");
  assert.equal([...pool.tasks.values()][0].status, "sent");
});

test("failed SMTP never reports success and a subsequent confirmation can retry", async (context) => {
  let attempts = 0;
  mockMail(context, async () => { attempts += 1; if (attempts === 1) throw new Error("SMTP unavailable"); return { messageId: "retry-sent" }; });
  const pool = fixturePool();
  const service = createService(pool);
  const draft = await draftFor(pool);
  await assert.rejects(service.confirm(draft.id, confirmation(draft)), /发送失败/);
  assert.equal(pool.drafts.get(draft.id).delivery_status, "failed");
  assert.equal(pool.drafts.get(draft.id).status, "draft");
  assert.equal((await service.confirm(draft.id, confirmation(draft))).delivery, "sent");
  assert.equal(attempts, 2);
});

test("in-progress delivery prevents duplicate SMTP requests", async (context) => {
  const send = mockMail(context);
  const pool = fixturePool();
  const draft = await draftFor(pool);
  pool.drafts.get(draft.id).delivery_status = "sending";
  await assert.rejects(createService(pool).confirm(draft.id, confirmation(draft)), { status: 409 });
  assert.equal(send.mock.callCount(), 0);
});

test("invalid consent, token, contacts, expiry and changed products cannot send", async (context) => {
  const send = mockMail(context);
  const pool = fixturePool();
  const draft = await draftFor(pool);
  const service = createService(pool);
  for (const overrides of [{ confirmed: false }, { confirmationToken: "b".repeat(64) }, { name: "字".repeat(101) },
    { name: "Test\r\nInjected" }, { email: `${"a".repeat(90)}@example.com` }, { email: "invalid" }]) {
    await assert.rejects(service.confirm(draft.id, confirmation(draft, overrides)));
  }
  pool.drafts.get(draft.id).expires_at = new Date(0);
  await assert.rejects(service.confirm(draft.id, confirmation(draft)), { status: 410 });
  pool.drafts.get(draft.id).expires_at = new Date(Date.now() + 60000);
  pool.products[0].name = "Updated K10";
  await assert.rejects(service.confirm(draft.id, confirmation(draft)), /changed/);
  pool.products[0].visibility = "draft";
  await assert.rejects(service.confirm(draft.id, confirmation(draft)), /available/);
  assert.equal(send.mock.callCount(), 0);
});

test("generated catalog context is not truncated by the manual content limit", () => {
  const product = publicCatalogProduct(records()[0]);
  const message = inquiryMessage({ query: "K10", requirements: "字".repeat(997), products: [product] }, "zh");
  assert.ok(message.length > 1000);
  assert.match(message, /\/zh\/products\/k10-board/);
  assert.ok(!message.includes("目录价格"));
});

test("contact endpoint rejects oversized raw name, email and message before delivery", async (context) => {
  const app = express();
  app.use(express.json());
  app.use("/contact", require("../src/modules/contact/routes"));
  const server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  for (const change of [{ name: "字".repeat(101) }, { email: `${"a".repeat(90)}@example.com` }, { message: "字".repeat(1001) }, { name: `${" ".repeat(100)}A` }]) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/contact`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Customer", email: "customer@example.invalid", message: "Inquiry", ...change }),
    });
    assert.equal(response.status, 400);
  }
});
