const { failure } = require("./config");

function diagnostic(error) {
  const allowed = /^[A-Z][A-Z0-9_]{2,60}$/;
  return {
    code: allowed.test(error?.code || "") ? error.code : "UPSTREAM_ERROR",
    ...(Number.isInteger(error?.status) ? { httpStatus: error.status } : {}),
    ...(allowed.test(error?.cause?.code || "") ? { networkCode: error.cause.code } : {}),
    ...(typeof error?.name === "string" && /^[A-Za-z]{1,40}$/.test(error.name) ? { errorType: error.name } : {}),
  };
}

function createTrace(metrics, { startedAt = Date.now(), onChange = () => {}, log = () => {} } = {}) {
  metrics.phases ||= [];
  const active = [];
  const publish = (event) => {
    metrics.currentPhase = active.at(-1)?.phase || "idle";
    onChange();
    log(event);
  };
  return {
    async step(phase, operation, { signal, timeoutMs = 10000 } = {}) {
      const started = Date.now();
      const entry = { phase, status: "running", startedAt: new Date(started).toISOString(), offsetMs: started - startedAt, timeoutMs };
      metrics.phases.push(entry);
      active.push(entry);
      publish({ phase, status: "started", offsetMs: entry.offsetMs });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(failure("PHASE_TIMEOUT", 504)), timeoutMs);
      const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
      let abort;
      const mark = (details) => {
        if (combined.aborted || entry.status !== "running") return;
        Object.assign(entry, details);
        publish({ phase, status: "progress", ...details });
      };
      try {
        combined.throwIfAborted();
        const interrupted = new Promise((_resolve, reject) => {
          abort = () => reject(combined.reason);
          combined.addEventListener("abort", abort, { once: true });
        });
        const value = await Promise.race([Promise.resolve().then(() => operation(combined, mark)), interrupted]);
        combined.throwIfAborted();
        entry.status = "completed";
        return value;
      } catch (error) {
        const original = combined.aborted ? combined.reason : error;
        const reason = original instanceof Error ? original : failure("UPSTREAM_ERROR", 502);
        reason.agentPhase ||= phase;
        metrics.failedPhase = reason.agentPhase;
        entry.status = /TIMEOUT/.test(reason.code || "") ? "timeout" : combined.aborted ? "cancelled" : "failed";
        const details = diagnostic(reason);
        if (entry.httpStatus && details.httpStatus) { details.errorStatus = details.httpStatus; delete details.httpStatus; }
        Object.assign(entry, details);
        throw reason;
      } finally {
        clearTimeout(timer);
        if (abort) combined.removeEventListener("abort", abort);
        entry.durationMs = Date.now() - started;
        entry.finishedAt = new Date().toISOString();
        active.splice(active.indexOf(entry), 1);
        publish({ ...entry });
      }
    },
  };
}

module.exports = { createTrace, diagnostic };
