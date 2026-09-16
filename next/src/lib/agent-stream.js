async function consumeAgentStream(response, onEvent) {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "AGENT_UNAVAILABLE");
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
        if (event === "error") throw new Error(payload.code || "AGENT_UNAVAILABLE");
        if (event === "results") result = true;
        if (event === "done") { if (!result || payload.ok !== true) throw new Error("INCOMPLETE_STREAM"); complete = true; }
        onEvent(event, payload);
      }
    }
    if (!complete) throw new Error("INCOMPLETE_STREAM");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

module.exports = { consumeAgentStream };
