const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { randomUUID, createHmac } = require("node:crypto");
const { getConfig, validateConfig } = require("../src/modules/agent/config");
const { visitor, redact, messageInput, requireProxy } = require("../src/modules/agent/security");
const { createProvider, validateCall } = require("../src/modules/agent/provider");
const { publicMessage, publicResult } = require("../src/modules/agent/presentation");
const { cosine, fuse, eligible, mergeConditions, searchPublicContent, embeddingVersion } = require("../src/modules/agent/search");
const { productItem, readOnly, readNews } = require("../src/modules/agent/content");
const { execute } = require("../src/modules/agent/service");
const { createRouters } = require("../src/modules/agent/routes");
const { createStore } = require("../src/modules/agent/store");
const { consumeAgentStream, createAgentRequestId } = require("../../next/src/lib/agent-stream");
const { createTrace } = require("../src/modules/agent/trace");
const { contextTitle, publicContexts } = require("../src/modules/agent/contexts");
const sources = require("../knowledge/gas-imaging-sources");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const config = { ...getConfig(), enabled: true, cookieSecret: "c".repeat(40), proxySecret: "p".repeat(40),
  apiKey: "test-not-a-real-key", baseURL: "https://models.example.test/v1", model: "mock-tools", locale: "zh", dimensions: 2 };

function content() {
  return sources.filter((source) => source.locale === "zh").map((source) => productItem({
    slug: source.productSlug, name: source.facts.name, locale: source.locale, category_slug: source.category,
    category_name: "气体成像", reviewed_facts: source.facts, tags: ["手持"],
    description: source.sections.map((section) => section.content).join(" "),
  }, { facts: source.facts, title: source.title, source_url: source.sourceUrl, reviewed_at: source.reviewedAt, version: source.version }));
}

function readPool(rows = []) {
  const queries = [];
  return { queries, async connect() { return { async query(sql) { queries.push(sql); return { rows }; }, release() {} }; } };
}

test("configuration fails closed and rejects HTTP by default or credential-bearing model URLs", () => {
  assert.doesNotThrow(() => validateConfig(config));
  for (const override of [{ enabled: false }, { cookieSecret: "" }, { proxySecret: "short" }, { apiKey: "" },
    { baseURL: "http://127.0.0.1:3001/api" }, { baseURL: "https://user:password@example.test/v1" },
    { baseURL: "https://example.test/v1?key=secret" }]) assert.throws(() => validateConfig({ ...config, ...override }));
});

test("HTTP model access requires an exact server-side base URL exception and cannot allow other endpoints", () => {
  const baseURL = "http://relay.example.test:8080/v1";
  const allowed = { ...config, baseURL, allowedHttpBaseURL: baseURL };
  assert.doesNotThrow(() => validateConfig(allowed));
  assert.doesNotThrow(() => validateConfig({ ...allowed, baseURL: `${baseURL}/` }));
  for (const changed of ["http://other.example.test:8080/v1", "http://relay.example.test:8081/v1", "http://relay.example.test:8080/admin"])
    assert.throws(() => validateConfig({ ...allowed, baseURL: changed }), /AGENT_NOT_CONFIGURED/);
  for (const invalid of [`${baseURL}?key=secret`, `${baseURL}#fragment`, "http://user:password@relay.example.test:8080/v1"])
    assert.throws(() => validateConfig({ ...allowed, baseURL: invalid, allowedHttpBaseURL: invalid }), /AGENT_NOT_CONFIGURED/);
  assert.throws(() => validateConfig({ ...allowed, allowedHttpBaseURL: "*" }), /AGENT_NOT_CONFIGURED/);
});

test("visitor identity is signed, unguessable, browser-scoped, fixed 30 days and tampering fails", () => {
  let cookie;
  const identity = visitor({ headers: {} }, { append(_name, value) { cookie = value; } }, config, true);
  assert.match(cookie, /HttpOnly; SameSite=Lax; Max-Age=2592000/);
  assert.match(cookie, /Path=\/api\/agent/);
  const request = { headers: { cookie } };
  assert.equal(visitor(request, {}, config).hash, identity.hash);
  assert.throws(() => visitor({ headers: { cookie: cookie.replace(/=./, "=z") } }, {}, config), /SESSION_NOT_FOUND/);
  assert.throws(() => visitor(request, {}, { ...config, cookieSecret: "different" }), /SESSION_NOT_FOUND/);
  assert.throws(() => requireProxy({ get: () => "wrong" }, config), /FORBIDDEN/);
});

test("production HTTP cookies require both the allowlisted site and authenticated internal proxy; HTTPS remains Secure", (context) => {
  const environment = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  context.after(() => { if (environment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = environment; });
  let cookie;
  const response = { append(_name, value) { cookie = value; } };
  const settings = { ...config, httpSiteOrigins: ["http://192.0.2.5:3000"] };
  for (const headers of [ {}, { "x-agent-browser-origin": "http://192.0.2.5:3000" },
    { "x-agent-browser-origin": "https://site.test", "x-agent-proxy-secret": config.proxySecret },
    { "x-agent-browser-origin": "http://other.test", "x-agent-proxy-secret": config.proxySecret }]) {
    visitor({ headers }, response, settings, true);
    assert.match(cookie, /; Secure/);
  }
  visitor({ headers: { "x-agent-browser-origin": "http://192.0.2.5:3000", "x-agent-proxy-secret": config.proxySecret } }, response, settings, true);
  assert.doesNotMatch(cookie, /; Secure/);
  assert.match(cookie, /HttpOnly; SameSite=Lax/);
});

test("request IDs work in non-secure browser contexts using cryptographic random bytes", () => {
  const ids = new Set(Array.from({ length: 50 }, () => createAgentRequestId({ getRandomValues: (bytes) => require("node:crypto").randomFillSync(bytes) })));
  assert.equal(ids.size, 50);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("phase timeouts abort upstream work, preserve diagnostics and never retain raw error text", async () => {
  const metrics = {};
  const events = [];
  const trace = createTrace(metrics, { log: (event) => events.push(event) });
  let aborted = false;
  await assert.rejects(trace.step("model_select", async (signal, mark) => {
    mark({ httpStatus: 200, headersMs: 2 });
    signal.addEventListener("abort", () => { aborted = true; });
    return new Promise(() => {});
  }, { timeoutMs: 20 }), /PHASE_TIMEOUT/);
  assert.equal(aborted, true);
  assert.equal(metrics.phases[0].status, "timeout");
  assert.equal(metrics.failedPhase, "model_select");
  assert.equal(metrics.phases[0].httpStatus, 200);
  await assert.rejects(trace.step("news_read", () => { throw Object.assign(new Error("api_key=private"), { status: 502 }); }));
  assert.ok(events.some((event) => event.status === "started"));
  assert.ok(!JSON.stringify({ metrics, events }).includes("private"));
});

test("a stalled model selection falls back once to safe search instead of consuming the whole run timeout", async () => {
  const metrics = {};
  const messages = [];
  let toolCalls = 0;
  const result = await execute({ pool: {}, config: { ...config, selectTimeoutMs: 20 }, metrics,
    session: { locale: "zh", history: [], clarification_count: 0 }, message: "甲烷手持设备", signal: new AbortController().signal,
    emit: (event, data) => messages.push({ event, data }), provider: { select: () => new Promise(() => {}) },
    search: async ({ input }) => { toolCalls += 1; assert.equal(input.query, "甲烷手持设备"); return { query: input.query, status: "matches", products: [content()[0].card], news: [], retrieval: { mode: "keyword-only" } }; },
  });
  assert.equal(result.status, "matches");
  assert.equal(toolCalls, 1);
  assert.equal(metrics.modelCalls, 1);
  assert.equal(metrics.selectionFallback.code, "PHASE_TIMEOUT");
  assert.match(result.message, /PV400/);
  assert.match(result.message, /工况适用性/);
  assert.doesNotMatch(result.message, /超时|暂不可用|降级|只读检索|部分检索能力/);
  assert.equal(result.retrieval.understandingFallback, true);
  assert.ok(messages.some((entry) => entry.event === "status" && entry.data.phase === "search_fallback"));
});

test("explanation timeout preserves streamed content and verified cards with a recorded degraded stage", async () => {
  const metrics = {};
  const deltas = [];
  let providerAborted = false;
  const result = await execute({ pool: {}, config: { ...config, explainTimeoutMs: 20 }, metrics,
    session: { locale: "zh", history: [], clarification_count: 0 }, message: "甲烷手持设备", signal: new AbortController().signal,
    emit: (event, data) => { if (event === "message_delta") deltas.push(data.delta); },
    provider: { select: async () => ({ input: { query: "甲烷", type: "product" } }), explain: async (_selection, _result, signal, emit) => {
      emit("已审核的部分说明"); signal.addEventListener("abort", () => { providerAborted = true; }); return new Promise(() => {});
    } },
    search: async () => ({ query: "甲烷", status: "matches", products: [content()[0].card], news: [], retrieval: { mode: "keyword-only" } }),
  });
  assert.ok(providerAborted);
  assert.equal(result.products.length, 1);
  assert.equal(metrics.explanationFallback.code, "PHASE_TIMEOUT");
  assert.equal(metrics.phases.find((phase) => phase.phase === "model_explain").status, "timeout");
  assert.ok(deltas.length >= 3);
  assert.match(result.message, /已审核的部分说明/);
  assert.doesNotMatch(result.message, /超时|暂不可用|降级|部分检索能力/);
  assert.equal(metrics.modelCalls, 2);
});

test("SSE errors retain the request/run IDs and failing stage for browser diagnostics", async () => {
  const requestId = randomUUID();
  const runId = randomUUID();
  const response = new Response(`event: error\ndata: ${JSON.stringify({ code: "PHASE_TIMEOUT", phase: "catalog_read", requestId, runId })}\n\n`, { headers: { "content-type": "text/event-stream" } });
  await assert.rejects(consumeAgentStream(response, () => {}), (error) => error.code === "PHASE_TIMEOUT" && error.requestId === requestId && error.runId === runId && error.phase === "catalog_read");
});

test("visitor presentation strips historical operational notices without hiding suitability caveats or changing audit data", () => {
  const message = "找到产品。\n模型响应超时或暂不可用，已使用只读检索结果和资料摘要。相关性不等于工况适用性确认，气体和镜头配置请由工程师确认；您可以手动选择产品对比或询盘。\n部分检索能力暂不可用，结果按当前可用资料返回。";
  const result = { message, products: [content()[0].card], news: [], retrieval: { degraded: true, reason: "embedding_not_configured" }, constraints: { gas: "methane" } };
  const presented = publicResult(result);
  assert.doesNotMatch(presented.message, /超时|暂不可用|只读检索|部分检索能力/);
  assert.match(presented.message, /气体和镜头配置请由工程师确认/);
  assert.equal(presented.products.length, 1);
  assert.equal(presented.retrieval, undefined);
  assert.equal(presented.constraints, undefined);
  assert.equal(result.message, message);
  assert.equal(result.retrieval.reason, "embedding_not_configured");
  assert.equal(publicMessage("The model is slow or unavailable; read-only results and source summaries are shown instead. Confirm lens configuration.\nSome retrieval capabilities are unavailable; results use currently available content."), "Confirm lens configuration.");
});

test("message schemas prohibit caller-supplied tools/history/URLs and redact obvious sensitive content", () => {
  const message = "mail me at tester@example.org, +86 138 1234 5678, api_key=sk-very-secret-credential";
  const clean = messageInput({ message, requestId: randomUUID() });
  assert.ok(!clean.message.includes("tester@example.org"));
  assert.ok(!clean.message.includes("sk-very"));
  assert.ok(!clean.message.includes("138 1234"));
  assert.throws(() => messageInput({ message: "hello", requestId: randomUUID(), tool: "delete" }));
  assert.throws(() => messageInput({ message: "x".repeat(1001), requestId: randomUUID() }));
  assert.throws(() => messageInput({ message: "hello", requestId: "../../../" }));
  assert.equal(redact("甲烷 320x256"), "甲烷 320x256");
});

test("only the named read-only tool is callable; unknown actions and extra arguments fail", () => {
  const call = { id: "call_1", function: { name: "search_public_content", arguments: JSON.stringify({ query: "甲烷 手持", type: "product" }) } };
  assert.equal(validateCall(call).type, "product");
  const titled = validateCall({ ...call, function: { ...call.function, arguments: JSON.stringify({ query: "甲烷 手持", type: "product", title: "甲烷巡检手持设备" }) } });
  assert.equal(titled.title, "甲烷巡检手持设备");
  assert.equal(titled.query, "甲烷 手持");
  assert.equal(validateCall({ ...call, function: { ...call.function, arguments: JSON.stringify({ query: "甲烷", type: "product", title: {} }) } }).title, undefined);
  for (const name of ["send_email", "execute_sql", "http_get", "delete_product", "confirm_inquiry"]) {
    assert.throws(() => validateCall({ ...call, function: { ...call.function, name } }), /INVALID_TOOL_CALL/);
  }
  for (const argumentsText of ["{", "null", '[]', '{"query":"hello","type":"all","url":"http://localhost"}']) {
    assert.throws(() => validateCall({ ...call, function: { ...call.function, arguments: argumentsText } }));
  }
  for (const intent of ["new_search", "refine"]) assert.equal(validateCall({ ...call, function: { ...call.function,
    arguments: JSON.stringify({ query: "LE", type: "product", intent }) } }).intent, intent);
  for (const intent of ["delete", "reset_history", {}, null]) assert.throws(() => validateCall({ ...call, function: { ...call.function,
    arguments: JSON.stringify({ query: "LE", type: "product", intent }) } }), /INVALID_TOOL_ARGUMENTS/);
});

test("methane/handheld intent keeps PV400 and GF77, never substitutes G306; model cannot drop hard constraints", () => {
  const conditions = mergeConditions("手持设备", "我要找用于甲烷巡检的手持设备，帮我对比候选");
  assert.deepEqual(content().filter((item) => eligible(item, conditions)).map((item) => item.card.id), ["guide-sensmart-pv400", "flir-gf77"]);
  const followup = mergeConditions("手持", "只要手持", "甲烷");
  assert.equal(content().filter((item) => eligible(item, followup)).length, 2);
  const changed = mergeConditions("SF6 手持", "换成 SF6", "甲烷 手持");
  assert.deepEqual(content().filter((item) => eligible(item, changed)).map((item) => item.card.id), ["flir-g306", "flir-gf77"]);
});

function conversationCatalog() {
  return [...content().map((item) => ({ ...item, card: { ...item.card, categoryName: "气体红外成像" } })), ...[
    { slug: "imaging-kit", name: "开放式成像组件套件", category_slug: "imaging-kits", category_name: "成像组件",
      extra: { model: "GLA07512K-T2 + ITZ1212IP" }, description: "包含 K10 SDI 转以太网模块和散热底座，不是统一外壳手持相机。" },
    { slug: "le10", name: "HIKMICRO LE10 3.0", category_slug: "thermal-monoculars", category_name: "热成像单筒", extra: { model: "LE10 3.0" } },
    { slug: "le15", name: "HIKMICRO LE15 3.0", category_slug: "thermal-monoculars", category_name: "热成像单筒", extra: { model: "LE15 3.0" } },
    { slug: "unrelated", name: "Portable camera", category_slug: "thermal", category_name: "测温热像仪",
      extra: { model: "K100" }, description: "热成像，不能凭此说明确认甲烷适用性。" },
  ].map((record) => productItem({ ...record, locale: "zh" }))];
}

async function conversationSearch(message, query = message, previous, intent) {
  return searchPublicContent({ pool: readPool(), config: { ...config, embeddingModel: "" }, provider: {},
    input: { query, type: "product", ...(intent ? { intent } : {}) }, message,
    previousQuery: previous?.query, previousConditions: previous?.constraints, locale: "zh",
    signal: new AbortController().signal, contentLoader: async () => ({ items: conversationCatalog(), newsUnavailable: false }) });
}

test("the reported four-turn sequence changes targets even with contaminated model rewrites", async () => {
  let previous = await conversationSearch("我要找用于甲烷巡检的手持设备，帮我对比候选");
  const turns = [
    { message: "放弃这几个产品，我需要看 K10", query: "K10 甲烷巡检产品", expected: ["imaging-kit"] },
    { message: "所有气体红外成像", query: "K10 所有气体红外成像巡检产品", expected: ["flir-g306", "flir-gf77", "guide-sensmart-pv400"] },
    { message: "LE", query: "K10 LE 所有气体红外成像巡检产品", expected: ["le10", "le15"] },
    { message: "甲烷巡检", query: "K10 LE 甲烷巡检 红外成像产品", expected: ["flir-gf77", "guide-sensmart-pv400"] },
  ];
  for (const turn of turns) {
    const result = await conversationSearch(turn.message, turn.query, previous, "refine");
    assert.deepEqual(result.products.map((product) => product.id).sort(), turn.expected, turn.message);
    assert.equal(result.retrieval.intent.mode, "new_search", turn.message);
    assert.equal(result.retrieval.intent.queryRepaired, true, turn.message);
    assert.equal(publicResult(result).retrieval, undefined);
    previous = result;
  }
});

test("model references in public component descriptions and bounded series names are searchable", async () => {
  const component = await conversationSearch("K10");
  assert.deepEqual(component.products.map((product) => product.id), ["imaging-kit"]);
  assert.match(component.products[0].matchReasons.join(" "), /K10/i);
  assert.match(component.products[0].matchReasons.join(" "), /组件|关联/);
  for (const message of ["LE", "le 系列", "请找 LE 系列产品"]) {
    const series = await conversationSearch(message);
    assert.deepEqual(series.products.map((product) => product.id).sort(), ["le10", "le15"], message);
  }
  const unknown = await conversationSearch("K1000");
  assert.equal(unknown.products.length, 0);
});

test("actual refinements retain the subject while explicit replacements remove only that condition", async () => {
  const first = await conversationSearch("甲烷巡检手持设备");
  const refined = await conversationSearch("只要手持", "手持", first, "refine");
  assert.equal(refined.retrieval.intent.mode, "refine");
  assert.deepEqual(refined.products.map((product) => product.id).sort(), ["flir-gf77", "guide-sensmart-pv400"]);
  const replaced = await conversationSearch("换成 SF6", "甲烷 SF6 手持", refined, "refine");
  assert.deepEqual(replaced.products.map((product) => product.id).sort(), ["flir-g306", "flir-gf77"]);
  assert.equal(replaced.constraints.matched.some((condition) => condition.key === "methane"), false);
  assert.equal(replaced.constraints.matched.some((condition) => condition.key === "handheld"), true);
  const selected = await conversationSearch("这些里面只看 GF77", "GF77", first, "refine");
  assert.equal(selected.products.length, 1);
  assert.equal(selected.constraints.matched.some((condition) => condition.key === "methane"), true);
});

test("discarding old results is not a technical exclusion and does not relax new safety requirements", async () => {
  const previous = await conversationSearch("甲烷巡检手持设备");
  for (const message of ["不要这些产品了，我想看 K10", "重新搜索 K10", "Forget those products, show me K10"]) {
    assert.deepEqual((await conversationSearch(message, "K10 甲烷", previous)).products.map((product) => product.id), ["imaging-kit"], message);
  }
  const changed = await conversationSearch("这些都先放一边，我想了解 K10", "K10", previous, "new_search");
  assert.deepEqual(changed.products.map((product) => product.id), ["imaging-kit"]);
  assert.equal(changed.retrieval.intent.reason, "model_intent");
  assert.deepEqual((await conversationSearch("换成 K10", "K10", previous, "new_search")).products.map((product) => product.id), ["imaging-kit"]);
  for (const message of ["重新搜索 K10 不要手持", "K10 甲烷巡检", "甲烷 防爆", "LE 氢气检测", "LE 500g以下"]) {
    assert.equal((await conversationSearch(message, "LE", previous)).products.length, 0, message);
  }
});

test("keyword and embedding retrieval use the same repaired query, not the stale model plan", async () => {
  const items = conversationCatalog();
  const rows = items.map((item) => ({ content_key: item.key, content_hash: item.hash, embedding: [1, 0] }));
  const queries = [];
  const previous = await conversationSearch("甲烷手持设备");
  const result = await searchPublicContent({ pool: readPool(rows), config: { ...config, embeddingModel: "mock" },
    provider: { async embed(texts) { queries.push(...texts); return { vectors: [[1, 0]] }; } },
    input: { query: "K10 甲烷巡检", type: "product", intent: "refine" }, message: "放弃这几个产品，我需要看 K10",
    previousQuery: previous.query, previousConditions: previous.constraints, locale: "zh",
    contentLoader: async () => ({ items, newsUnavailable: false }) });
  assert.deepEqual(queries, [result.query]);
  assert.doesNotMatch(result.query, /甲烷|methane|手持|handheld/);
  assert.equal(result.retrieval.mode, "hybrid");
  assert.deepEqual(result.products.map((product) => product.id), ["imaging-kit"]);
});

test("model timeout still resolves the four targets with one read-only tool and diagnostic intent records", async () => {
  const session = { locale: "zh", history: [], clarification_count: 0 };
  const turns = [["甲烷手持设备", 2], ["放弃这几个产品，我需要看 K10", 1], ["所有气体红外成像", 3], ["LE", 2], ["甲烷巡检", 2]];
  for (const [message, expected] of turns) {
    const metrics = {};
    const result = await execute({ pool: readPool(), config: { ...config, embeddingModel: "" }, session, message, metrics,
      signal: new AbortController().signal, emit() {},
      provider: { async select() { throw Object.assign(new Error("timed out"), { code: "PHASE_TIMEOUT" }); } },
      search: (options) => searchPublicContent({ ...options, contentLoader: async () => ({ items: conversationCatalog(), newsUnavailable: false }) }),
    });
    assert.equal(result.products.length, expected, message);
    assert.equal(metrics.modelCalls, 1);
    assert.equal(metrics.toolCalls, 1);
    assert.equal(metrics.events[0].retrieval.intent.mode, "new_search");
    assert.equal(metrics.events[0].retrieval.counts.returnedProducts, expected);
    assert.deepEqual(metrics.events[0].retrieval.filters, result.constraints);
    assert.doesNotMatch(result.message, /超时|降级|PHASE_TIMEOUT/);
    session.history.push({ user: message, result });
  }
});

test("unsupported gases, incomplete gases, unverified ranges and exclusions never become partial matches", () => {
  for (const query of ["氢气 手持", "乙烷 手持", "烷泄漏巡检，手持设备", "甲烷 手持 500g以下", "甲烷 不要手持", "甲烷 防爆", "甲烷 640x512", "固定式甲烷"]) {
    assert.equal(content().filter((item) => eligible(item, mergeConditions(query, query))).length, 0, query);
  }
  assert.equal(content().filter((item) => eligible(item, mergeConditions("PV400", "PV400"))).length, 1);
  assert.equal(content().filter((item) => eligible(item, mergeConditions("PV4000", "PV4000"))).length, 0);
});

test("vector fusion includes keyword-only and embedding-only results, without mixing dimensions", () => {
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.equal(cosine([1, 0], [1]), 0);
  assert.equal(cosine([1, 0], [NaN, 1]), 0);
  assert.deepEqual(fuse([{ key: "a" }, { key: "b" }], [{ key: "c" }, { key: "a" }]), ["a", "c", "b"]);
});

test("hybrid search uses matching model/hash only, keeps hard filters and reports degradation", async () => {
  const items = content();
  const options = { ...config, embeddingModel: "mock-embedding" };
  const rows = items.map((item) => ({ content_key: item.key, content_hash: item.hash, embedding: [1, 0] }));
  const pool = readPool(rows);
  const provider = { async embed() { return { vectors: [[1, 0]], usage: { total_tokens: 3 } }; } };
  const input = { query: "甲烷 手持", type: "all" };
  const invoke = (extra = {}) => searchPublicContent({ pool, config: options, provider, input, message: input.query,
    locale: "zh", signal: new AbortController().signal, contentLoader: async () => ({ items, newsUnavailable: false }), ...extra });
  const result = await invoke();
  assert.equal(result.retrieval.mode, "hybrid");
  assert.equal(result.products.length, 2);
  assert.ok(!result.products.some((product) => product.id === "flir-g306"));
  assert.ok(pool.queries.includes("BEGIN READ ONLY"));
  assert.ok(!pool.queries.some((sql) => /INSERT|UPDATE|DELETE/.test(sql)));
  assert.match(embeddingVersion(options), /mock-embedding/);
  const fallback = await invoke({ pool: readPool([]) });
  assert.equal(fallback.retrieval.mode, "keyword-only");
  assert.equal(fallback.retrieval.reason, "index_missing_or_stale");
  const unavailable = await invoke({ provider: { async embed() { throw new Error("secret upstream error"); } } });
  assert.equal(unavailable.retrieval.reason, "embedding_unavailable");
});

test("returns up to twenty products plus typed news; semantic-only news is discoverable", async () => {
  const items = Array.from({ length: 30 }, (_, index) => ({ ...content()[0], key: `product:item-${index}`,
    card: { ...content()[0].card, id: `item-${index}`, slug: `item-${index}` } }));
  items.push({ key: "news:1", type: "news", card: { id: "1", type: "news", title: "Procurement guide" }, text: "purchasing context", hash: "news-hash" });
  const rows = items.map((item) => ({ content_key: item.key, content_hash: item.hash, embedding: [1, 0] }));
  const result = await searchPublicContent({ pool: readPool(rows), config: { ...config, embeddingModel: "mock" },
    provider: { async embed() { return { vectors: [[1, 0]] }; } }, input: { query: "甲烷", type: "all" }, message: "甲烷", locale: "zh",
    signal: new AbortController().signal, contentLoader: async () => ({ items, newsUnavailable: false }) });
  assert.equal(result.products.length, 20);
  assert.equal(result.news[0].type, "news");
});

test("read-only content transactions roll back on failure and release the client", async () => {
  const queries = [];
  let released = false;
  await assert.rejects(readOnly({ async connect() { return { async query(sql) { queries.push(sql); }, release() { released = true; } }; } },
    async () => { throw new Error("query failed"); }), /query failed/);
  assert.equal(queries[0], "BEGIN READ ONLY");
  assert.equal(queries.at(-1), "ROLLBACK");
  assert.ok(released);
});

test("fixed news reader rejects redirects and preserves split multibyte UTF-8", async (context) => {
  const bytes = new TextEncoder().encode(JSON.stringify({ items: [{ id: "1", title: "采购指南", description: "公开内容", text: "甲烷巡检" }] }));
  let url;
  context.mock.method(global, "fetch", async (target, options) => {
    url = target;
    assert.equal(options.redirect, "error");
    return new Response(new ReadableStream({ start(output) { for (const byte of bytes) output.enqueue(Uint8Array.of(byte)); output.close(); } }));
  });
  const news = await readNews({ ...config, newsOrigin: "http://next-app:3000" }, "zh");
  assert.equal(url, "http://next-app:3000/api/agent-content?locale=zh");
  assert.equal(news[0].card.title, "采购指南");
});

function modelClient(chunks) {
  return { chat: { completions: { async create() { return (async function* () { for (const chunk of chunks) yield chunk; })(); } } } };
}

test("SDK adapter assembles streamed tool arguments and rejects unfinished or parallel tools", async () => {
  const chunks = [
    { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "search_public_content", arguments: '{"query":"甲' } }] } }] },
    { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '烷","type":"product"}' } }] }, finish_reason: "tool_calls" }] },
    { choices: [], usage: { total_tokens: 7 } },
  ];
  let tokens;
  const result = await createProvider(config, modelClient(chunks)).select([], "甲烷", new AbortController().signal, (usage) => { tokens = usage.total_tokens; });
  assert.equal(result.input.query, "甲烷");
  assert.equal(tokens, 7);
  await assert.rejects(createProvider(config, modelClient(chunks.slice(0, 1))).select([], "hello", undefined, () => {}), /INCOMPLETE_MODEL_RESPONSE/);
  await assert.rejects(createProvider(config, modelClient([{ choices: [{ delta: { tool_calls: [{ index: 1 }] } }] }])).select([], "hello", undefined, () => {}), /TOOL_BUDGET_EXCEEDED/);
});

test("SDK embeddings require correct dimensions, finite nonzero values, count and indexes", async () => {
  const provider = (data) => createProvider({ ...config, embeddingModel: "mock" }, { embeddings: { async create() { return { data }; } } });
  assert.deepEqual((await provider([{ index: 0, embedding: [1, 2] }]).embed(["甲烷"])).vectors, [[1, 2]]);
  for (const data of [[], [{ index: 1, embedding: [1, 2] }], [{ index: 0, embedding: [0, 0] }], [{ index: 0, embedding: [1, NaN] }]]) {
    await assert.rejects(provider(data).embed(["甲烷"]), /INVALID_EMBEDDING/);
  }
});

test("real SDK adapter uses only configured completion/embedding endpoints with no redirects or automatic retries", async (context) => {
  const calls = [];
  let failing = false;
  context.mock.method(global, "fetch", async (url, options) => {
    if (failing) { calls.push("failure"); return new Response("upstream failed", { status: 500 }); }
    calls.push({ url: String(url), options });
    assert.equal(options.redirect, "error");
    const body = JSON.parse(options.body);
    if (String(url).endsWith("/embeddings")) {
      assert.equal(body.model, "mock-embedding");
      return Response.json({ data: [{ index: 0, embedding: [1, 0] }], usage: { total_tokens: 2 } });
    }
    assert.equal(body.tool_choice.function.name, "search_public_content");
    const chunk = { id: "mock", choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: "call_sdk", type: "function",
      function: { name: "search_public_content", arguments: '{"query":"甲烷","type":"product"}' } }] }, finish_reason: "tool_calls" }] };
    return new Response(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`, { headers: { "content-type": "text/event-stream" } });
  });
  const provider = createProvider({ ...config, embeddingModel: "mock-embedding" });
  const selection = await provider.select([], "甲烷", new AbortController().signal, () => {});
  assert.equal(selection.input.query, "甲烷");
  await provider.embed(["甲烷"], new AbortController().signal);
  assert.deepEqual(calls.map((call) => call.url), [`${config.baseURL}/chat/completions`, `${config.baseURL}/embeddings`]);
  failing = true;
  await assert.rejects(provider.embed(["甲烷"]));
  assert.equal(calls.filter((call) => call === "failure").length, 1);
});

test("one search tool, up to two model calls, explanatory deltas before typed results and at most ten clarifications", async () => {
  const events = [];
  const metrics = {};
  const base = { pool: {}, config, session: { locale: "zh", history: [], clarification_count: 0 }, message: "甲烷",
    signal: new AbortController().signal, emit: (event, data) => events.push({ event, data }), metrics,
    provider: { async select() { return { input: { query: "甲烷", type: "all", title: "甲烷巡检手持设备" } }; }, async explain(_selection, _result, _signal, emit) { emit("按已审核气体条件检索到候选。 "); } },
    search: async () => ({ query: "甲烷", status: "matches", products: [content()[0].card], news: [], clarification: null, retrieval: { mode: "keyword-only" } }) };
  const result = await execute(base);
  assert.match(result.message, /审核/);
  assert.equal(metrics.modelCalls, 2);
  assert.equal(metrics.toolCalls, 1);
  assert.equal(metrics.contextTitle, "甲烷巡检手持设备");
  assert.ok(events.some((entry) => entry.event === "message_delta"));
  const noResults = async () => ({ query: "甲烷", status: "no_matches", products: [], news: [], clarification: null, retrieval: {} });
  const tenth = await execute({ ...base, metrics: {}, session: { ...base.session, clarification_count: 9 }, search: noResults });
  assert.equal(tenth.clarification.remaining, 0);
  const exhausted = await execute({ ...base, metrics: {}, session: { ...base.session, clarification_count: 10 }, search: noResults });
  assert.equal(exhausted.clarification, null);
  assert.equal(exhausted.status, "no_matches");
  assert.match(exhausted.message, /当前资料没有确认符合条件的产品/);
});

function sseResponse(text) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(output) { for (let offset = 0; offset < bytes.length; offset += 3) output.enqueue(bytes.slice(offset, offset + 3)); output.close(); } }),
    { headers: { "content-type": "text/event-stream" } });
}

test("browser SSE parser handles UTF-8 fragments/heartbeats and rejects EOF or explicit errors", async () => {
  const events = [];
  await consumeAgentStream(sseResponse(': heartbeat\n\nevent: message_delta\ndata: {"delta":"甲烷"}\n\nevent: results\ndata: {}\n\nevent: done\ndata: {"ok":true}\n\n'),
    (event, data) => events.push([event, data]));
  assert.equal(events[0][1].delta, "甲烷");
  await assert.rejects(consumeAgentStream(sseResponse('event: results\ndata: {}\n\n'), () => {}), /INCOMPLETE_STREAM/);
  await assert.rejects(consumeAgentStream(sseResponse('event: error\ndata: {"code":"RUN_TIMEOUT"}\n\n'), () => {}), /RUN_TIMEOUT/);
});

async function listen(app) {
  return new Promise((resolve, reject) => { const server = app.listen(0, "127.0.0.1", (error) => error ? reject(error) : resolve(server)); });
}

test("new context API is browser-owned, bounded and cannot delete history or invoke a model", async () => {
  const session = { id: randomUUID(), context_id: randomUUID(), locale: "zh", history: [], clarification_count: 0 };
  let owner;
  let changes = 0;
  const store = {
    async session(identity) { owner = identity.hash; return session; },
    async get(id, visitorHash) { assert.equal(id, session.id); assert.equal(visitorHash, owner); return session; },
    async activateContext(id, visitorHash, target) {
      assert.equal(id, session.id);
      assert.equal(visitorHash, owner);
      if (!session.history.some((turn) => turn.contextId === target)) throw Object.assign(new Error("CONTEXT_NOT_FOUND"), { code: "CONTEXT_NOT_FOUND", status: 404 });
      session.context_id = target;
      return session;
    },
    async newContext(id, visitorHash, expected) {
      assert.equal(id, session.id);
      assert.equal(visitorHash, owner);
      if (expected !== session.context_id) throw Object.assign(new Error("CONTEXT_CHANGED"), { code: "CONTEXT_CHANGED", status: 409 });
      changes += 1;
      session.context_id = randomUUID();
      return session;
    },
  };
  const app = express();
  app.use(express.json());
  app.use(createRouters({ configOf: () => config, resolvePool: async () => ({}), storeOf: () => store,
    execute: () => { throw new Error("New context must not call a model"); } }).publicRouter);
  const server = await listen(app);
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { "content-type": "application/json", "x-agent-proxy-secret": config.proxySecret };
  try {
    const initialized = await fetch(`${base}/sessions`, { method: "POST", headers, body: '{"locale":"zh"}' });
    const firstContext = (await initialized.json()).data.contextId;
    const url = `${base}/sessions/${session.id}/contexts`;
    assert.equal((await fetch(url, { method: "POST", headers, body: JSON.stringify({ contextId: firstContext }) })).status, 404);
    headers.cookie = initialized.headers.get("set-cookie").split(";")[0];
    for (const body of [{ contextId: "invalid" }, { contextId: firstContext, deleteHistory: true }, []]) {
      assert.equal((await fetch(url, { method: "POST", headers, body: JSON.stringify(body) })).status, 400);
    }
    const changed = await fetch(url, { method: "POST", headers, body: JSON.stringify({ contextId: firstContext }) });
    assert.equal(changed.status, 200);
    assert.notEqual((await changed.json()).data.contextId, firstContext);
    assert.equal((await fetch(url, { method: "POST", headers, body: JSON.stringify({ contextId: firstContext }) })).status, 409);
    assert.equal((await fetch(url, { method: "DELETE", headers })).status, 404);
    assert.equal(changes, 1);
    session.history.push({ contextId: firstContext, user: "旧会话完整内容", result: { query: "甲烷巡检", message: "旧会话完整回答", products: [], news: [] }, createdAt: new Date().toISOString() });
    const empty = (await (await fetch(`${base}/sessions/${session.id}`, { headers })).json()).data;
    assert.equal(empty.history.length, 1);
    assert.equal(empty.history[0].contextId, firstContext);
    assert.equal(empty.contexts.find((context) => context.id === firstContext).title, "甲烷巡检");
    assert.equal(empty.history[0].user, "旧会话完整内容");
    const activate = `${url}/${firstContext}/activate`;
    for (const body of [{ contextId: "invalid" }, { contextId: session.context_id, deleteHistory: true }, []]) {
      assert.equal((await fetch(activate, { method: "POST", headers, body: JSON.stringify(body) })).status, 400);
    }
    assert.equal((await fetch(activate, { method: "POST", headers: { ...headers, cookie: "" }, body: JSON.stringify({ contextId: session.context_id }) })).status, 404);
    assert.equal((await fetch(`${url}/${randomUUID()}/activate`, { method: "POST", headers, body: JSON.stringify({ contextId: session.context_id }) })).status, 404);
    const expected = session.context_id;
    assert.equal((await fetch(activate, { method: "POST", headers, body: JSON.stringify({ contextId: expected }) })).status, 200);
    assert.equal(session.context_id, firstContext);
    assert.equal((await fetch(activate, { method: "POST", headers, body: JSON.stringify({ contextId: expected }) })).status, 200);
    assert.equal((await fetch(activate, { method: "DELETE", headers })).status, 404);
    assert.doesNotThrow(() => messageInput({ message: "K10", requestId: randomUUID(), contextId: session.context_id }));
    assert.throws(() => messageInput({ message: "K10", requestId: randomUUID(), contextId: "invalid" }), /INVALID_MESSAGE/);
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});

test("HTTP gates reject untrusted public calls, anonymous admin access, unknown/destructive routes; SSE audits before done", async () => {
  const sessionId = randomUUID();
  const audit = [];
  const store = {
    async session() { return { id: sessionId, locale: "zh", expires_at: new Date(), clarification_count: 0 }; },
    async begin(id) { if (id !== sessionId) throw Object.assign(new Error("SESSION_NOT_FOUND"), { status: 404, code: "SESSION_NOT_FOUND" }); return { session: { id, locale: "zh", history: [] }, runId: randomUUID() }; },
    async finish(...args) { audit.push(args); return { contextId: sessionId, contexts: [{ id: sessionId, title: "甲烷巡检", turnCount: 1, updatedAt: new Date().toISOString() }] }; },
  };
  const routers = createRouters({ configOf: () => config, resolvePool: async () => ({}), storeOf: () => store, skipRefresh: true,
    execute: async ({ emit }) => { emit("message_delta", { delta: "结果" }); return { status: "matches", products: [], news: [] }; } });
  const app = express();
  app.use(express.json());
  app.use("/api/agent/admin", (_req, res) => res.status(401).end());
  app.use("/api/agent", routers.publicRouter);
  const server = await listen(app);
  const base = `http://127.0.0.1:${server.address().port}/api/agent`;
  const headers = { "Content-Type": "application/json", "x-agent-proxy-secret": config.proxySecret };
  try {
    assert.equal((await fetch(`${base}/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"locale":"zh"}' })).status, 403);
    assert.equal((await fetch(`${base}/admin/runs`)).status, 401);
    const session = await fetch(`${base}/sessions`, { method: "POST", headers, body: '{"locale":"zh"}' });
    assert.equal(session.status, 200);
    const cookie = session.headers.get("set-cookie").split(";")[0];
    assert.equal((await fetch(`${base}/sessions/${sessionId}`, { method: "DELETE", headers: { ...headers, cookie } })).status, 404);
    const response = await fetch(`${base}/sessions/${sessionId}/messages`, { method: "POST", headers: { ...headers, cookie }, body: JSON.stringify({ message: "甲烷", requestId: randomUUID() }) });
    const frames = [];
    await consumeAgentStream(response, (event) => frames.push(event));
    assert.deepEqual(frames, ["meta", "status", "message_delta", "status", "context", "results", "done"]);
    assert.equal(audit.length, 1);
    assert.equal(audit[0][5], undefined);
    const foreign = await fetch(`${base}/sessions/${randomUUID()}/messages`, { method: "POST", headers: { ...headers, cookie }, body: JSON.stringify({ message: "甲烷", requestId: randomUUID() }) });
    assert.equal(foreign.status, 404);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("store binds session to owner and expiry, rolls history to ten turns and counts clarifications", async () => {
  const statements = [];
  const history = Array.from({ length: 10 }, (_, index) => ({ user: String(index), result: {} }));
  const runId = randomUUID();
  const sessionId = randomUUID();
  const pool = { async query(sql, values) { statements.push([sql, values]); return { rows: [] }; },
    async connect() { return { async query(sql, values) { statements.push([sql, values]); return { rows: sql.startsWith("SELECT *") ? [{ id: sessionId, context_id: sessionId, locale: "zh", history, clarification_count: 0, active_run: runId }] : [] }; }, release() {} }; } };
  const store = createStore(pool);
  await assert.rejects(store.get(randomUUID(), "wrong-owner"), /SESSION_NOT_FOUND/);
  assert.match(statements[0][0], /visitor_hash = \$2 AND expires_at > now\(\)/);
  await store.finish(randomUUID(), runId, "hello", { clarification: { question: "What?" } }, {});
  const update = statements.find(([sql]) => sql.startsWith("UPDATE agent.sessions"));
  assert.equal(JSON.parse(update[1][1]).length, 10);
  assert.equal(JSON.parse(update[1][1])[0].user, "1");
  assert.equal(update[1][2], 1);
});

test("conversation titles summarize the need, redact private strings and remain bounded", () => {
  assert.equal(contextTitle("我要找用于甲烷巡检的手持设备，帮我对比候选", "zh"), "甲烷巡检的手持设备");
  assert.equal(contextTitle("Please find handheld methane cameras", "en"), "handheld methane cameras");
  assert.doesNotMatch(contextTitle("甲烷 a@example.test 13812345678 https://private.example/lookup", "zh"), /example|13812345678|https/);
  assert.equal(contextTitle("", "zh"), "产品与资料查询");
  assert.equal(Array.from(contextTitle("甲烷🔍".repeat(100), "zh")).length, 31);
  assert.deepEqual(publicContexts({ id: "legacy", context_id: "empty", locale: "zh", history: [{ user: "我要看 K10", result: {}, createdAt: "2026-09-18T00:00:00Z" }] }).map((context) => [context.id, context.title]),
    [["empty", "新对话"], ["legacy", "K10"]]);
});

test("source-level boundaries retain independent original APIs and deny agent admin proxy/deletion", () => {
  const root = join(__dirname, "../..");
  const app = readFileSync(join(root, "server/src/app.js"), "utf8");
  assert.ok(app.indexOf('"/api/agent/admin", requireManagementAuthForApi') < app.indexOf('"/api/agent", agentRouters.publicRouter'));
  assert.match(app, /app.use\("\/api\/knowledge", knowledgeRouters.publicRouter\)/);
  const proxy = readFileSync(join(root, "next/src/app/api/agent/[...path]/route.ts"), "utf8");
  assert.ok(!proxy.includes("export const DELETE"));
  assert.ok(!proxy.includes("x-forwarded-for"));
  assert.match(proxy, /bytes > 8192/);
  assert.match(proxy, /redirect: 'error'/);
  assert.match(proxy, /sec-fetch-site/);
  const provider = readFileSync(join(root, "server/src/modules/agent/provider.js"), "utf8");
  assert.match(provider, /maxRetries: 0/);
  assert.ok(!provider.includes("inquiry-delivery"));
});

test("Docker build contexts exclude private environment files and local generated output", () => {
  const root = join(__dirname, "../..");
  for (const directory of ["server", "next"]) {
    const patterns = readFileSync(join(root, directory, ".dockerignore"), "utf8").split(/\r?\n/).map((line) => line.trim());
    assert.ok(patterns.includes(".env*"));
    assert.ok(patterns.includes("**/.env*"));
    assert.ok(patterns.includes("node_modules"));
    assert.ok(!patterns.some((pattern) => pattern.startsWith("!") && pattern.includes("env")));
    if (directory === "next") assert.ok(patterns.includes(".next"));
  }
});

test("generic Next rewrite cannot bypass the agent gateway or expose admin APIs", async () => {
  const { default: nextConfig } = await import("../../next/next.config.mjs");
  const [rewrite] = await nextConfig.rewrites();
  const matcher = new RegExp(`^${rewrite.source.replace(":path", "")}$`);
  for (const path of ["/api/agent", "/api/agent/admin/runs", "/api/agent/sessions/test/messages", "/api/agent-content"]) assert.equal(matcher.test(path), false);
  assert.equal(matcher.test("/api/products"), true);
});

test("canonical constraints persist even when a prior model query omitted the gas", () => {
  const first = mergeConditions("手持", "甲烷巡检，手持设备");
  const second = mergeConditions("其他设备", "其他候选", first);
  assert.equal(content().filter((item) => eligible(item, second)).length, 2);
  const replaced = mergeConditions("SF6", "换成 SF6", first);
  assert.ok(replaced.matched.some((condition) => condition.key === "handheld"));
  assert.ok(!replaced.matched.some((condition) => condition.key === "methane"));
  const unclear = mergeConditions("烷泄漏巡检，手持设备", "烷泄漏巡检，手持设备");
  const clarified = mergeConditions("甲烷 手持", "甲烷", unclear);
  assert.equal(clarified.blocked, false);
  assert.equal(content().filter((item) => eligible(item, clarified)).length, 2);
});

test("published non-gas products remain searchable without an approved gas dossier", () => {
  const item = productItem({ slug: "thermal-x1", name: "X1 手持热像仪", locale: "zh", category_slug: "thermal",
    category_name: "热像仪", description: "手持红外测温仪", tags: [], extra: {}, specifications: {} });
  assert.ok(eligible(item, mergeConditions("手持热像仪", "手持热像仪")));
  assert.equal(eligible(item, mergeConditions("甲烷手持设备", "甲烷手持设备")), false);
});

test("timeout and disconnect cancel in-flight work, release concurrency and record safe errors", async () => {
  const sessionId = randomUUID();
  const audits = [];
  let observedAbort = 0;
  const store = { async session() { return { id: sessionId }; },
    async begin() { return { session: { id: sessionId, locale: "zh", history: [] }, runId: randomUUID() }; },
    async finish(...args) { audits.push(args); } };
  const routers = createRouters({ configOf: () => ({ ...config, timeoutMs: 40, maxConcurrent: 1 }), resolvePool: async () => ({}), storeOf: () => store,
    execute: async ({ signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => { observedAbort += 1; reject(signal.reason); }, { once: true })) });
  const app = express(); app.use(express.json()); app.use("/api/agent", routers.publicRouter);
  const server = await listen(app);
  const base = `http://127.0.0.1:${server.address().port}/api/agent`;
  const headers = { "Content-Type": "application/json", "x-agent-proxy-secret": config.proxySecret };
  try {
    const session = await fetch(`${base}/sessions`, { method: "POST", headers, body: '{"locale":"zh"}' });
    headers.cookie = session.headers.get("set-cookie").split(";")[0];
    const send = () => fetch(`${base}/sessions/${sessionId}/messages`, { method: "POST", headers, body: JSON.stringify({ message: "甲烷", requestId: randomUUID() }) });
    const first = await send();
    await assert.rejects(consumeAgentStream(first, () => {}), /RUN_TIMEOUT/);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(audits[0][5], "RUN_TIMEOUT");
    assert.equal(audits[0][6], "timeout");
    const second = await send();
    assert.equal(second.status, 200);
    await second.body.cancel();
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(observedAbort, 2);
    assert.ok(audits[1][5] === "CLIENT_DISCONNECTED" || audits[1][5] === "RUN_TIMEOUT");
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});

test("admin analytics use real management authentication and never expose a mutating action", async () => {
  const { authenticateSession, requireManagementAuthForApi } = require("../src/modules/auth/routes");
  const adminSecret = process.env.MANAGEMENT_SESSION_SECRET || process.env.MANAGEMENT_ADMIN_PASSWORD || "cooyue-management-session-dev";
  const username = process.env.MANAGEMENT_ADMIN_USERNAME || "admin";
  const payload = Buffer.from(JSON.stringify({ sub: username, access: "admin", exp: Math.floor(Date.now() / 1000) + 60 })).toString("base64url");
  const signature = createHmac("sha256", adminSecret).update(payload).digest("base64url");
  const app = express();
  const routers = createRouters({ resolvePool: async () => ({}), storeOf: () => ({ async list() { return { rows: [], summary: { total: 0 } }; } }) });
  app.use(authenticateSession);
  app.use("/api/agent/admin", requireManagementAuthForApi, routers.adminRouter);
  const server = await listen(app);
  const base = `http://127.0.0.1:${server.address().port}/api/agent/admin/runs`;
  const cookie = `cooyue_admin_session=${payload}.${signature}`;
  try {
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(base, { headers: { cookie: `${cookie}tampered` } })).status, 401);
    const listing = await fetch(base, { headers: { cookie } });
    assert.equal(listing.status, 200);
    assert.match(listing.headers.get("cache-control"), /no-store/);
    assert.equal((await listing.json()).data.summary.total, 0);
    assert.equal((await fetch(base, { method: "DELETE", headers: { cookie } })).status, 404);
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});
