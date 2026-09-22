const OpenAI = require("openai");
const { failure } = require("./config");

const ARK_QUERY_INSTRUCTIONS = "Target_modality: text.\nInstruction:Retrieve relevant product descriptions, technical specifications, or news articles for the user's search query\nQuery:";
const ARK_DOCUMENT_INSTRUCTIONS = "Instruction:Compress the text into one word.\nQuery:";

function embeddingSettings(config) {
  const provider = config.embeddingProvider || "openai";
  const inherited = provider === "openai" && !config.embeddingBaseURL;
  return {
    provider, inherited,
    baseURL: (config.embeddingBaseURL || (inherited ? config.baseURL : "") || "").replace(/\/+$/, ""),
    apiKey: config.embeddingApiKey || (inherited ? config.apiKey : ""),
  };
}

function embeddingVersion(config) {
  const settings = embeddingSettings(config);
  if (settings.inherited) return `v1:${config.baseURL}:${config.embeddingModel}:${config.dimensions}`;
  return `v2:${settings.provider}:${settings.baseURL}:${config.embeddingModel}:${config.dimensions}:${settings.provider === "ark" ? "text-search-v2" : "default"}`;
}

function validateSettings(config, settings) {
  if (!["openai", "ark"].includes(settings.provider) || !settings.apiKey) throw failure("EMBEDDING_NOT_CONFIGURED", 503);
  let endpoint;
  try { endpoint = new URL(settings.baseURL); } catch { throw failure("EMBEDDING_NOT_CONFIGURED", 503); }
  const allowedHttp = settings.inherited && endpoint.protocol === "http:"
    && settings.baseURL === (config.allowedHttpBaseURL || "").replace(/\/+$/, "");
  if ((endpoint.protocol !== "https:" && !allowedHttp) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw failure("EMBEDDING_NOT_CONFIGURED", 503);
  }
}

function validVector(vector, dimensions) {
  return Array.isArray(vector) && vector.length === dimensions && vector.every(Number.isFinite) && vector.some((value) => value !== 0);
}

function embeddingAudit(config) {
  return { enabled: Boolean(config.embeddingModel), provider: config.embeddingProvider || "openai", model: config.embeddingModel || null,
    dimensions: config.dimensions, minSimilarity: config.minSimilarity, status: config.embeddingModel ? "pending" : "disabled",
    reason: config.embeddingModel ? null : "embedding_not_configured", calls: 0, durationMs: null, totalTokens: null,
    vectorMatches: 0, topMatches: [] };
}

function createEmbedder(config, inheritedClient) {
  const settings = embeddingSettings(config);
  let client;
  return async function embed(texts, signal, { purpose = "query" } = {}) {
    if (!config.embeddingModel) throw failure("EMBEDDING_NOT_CONFIGURED", 503);
    validateSettings(config, settings);
    if (!Array.isArray(texts) || !texts.length || texts.some((text) => typeof text !== "string" || !text.trim())
      || !["query", "document"].includes(purpose)) throw failure("INVALID_EMBEDDING_INPUT", 400);
    const controller = new AbortController();
    const combined = AbortSignal.any([controller.signal, AbortSignal.timeout(config.timeoutMs || 60000), ...(signal ? [signal] : [])]);
    combined.throwIfAborted();
    try {
      if (settings.provider === "openai") {
        client ||= settings.inherited && !config.embeddingApiKey && inheritedClient ? inheritedClient : new OpenAI({
          apiKey: settings.apiKey, baseURL: settings.baseURL, maxRetries: 0, timeout: config.timeoutMs, logLevel: "off",
          fetch: (url, options) => {
            if (String(url) !== `${settings.baseURL}/embeddings`) throw failure("PROVIDER_PATH_FORBIDDEN", 502);
            return fetch(url, { ...options, redirect: "error" });
          },
        });
        const response = await client.embeddings.create({ model: config.embeddingModel, input: texts, encoding_format: "float" }, { signal: combined });
        if (!Array.isArray(response.data)) throw failure("INVALID_EMBEDDING", 502);
        const entries = [...response.data].sort((left, right) => left?.index - right?.index);
        if (entries.length !== texts.length || entries.some((entry, index) => entry?.index !== index
          || !validVector(entry.embedding, config.dimensions))) throw failure("INVALID_EMBEDDING", 502);
        return { vectors: entries.map((entry) => entry.embedding), usage: response.usage };
      }
      const vectors = new Array(texts.length);
      let offset = 0;
      let totalTokens = 0;
      let usageComplete = true;
      await Promise.all(Array.from({ length: Math.min(4, texts.length) }, async () => {
        while (offset < texts.length) {
          combined.throwIfAborted();
          const index = offset++;
          const response = await fetch(`${settings.baseURL}/embeddings/multimodal`, {
            method: "POST", redirect: "error", signal: combined,
            headers: { "content-type": "application/json", authorization: `Bearer ${settings.apiKey}` },
            body: JSON.stringify({ model: config.embeddingModel, dimensions: config.dimensions, encoding_format: "float",
              instructions: purpose === "query" ? ARK_QUERY_INSTRUCTIONS : ARK_DOCUMENT_INSTRUCTIONS, input: [{ type: "text", text: texts[index] }] }),
          });
          if (!response.ok) {
            await response.body?.cancel();
            throw failure("EMBEDDING_UNAVAILABLE", response.status);
          }
          const payload = await response.json();
          if (!validVector(payload.data?.embedding, config.dimensions)) throw failure("INVALID_EMBEDDING", 502);
          vectors[index] = payload.data.embedding;
          if (Number.isFinite(payload.usage?.total_tokens)) totalTokens += payload.usage.total_tokens;
          else usageComplete = false;
        }
      }));
      return { vectors, usage: usageComplete ? { total_tokens: totalTokens } : undefined };
    } catch (error) {
      controller.abort(error);
      throw error;
    }
  };
}

module.exports = { ARK_QUERY_INSTRUCTIONS, ARK_DOCUMENT_INSTRUCTIONS, createEmbedder, embeddingAudit, embeddingVersion, validVector };
