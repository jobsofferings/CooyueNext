const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createProvider } = require("../src/modules/agent/provider");
const { ARK_QUERY_INSTRUCTIONS, ARK_DOCUMENT_INSTRUCTIONS, embeddingVersion } = require("../src/modules/agent/embeddings");
const { productItem } = require("../src/modules/agent/content");
const { cosine, searchPublicContent } = require("../src/modules/agent/search");
const { execute } = require("../src/modules/agent/service");
const { createTrace } = require("../src/modules/agent/trace");
const { publicResult } = require("../src/modules/agent/presentation");
const { PGlite } = require("@electric-sql/pglite");
const { pendingVectorItems, readVectorIndex, scoreVectorIndex } = require("../src/modules/agent/vector-index");

const config = {
  baseURL: "https://chat.example.test/v1", apiKey: "mock-chat-key", model: "mock-chat",
  embeddingProvider: "ark", embeddingBaseURL: "https://ark.example.test/api/v3", embeddingApiKey: "mock-ark-key",
  embeddingModel: "doubao-embedding-vision-251215", dimensions: 2, timeoutMs: 1000, minSimilarity: 0.35,
};

function indexPool(getRows) {
  return { async connect() { return { async query(sql, params) {
    const rows = getRows();
    if (sql.startsWith("WITH query_vector")) {
      const requested = JSON.parse(params[3]);
      return { rows: rows.filter((row) => requested.some((item) => item.content_key === row.content_key && item.content_hash === row.content_hash))
        .map((row) => ({ content_key: row.content_key, score: cosine(JSON.parse(params[2]), row.embedding) })) };
    }
    if (sql.includes("jsonb_array_length")) return { rows: rows.map((row) => ({ content_key: row.content_key, content_hash: row.content_hash,
      dimensions: row.embedding.length, valid: row.embedding.every(Number.isFinite) && row.embedding.some((value) => value !== 0) })) };
    return { rows: [] };
  }, release() {} }; } };
}

test("Ark text embeddings use a separate key and multimodal endpoint with query instructions", async (context) => {
  const calls = [];
  context.mock.method(global, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    return Response.json({ data: { embedding: [1, 2] }, usage: { total_tokens: 7 } });
  });
  const result = await createProvider(config).embed(["甲烷检测 methane detection"]);
  assert.deepEqual(result, { vectors: [[1, 2]], usage: { total_tokens: 7 } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${config.embeddingBaseURL}/embeddings/multimodal`);
  assert.equal(calls[0].options.headers.authorization, "Bearer mock-ark-key");
  assert.equal(calls[0].options.redirect, "error");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    model: config.embeddingModel, dimensions: 2, encoding_format: "float", instructions: ARK_QUERY_INSTRUCTIONS,
    input: [{ type: "text", text: "甲烷检测 methane detection" }],
  });
});

test("Ark documents are embedded separately, retain input order and use bounded concurrency", async (context) => {
  const texts = Array.from({ length: 9 }, (_value, index) => `document ${index}`);
  let active = 0;
  let peak = 0;
  let calls = 0;
  context.mock.method(global, "fetch", async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.instructions, ARK_DOCUMENT_INSTRUCTIONS);
    assert.equal(body.input.length, 1);
    const index = texts.indexOf(body.input[0].text);
    assert.ok(index >= 0);
    calls += 1;
    peak = Math.max(peak, ++active);
    await new Promise((resolve) => setTimeout(resolve, (texts.length - index) * 2));
    active -= 1;
    return Response.json({ data: { embedding: [index + 1, 1] }, usage: { total_tokens: index + 1 } });
  });
  const result = await createProvider(config).embed(texts, undefined, { purpose: "document" });
  assert.equal(calls, texts.length);
  assert.ok(peak > 1 && peak <= 4);
  assert.deepEqual(result.vectors, texts.map((_text, index) => [index + 1, 1]));
  assert.equal(result.usage.total_tokens, 45);
});

test("Ark rejects malformed vectors, wrong response shapes and invalid input", async (context) => {
  let payload;
  let calls = 0;
  context.mock.method(global, "fetch", async () => { calls += 1; return Response.json(payload); });
  const provider = createProvider(config);
  for (const invalid of [{}, { data: [{ embedding: [1, 2] }] }, { data: null }, ...[[], [1], [0, 0], [1, null], [1, "2"]].map((embedding) => ({ data: { embedding } }))]) {
    payload = invalid;
    await assert.rejects(provider.embed(["document"]), /INVALID_EMBEDDING/);
  }
  const previousCalls = calls;
  for (const invalid of [[], [""], ["  "], [1], "document"]) await assert.rejects(provider.embed(invalid), /INVALID_EMBEDDING_INPUT/);
  await assert.rejects(provider.embed(["document"], undefined, { purpose: "image" }), /INVALID_EMBEDDING_INPUT/);
  assert.equal(calls, previousCalls);
});

test("Ark errors are sanitized and not retried, and unavailable usage remains unknown", async (context) => {
  let calls = 0;
  let status = 429;
  context.mock.method(global, "fetch", async () => {
    calls += 1;
    return status === 200 ? Response.json({ data: { embedding: [1, 2] } })
      : Response.json({ error: { message: "must-not-leak-private-content" } }, { status });
  });
  const provider = createProvider(config);
  await assert.rejects(provider.embed(["document"]), (error) => error.code === "EMBEDDING_UNAVAILABLE" && error.status === 429
    && !error.message.includes("private-content"));
  assert.equal(calls, 1);
  status = 200;
  assert.equal((await provider.embed(["document"])).usage, undefined);
});

test("embedding failures cancel sibling requests and do not return partial vectors", async (context) => {
  let aborted = 0;
  let calls = 0;
  context.mock.method(global, "fetch", async (_url, options) => {
    calls += 1;
    if (JSON.parse(options.body).input[0].text === "fail") return new Response("failed", { status: 500 });
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => { aborted += 1; reject(options.signal.reason); }, { once: true });
    });
  });
  await assert.rejects(createProvider(config).embed(["fail", "second", "third", "fourth", "fifth"]), /EMBEDDING_UNAVAILABLE/);
  assert.equal(calls, 4);
  assert.equal(aborted, 3);
});

test("Ark requests propagate caller cancellation and have an independent timeout", async (context) => {
  let calls = 0;
  context.mock.method(global, "fetch", async (_url, options) => {
    calls += 1;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
    });
  });
  const controller = new AbortController();
  const pending = createProvider(config).embed(["document"], controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  const previousCalls = calls;
  await assert.rejects(createProvider(config).embed(["document"], controller.signal), { name: "AbortError" });
  assert.equal(calls, previousCalls);
  const keepAlive = setTimeout(() => {}, 1000);
  try { await assert.rejects(createProvider({ ...config, timeoutMs: 10 }).embed(["document"]), { name: "TimeoutError" }); }
  finally { clearTimeout(keepAlive); }
});

test("separate embedding endpoints fail closed and never inherit the chat credential", async (context) => {
  context.mock.method(global, "fetch", async () => { assert.fail("invalid settings must not make a request"); });
  for (const override of [{ embeddingProvider: "unknown" }, { embeddingApiKey: "" }, { embeddingBaseURL: "" },
    { embeddingBaseURL: "http://ark.example.test/api/v3" }, { embeddingBaseURL: "https://user:password@ark.example.test/api/v3" },
    { embeddingBaseURL: "https://ark.example.test/api/v3?token=private" }, { embeddingBaseURL: "https://ark.example.test/api/v3#fragment" },
    { embeddingProvider: "openai", embeddingApiKey: "" }]) {
    await assert.rejects(createProvider({ ...config, ...override }).embed(["document"]), /EMBEDDING_NOT_CONFIGURED/);
  }
});

test("independent OpenAI embedding endpoint uses its own credential and keeps the batch API", async (context) => {
  context.mock.method(global, "fetch", async (url, options) => {
    assert.equal(String(url), "https://embeddings.example.test/v1/embeddings");
    assert.equal(new Headers(options.headers).get("authorization"), "Bearer mock-embedding-key");
    assert.equal(options.redirect, "error");
    assert.deepEqual(JSON.parse(options.body).input, ["甲烷", "methane"]);
    return Response.json({ data: [{ index: 1, embedding: [2, 1] }, { index: 0, embedding: [1, 2] }] });
  });
  const result = await createProvider({ ...config, embeddingProvider: "openai", embeddingBaseURL: "https://embeddings.example.test/v1/",
    embeddingApiKey: "mock-embedding-key" }).embed(["甲烷", "methane"]);
  assert.deepEqual(result.vectors, [[1, 2], [2, 1]]);
});

test("index versions track embedding identity independently of the chat model and key", () => {
  const version = embeddingVersion(config);
  assert.match(version, /ark:.*doubao-embedding-vision-251215:2:text-search-v2$/);
  assert.equal(embeddingVersion({ ...config, baseURL: "https://other-chat.example.test/v1", model: "other-chat", embeddingApiKey: "rotated" }), version);
  assert.equal(embeddingVersion({ ...config, embeddingBaseURL: `${config.embeddingBaseURL}/` }), version);
  for (const override of [{ dimensions: 4 }, { embeddingModel: "other-embedding" }, { embeddingProvider: "openai" },
    { embeddingBaseURL: "https://other-embedding.example.test/api/v3" }]) assert.notEqual(embeddingVersion({ ...config, ...override }), version);
  assert.equal(embeddingVersion({ ...config, embeddingProvider: "openai", embeddingBaseURL: "", embeddingApiKey: "" }),
    `v1:${config.baseURL}:${config.embeddingModel}:${config.dimensions}`);
});

test("Ark vectors participate in hybrid retrieval and provider failures preserve keyword results", async (context) => {
  const item = productItem({ slug: "portable-camera", name: "便携热成像相机", locale: "zh", category_slug: "thermal",
    category_name: "热像仪", description: "便携式设备，适合现场巡查。" });
  const pool = indexPool(() => [{ content_key: item.key, content_hash: item.hash, embedding: [1, 0] }]);
  let failing = false;
  context.mock.method(global, "fetch", async () => failing ? new Response("unavailable", { status: 503 })
    : Response.json({ data: { embedding: [1, 0] }, usage: { total_tokens: 4 } }));
  const invoke = () => searchPublicContent({ pool, config, provider: createProvider(config), input: { query: "热成像", type: "product" },
    message: "热成像", locale: "zh", signal: new AbortController().signal,
    contentLoader: async () => ({ items: [item], newsUnavailable: false }) });
  const hybrid = await invoke();
  assert.equal(hybrid.retrieval.mode, "hybrid");
  assert.equal(hybrid.retrieval.counts.vectorMatches, 1);
  assert.equal(hybrid.products[0].id, item.card.id);
  assert.equal(hybrid.retrieval.embedding.model, config.embeddingModel);
  assert.deepEqual(hybrid.retrieval.embedding.index, { published: 1, eligible: 1, stored: 1, current: 1, valid: 1, missing: 0, stale: 0, invalid: 0 });
  assert.equal(hybrid.retrieval.embedding.totalTokens, 4);
  assert.equal(hybrid.retrieval.embedding.topMatches[0].score, 1);
  assert.equal(hybrid.retrieval.embedding.topMatches[0].returned, true);
  assert.equal(hybrid.retrieval.embedding.topMatches[0].keywordMatch, true);
  assert.equal(publicResult(hybrid).retrieval, undefined);
  failing = true;
  const fallback = await invoke();
  assert.equal(fallback.retrieval.mode, "keyword-only");
  assert.equal(fallback.retrieval.reason, "embedding_unavailable");
  assert.equal(fallback.products[0].id, item.card.id);
  assert.equal(fallback.retrieval.embedding.status, "failed");
  assert.equal(fallback.retrieval.embedding.error.httpStatus, 503);
  assert.equal(fallback.retrieval.embedding.calls, 1);
  assert.equal(fallback.retrieval.embedding.totalTokens, null);
  assert.deepEqual(fallback.retrieval.embedding.topMatches, []);
});

test("embedding audit distinguishes missing, stale and invalid index rows without exposing vectors", async () => {
  const items = Array.from({ length: 4 }, (_value, index) => productItem({ slug: `thermal-${index}`, name: `infrared camera ${index}`,
    locale: "en", category_slug: "thermal", category_name: "thermal", description: "Thermal inspection equipment" }));
  const rows = [
    { content_key: items[0].key, content_hash: items[0].hash, embedding: [0.987654321, 1] },
    { content_key: items[1].key, content_hash: "old-hash", embedding: [1, 2] },
    { content_key: items[2].key, content_hash: items[2].hash, embedding: [0, 0] },
  ];
  const pool = indexPool(() => rows);
  const result = await searchPublicContent({ pool, config, provider: { async embed() { return { vectors: [[1, 1]] }; } },
    input: { query: "infrared", type: "product" }, message: "infrared", locale: "en", signal: new AbortController().signal,
    contentLoader: async () => ({ items, newsUnavailable: false }) });
  const audit = result.retrieval.embedding;
  assert.deepEqual(audit.index, { published: 4, eligible: 4, stored: 3, current: 1, valid: 1, missing: 1, stale: 1, invalid: 1 });
  assert.equal(audit.reason, "partial_or_stale_index");
  assert.equal(audit.status, "completed");
  assert.equal(audit.totalTokens, null);
  assert.ok(audit.durationMs >= 0);
  const serialized = JSON.stringify(audit);
  for (const forbidden of ["0.987654321", "old-hash", "mock-ark-key", config.embeddingBaseURL, "Thermal inspection equipment"]) {
    assert.ok(!serialized.includes(forbidden));
  }
});

test("audit distinguishes disabled, missing index, zero hits and no eligible candidates", async () => {
  const item = productItem({ slug: "camera", name: "infrared camera", locale: "en", category_slug: "thermal", category_name: "thermal" });
  let rows = [];
  let calls = 0;
  const pool = indexPool(() => rows);
  const invoke = (query, options = config) => searchPublicContent({ pool, config: options,
    provider: { async embed() { calls += 1; return { vectors: [[-1, 0]], usage: { total_tokens: 2 } }; } },
    input: { query, type: "product" }, message: query, locale: "en", signal: new AbortController().signal,
    contentLoader: async () => ({ items: [item], newsUnavailable: false }) });
  const disabled = await invoke("infrared", { ...config, embeddingModel: "" });
  assert.equal(disabled.retrieval.embedding.status, "disabled");
  assert.equal(disabled.retrieval.embedding.index.valid, null);
  const missing = await invoke("infrared");
  assert.equal(missing.retrieval.embedding.status, "skipped");
  assert.equal(missing.retrieval.embedding.reason, "index_missing_or_stale");
  assert.equal(missing.retrieval.embedding.index.missing, 1);
  const excluded = await invoke("hydrogen camera");
  assert.equal(excluded.retrieval.embedding.reason, "no_eligible_content");
  assert.equal(calls, 0);
  rows = [{ content_key: item.key, content_hash: item.hash, embedding: [1, 0] }];
  const noMatches = await invoke("infrared");
  assert.equal(noMatches.retrieval.embedding.status, "completed");
  assert.equal(noMatches.retrieval.embedding.reason, "no_vector_matches");
  assert.equal(noMatches.retrieval.embedding.vectorMatches, 0);
  assert.equal(noMatches.retrieval.mode, "hybrid");
  assert.equal(noMatches.retrieval.degraded, false);
  assert.equal(calls, 1);
});

test("run metrics and trace retain embedding results, timings and separate token usage", async () => {
  const item = productItem({ slug: "camera", name: "infrared camera", locale: "en", category_slug: "thermal", category_name: "thermal" });
  const pool = indexPool(() => [{ content_key: item.key, content_hash: item.hash, embedding: [1, 0] }]);
  const metrics = {};
  const logs = [];
  const result = await execute({ pool, config, metrics, trace: createTrace(metrics, { log: (event) => logs.push(event) }),
    session: { locale: "en", history: [], clarification_count: 0 }, message: "infrared", signal: new AbortController().signal, emit() {},
    provider: {
      async select(_history, _message, _signal, usage) { usage({ total_tokens: 2 }); return { input: { query: "infrared", type: "product" } }; },
      async embed() { return { vectors: [[1, 0]], usage: { total_tokens: 5 } }; },
      async explain(_selection, _result, _signal, emit, usage) { usage({ total_tokens: 3 }); emit("Related equipment."); },
    },
    search: (options) => searchPublicContent({ ...options, contentLoader: async () => ({ items: [item], newsUnavailable: false }) }),
  });
  assert.deepEqual(metrics.embedding, result.retrieval.embedding);
  assert.equal(metrics.embeddingCalls, 1);
  assert.equal(metrics.embedding.totalTokens, 5);
  assert.equal(metrics.totalTokens, 10);
  assert.equal(metrics.usageComplete, true);
  assert.ok(logs.some((event) => event.phase === "embedding" && event.vectorCount === 1 && event.dimensions === 2));
  assert.ok(logs.some((event) => event.phase === "search" && event.embedding?.index.valid === 1));
  assert.doesNotMatch(JSON.stringify(metrics), /mock-ark-key|https:\/\/ark|"vectors"|"input"/);
});

test("database index failures are not misreported as embedding provider failures", async () => {
  const item = productItem({ slug: "camera", name: "infrared camera", locale: "en", category_slug: "thermal", category_name: "thermal" });
  const pool = { async connect() { return { async query(sql) {
    if (sql.includes("jsonb_array_length")) throw Object.assign(new Error("sensitive database details"), { code: "57014" });
    return { rows: [] };
  }, release() {} }; } };
  const result = await searchPublicContent({ pool, config, provider: { async embed() { assert.fail("index failure must not call model"); } },
    input: { query: "infrared", type: "product" }, message: "infrared", locale: "en", signal: new AbortController().signal,
    contentLoader: async () => ({ items: [item], newsUnavailable: false }) });
  assert.equal(result.retrieval.mode, "keyword-only");
  assert.equal(result.retrieval.embedding.reason, "index_unavailable");
  assert.equal(result.retrieval.embedding.error.sqlState, "57014");
  assert.equal(result.retrieval.embedding.error.phase, "vector_index");
  assert.equal(result.retrieval.embedding.calls, 0);
  assert.equal(result.products.length, 1);
  assert.doesNotMatch(JSON.stringify(result.retrieval), /sensitive database details/);
});

test("index maintenance repairs invalid and wrong-dimension vectors even when their content hash matches", () => {
  const items = ["current", "missing", "stale", "invalid", "short"].map((key) => ({ key, hash: `hash-${key}` }));
  const stored = [
    { content_key: "current", content_hash: "hash-current", dimensions: 2, valid: true },
    { content_key: "stale", content_hash: "old-hash", dimensions: 2, valid: true },
    { content_key: "invalid", content_hash: "hash-invalid", dimensions: 2, valid: false },
    { content_key: "short", content_hash: "hash-short", dimensions: 1, valid: true },
  ];
  assert.deepEqual(pendingVectorItems(items, stored, 2).map((item) => item.key), ["missing", "stale", "invalid", "short"]);
  assert.deepEqual(pendingVectorItems(items, [], 2), items);
  assert.deepEqual(pendingVectorItems([], stored, 2), []);
});

test("PostgreSQL scores vectors without transferring arrays and enforces locale, version and hash", async () => {
  const database = new PGlite();
  const pool = { async connect() { return { query: database.query.bind(database), release() {} }; } };
  try {
    await database.exec(`CREATE SCHEMA agent; CREATE TABLE agent.search_vectors (
      content_key text, content_hash text, locale text, model_version text, embedding jsonb)`);
    const version = embeddingVersion(config);
    for (const [key, hash, locale, model, vector] of [
      ["product:one", "hash-one", "zh", version, [3, 4]], ["product:two", "hash-two", "zh", version, [-3, -4]],
      ["product:zero", "zero", "zh", version, [0, 0]], ["product:invalid", "invalid", "zh", version, [1, "invalid"]],
      ["product:short", "short", "zh", version, [1]], ["product:one", "hash-one", "en", version, [4, 3]],
      ["product:one", "hash-one", "zh", "old-version", [4, 3]],
    ]) await database.query("INSERT INTO agent.search_vectors VALUES($1,$2,$3,$4,$5)", [key, hash, locale, model, JSON.stringify(vector)]);
    const index = await readVectorIndex(pool, config, "zh");
    assert.equal(index.length, 5);
    assert.ok(index.every((row) => !Object.hasOwn(row, "embedding")));
    assert.equal(index.find((row) => row.content_key === "product:zero").valid, false);
    assert.equal(index.find((row) => row.content_key === "product:invalid").valid, false);
    assert.deepEqual(pendingVectorItems(index.map((row) => ({ key: row.content_key, hash: row.content_hash })), index, config.dimensions)
      .map((item) => item.key).sort(), ["product:invalid", "product:short", "product:zero"]);
    const eligible = index.filter((row) => row.valid && row.dimensions === config.dimensions);
    const scored = await scoreVectorIndex(pool, config, "zh", [1, 0], eligible);
    assert.deepEqual(scored.map((row) => row.content_key), ["product:one", "product:two"]);
    assert.ok(Math.abs(scored[0].score - cosine([1, 0], [3, 4])) < 1e-12);
    assert.ok(Math.abs(scored[1].score - cosine([1, 0], [-3, -4])) < 1e-12);
    assert.deepEqual(await scoreVectorIndex(pool, config, "zh", [1, 0], [{ content_key: "product:one", content_hash: "stale" }]), []);
  } finally { await database.close(); }
});
