function agentError(code, details = {}) {
  return Object.assign(new Error(code), { code, requestId: details.requestId, runId: details.runId, phase: details.phase });
}

function createAgentRequestId(cryptoProvider = globalThis.crypto) {
  if (typeof cryptoProvider.randomUUID === "function") return cryptoProvider.randomUUID();
  const bytes = cryptoProvider.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function consumeAgentStream(response, onEvent) {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw agentError(payload?.error || "AGENT_UNAVAILABLE", payload || {});
  }
  if (!response.headers.get("content-type")?.includes("text/event-stream") || !response.body) throw new Error("INVALID_STREAM");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete = false;
  let result = false;
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 512000) throw new Error("STREAM_TOO_LARGE");
      buffer += decoder.decode(part.value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const lines = frame.split("\n");
        const event = lines.find((line) => line.startsWith("event: "))?.slice(7);
        const data = lines.filter((line) => line.startsWith("data: ")).map((line) => line.slice(6)).join("\n");
        if (!event || !data) continue;
        const payload = JSON.parse(data);
        if (event === "error") throw agentError(payload.code || "AGENT_UNAVAILABLE", payload);
        if (event === "results") result = true;
        if (event === "done") { if (!result || payload.ok !== true) throw new Error("INCOMPLETE_STREAM"); complete = true; }
        onEvent(event, payload);
      }
    }
    if (!complete) throw new Error("INCOMPLETE_STREAM");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

module.exports = { agentError, createAgentRequestId, consumeAgentStream };
