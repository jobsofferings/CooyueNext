const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1536;
const DEFAULT_TIMEOUT_MS = 15000;
const BATCH_SIZE = 64;

function getEmbeddingConfig() {
  const endpoint = String(process.env.KNOWLEDGE_EMBEDDING_API_URL || "").trim().replace(/\/+$/, "");
  const model = String(process.env.KNOWLEDGE_EMBEDDING_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const dimensions = Number.parseInt(process.env.KNOWLEDGE_EMBEDDING_DIMENSIONS || DEFAULT_DIMENSIONS, 10);
  const timeoutMs = Number.parseInt(process.env.KNOWLEDGE_EMBEDDING_TIMEOUT_MS || DEFAULT_TIMEOUT_MS, 10);
  const enabled = process.env.KNOWLEDGE_DENSE_EMBEDDINGS === "true" && Boolean(endpoint)
    && dimensions === DEFAULT_DIMENSIONS;
  return {
    enabled,
    endpoint: endpoint && (endpoint.endsWith("/embeddings") ? endpoint : `${endpoint}/embeddings`),
    apiKey: String(process.env.KNOWLEDGE_EMBEDDING_API_KEY || "").trim(),
    model,
    dimensions,
    timeoutMs: Number.isInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

function denseModelVersion(config = getEmbeddingConfig()) {
  return `catalog-dense:${config.model}:${config.dimensions}`;
}

function validateEmbedding(embedding, dimensions) {
  if (!Array.isArray(embedding) || embedding.length !== dimensions || embedding.some((value) => !Number.isFinite(Number(value)))) {
    throw new Error(`Embedding provider returned an invalid vector; expected ${dimensions} numeric values`);
  }
  return embedding.map((value) => Number(value));
}

async function embedTexts(texts, config = getEmbeddingConfig()) {
  if (!config.enabled) throw new Error("Dense embeddings are not configured");
  if (!texts.length) return [];

  const embeddings = [];
  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const headers = { "content-type": "application/json" };
      if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: config.model, input: batch, dimensions: config.dimensions }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Embedding provider returned HTTP ${response.status}`);
      const payload = await response.json();
      const entries = Array.isArray(payload.data) ? payload.data : [];
      if (entries.length !== batch.length) throw new Error("Embedding provider returned an unexpected result count");
      embeddings.push(...entries
        .sort((left, right) => Number(left.index || 0) - Number(right.index || 0))
        .map((entry) => validateEmbedding(entry.embedding, config.dimensions)));
    } finally {
      clearTimeout(timeout);
    }
  }
  return embeddings;
}

function vectorLiteral(embedding, dimensions = getEmbeddingConfig().dimensions) {
  return `[${validateEmbedding(embedding, dimensions).join(",")}]`;
}

module.exports = { BATCH_SIZE, DEFAULT_DIMENSIONS, DEFAULT_MODEL, denseModelVersion, embedTexts, getEmbeddingConfig, vectorLiteral };
