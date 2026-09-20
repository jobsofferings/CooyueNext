function scrollChatTarget(target, { focus = true, bottom = false } = {}) {
  if (!target) return () => {};
  let frame;
  const timer = window.setTimeout(() => {
    frame = window.requestAnimationFrame(() => {
      if (!target.isConnected || target.closest('[hidden]')) return;
      const panel = target.closest('[data-agent-search]');
      let scroller = target.parentElement;
      while (scroller && scroller !== panel) {
        if (/(auto|scroll)/.test(window.getComputedStyle(scroller).overflowY) && scroller.scrollHeight > scroller.clientHeight) {
          const maximum = scroller.scrollHeight - scroller.clientHeight;
          const top = bottom ? maximum : target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
          if (focus) target.focus({ preventScroll: true });
          scroller.scrollTo({ top: Math.min(maximum, Math.max(0, top)), behavior: bottom || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
          break;
        }
        scroller = scroller.parentElement;
      }
    });
  }, 80);
  return () => { window.clearTimeout(timer); if (frame !== undefined) window.cancelAnimationFrame(frame); };
}

module.exports = { scrollChatTarget };
