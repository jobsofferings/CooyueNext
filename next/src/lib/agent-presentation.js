function createTextReveal(onChange, { intervalMs = 20, reducedMotion = false, schedule = setTimeout, unschedule = clearTimeout } = {}) {
  let received = "";
  let visible = "";
  let pending = [];
  let timer;
  let cancelled = false;
  let settle;
  const complete = () => { if (!pending.length && settle) { const resolve = settle; settle = undefined; resolve(); } };
  const tick = () => {
    timer = undefined;
    if (cancelled) return;
    visible += pending.splice(0, Math.min(8, Math.max(1, Math.ceil(pending.length / 35)))).join("");
    onChange(visible);
    if (pending.length) timer = schedule(tick, intervalMs);
    else complete();
  };
  const push = (delta) => {
    if (cancelled || !delta) return;
    received += delta;
    if (reducedMotion) { visible = received; onChange(visible); complete(); return; }
    pending.push(...Array.from(delta));
    if (timer === undefined) timer = schedule(tick, intervalMs);
  };
  return {
    push,
    finish(finalText = received) {
      if (cancelled) return Promise.resolve();
      if (finalText.startsWith(received)) push(finalText.slice(received.length));
      else {
        if (timer !== undefined) unschedule(timer);
        timer = undefined;
        received = ""; visible = ""; pending = [];
        onChange(""); push(finalText);
      }
      if (!pending.length) return Promise.resolve();
      return new Promise((resolve) => { settle = resolve; });
    },
    cancel() {
      cancelled = true;
      if (timer !== undefined) unschedule(timer);
      timer = undefined; pending = []; complete();
    },
  };
}

function chatHistory(history) {
  return history.flatMap((turn, index) => [
    { id: `history-${turn.createdAt}-${index}-user`, role: "user", content: turn.user },
    { id: `history-${turn.createdAt}-${index}-assistant`, role: "assistant", content: turn.result.message, result: turn.result },
  ]);
}

module.exports = { createTextReveal, chatHistory };
