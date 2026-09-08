const { randomBytes } = require("crypto");
const { isDeepStrictEqual } = require("util");
const { CATEGORY, hash, getDocuments } = require("./store");
const { analyzeQuery, createRetriever } = require("./retriever");
const { getCatalog, publicCatalogProduct } = require("./catalog");
const { retrieveCatalog } = require("./catalog-retriever");
const { prepareDelivery, deliverInquiry } = require("./inquiry-delivery");

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

function text(value, name, maximum = 1000, required = true) {
  if (value == null && !required) return "";
  if (typeof value !== "string" || value.length > maximum || (required && !value.trim())) fail(`Invalid ${name} (maximum ${maximum} characters)`);
  return value.trim();
}

function localeOf(value) {
  if (!["zh", "en"].includes(value)) fail("locale must be zh or en");
  return value;
}

function slugsOf(value, minimum = 1) {
  if (!Array.isArray(value) || value.length < minimum || value.length > 12
    || value.some((slug) => typeof slug !== "string" || !/^[a-z0-9-]{1,120}$/.test(slug))
    || new Set(value).size !== value.length) fail("Select up to twelve distinct products");
  return value;
}

function publicProduct(document) {
  return {
    slug: document.product_slug, name: document.product_name, category: CATEGORY,
    facts: document.facts, price: document.price === null ? null : Number(document.price), currency: document.currency,
    source: { title: document.title, url: document.source_url, version: document.version, reviewedAt: new Date(document.reviewed_at).toISOString() },
  };
}

function createService(pool) {
  const retriever = createRetriever(pool);

  async function selectedProducts(locale, slugs, connection = pool) {
    const records = await getCatalog(connection, locale, slugs);
    return slugs.map((slug) => {
      const record = records.find((product) => product.slug === slug);
      if (!record) fail("A selected product is no longer available; please review your selection", 409);
      return publicCatalogProduct(record);
    });
  }

  async function selectedDocuments(locale, slugs) {
    const documents = await getDocuments(pool, locale);
    return slugs.map((slug) => {
      const document = documents.find((item) => item.product_slug === slug);
      if (!document) fail("A selected product has no current, approved public evidence", 409);
      return document;
    });
  }

  return {
    async search(input) {
      return retrieveCatalog(pool, { locale: localeOf(input.locale), query: text(input.query, "query", 500) });
    },

    async searchReviewed(input) {
      const locale = localeOf(input.locale);
      const query = text(input.query, "query", 500);
      const result = await retriever.retrieve({ query, locale, requireAll: true });
      const unique = new Map(result.matches.map(({ document }) => [document.product_slug, publicProduct(document)]));
      return {
        mode: "lexical-validation", provider: retriever.name, category: CATEGORY, query, matchMode: "all",
        status: result.clarification ? "needs_clarification" : unique.size ? "matches" : "no_matches",
        clarification: result.clarification ? {
          ...result.clarification,
          message: result.clarification.reason === "unsupported_conditions"
            ? locale === "zh"
              ? "查询包含当前无法可靠判定的范围、排除、备选关系或同一配置要求。暂不返回候选，也不会忽略这些限制；请拆分为明确条件，或交由工程师核对。"
              : "The query includes a range, exclusion, alternative or single-configuration requirement that cannot be reliably checked. No candidates are returned and no conditions are silently dropped. Please use explicit conditions or ask an engineer to verify them."
            : locale === "zh"
              ? "“烷”还不能确定具体气体。你是否想查“甲烷”？确认补全后再按该气体筛选，不会仅凭“手持”推荐产品。"
              : 'The gas name “烷” is incomplete. Did you mean methane? Confirm the gas before filtering; handheld alone is not sufficient.',
        } : null,
        products: [...unique.values()],
      };
    },

    async compare(input) {
      const locale = localeOf(input.locale);
      return { products: await selectedProducts(locale, slugsOf(input.productSlugs, 2)), fields: ["category", "specs", "metrics", "detailPath"] };
    },

    async answer(input) {
      const locale = localeOf(input.locale);
      const question = text(input.question, "question", 1000);
      const productSlugs = slugsOf(input.productSlugs || [], 0);
      const selected = productSlugs.length ? await selectedDocuments(locale, productSlugs) : [];
      const insufficient = {
        mode: "extractive", status: "insufficient_evidence", citations: [], passages: [],
        answer: locale === "zh"
          ? "已审核资料不足以回答这个问题。请补充型号、目标气体或应用条件，或在询盘中交由工程师确认。"
          : "The reviewed evidence is insufficient. Specify the model, target gas or conditions, or ask an engineer through an inquiry.",
      };
      if (/价格|报价|多少钱|预算|交期|检测距离|最远|精度|灵敏度|防爆|认证|维修|安全保证|price|cost|budget|delivery|detection distance|accuracy|sensitivity|explosion|certif|repair|safety guarantee|\bppm\b/i.test(question)) return insufficient;
      const supported = /气体|甲烷|六氟化硫|氨|乙烯|分辨率|像素|制冷|手持|便携|用途|区别|对比|参数|介绍|gas|methane|sf6|ammonia|ethylene|resolution|pixel|cool|handheld|portable|compare|difference|spec|describe|pv400|g306|gf77/i.test(question);
      if (!supported) return insufficient;
      const scopedQuery = analyzeQuery(question).models.length ? question : `${question} ${selected.map((document) => document.product_name).join(" ")}`;
      const result = await retriever.retrieve({ query: scopedQuery, locale, productSlugs, limit: 6 });
      if (!result.evidence.length) return insufficient;
      return {
        mode: "extractive", status: "evidence_found",
        answer: locale === "zh" ? "以下是与问题匹配的已审核资料摘述，不是对未列出能力的承诺。" : "These reviewed excerpts match your question; they do not establish capabilities that are not documented.",
        passages: result.evidence.map((evidence) => ({ text: evidence.content, citationId: evidence.id })),
        citations: result.evidence,
      };
    },

    async draft(input) {
      const locale = localeOf(input.locale);
      const query = text(input.query, "query", 500);
      const requirements = text(input.requirements, "requirements", 1000, false);
      const question = text(input.question, "question", 1000, false);
      if (query.length + requirements.length + question.length > 1000) fail("User-written inquiry content must not exceed 1000 characters");
      const products = await selectedProducts(locale, slugsOf(input.productSlugs));
      const confirmationToken = randomBytes(32).toString("hex");
      const summary = { category: "catalog", query, question, requirements, products };
      const { rows } = await pool.query(`INSERT INTO knowledge.inquiries(locale, confirmation_token_hash, summary)
        VALUES ($1,$2,$3) RETURNING id, expires_at`, [locale, hash(confirmationToken), JSON.stringify(summary)]);
      return { id: rows[0].id, expiresAt: rows[0].expires_at, confirmationToken, summary };
    },

    async confirm(id, input) {
      if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) fail("Invalid inquiry ID");
      if (input.confirmed !== true) fail("Explicit confirmation is required");
      const token = text(input.confirmationToken, "confirmation token", 64);
      if (!/^[a-f0-9]{64}$/.test(token)) fail("Invalid confirmation token");
      const name = text(input.name, "name", 100);
      const email = text(input.email, "email", 100);
      if (/[\r\n]/.test(name) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Invalid contact details");
      const client = await pool.connect();
      let prepared;
      try {
        await client.query("BEGIN");
        const draft = (await client.query("SELECT * FROM knowledge.inquiries WHERE id = $1 AND confirmation_token_hash = $2 FOR UPDATE", [id, hash(token)])).rows[0];
        if (!draft) fail("Inquiry not found", 404);
        if (draft.delivery_status === "sent") {
          await client.query("COMMIT");
          return { status: "submitted", delivery: "sent" };
        }
        if (draft.delivery_status === "sending") fail("询盘邮件正在发送，请稍后重试 / Inquiry email is being sent; please retry shortly", 409);
        if (new Date(draft.expires_at) <= new Date()) fail("Inquiry draft expired; review a new draft", 410);
        if ([draft.summary.query, draft.summary.question, draft.summary.requirements].join("").length > 1000) fail("User-written inquiry content must not exceed 1000 characters");
        const current = await selectedProducts(draft.locale, slugsOf(draft.summary.products.map((product) => product.slug)), client);
        if (!isDeepStrictEqual(current, draft.summary.products)) fail("Product information changed; review a new draft", 409);
        prepared = await prepareDelivery(client, draft, name, email);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return deliverInquiry(pool, id, prepared);
    },
  };
}

module.exports = { createService, localeOf, slugsOf, text };
