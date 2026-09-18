const test = require('node:test')
const assert = require('node:assert/strict')
const { scrollChatTarget } = require('../src/lib/agent-scroll')

function setup(context, reducedMotion = false) {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const previous = global.window
  global.window = {
    setTimeout, clearTimeout,
    requestAnimationFrame: (callback) => setTimeout(callback, 16),
    cancelAnimationFrame: clearTimeout,
    getComputedStyle: (element) => ({ overflowY: element.overflowY }),
    matchMedia: () => ({ matches: reducedMotion }),
  }
  context.after(() => { if (previous === undefined) delete global.window; else global.window = previous })
  const calls = []
  const panel = {}
  const scroller = { parentElement: panel, overflowY: 'auto', scrollHeight: 2000, clientHeight: 600, scrollTop: 200,
    getBoundingClientRect: () => ({ top: 100 }), scrollTo: (options) => calls.push(options) }
  const content = { parentElement: scroller, overflowY: 'auto', scrollHeight: 2000, clientHeight: 2000 }
  const target = { parentElement: content, isConnected: true, closest: (selector) => selector === '[hidden]' ? null : panel,
    getBoundingClientRect: () => ({ top: 800 }), focus: (options) => calls.push({ focus: options }) }
  return { target, scroller, calls, flush: () => { context.mock.timers.tick(80); context.mock.timers.tick(16) } }
}

test('action scrolling skips non-scrollable Copilot content and focuses without page scrolling', (context) => {
  const { target, calls, flush } = setup(context)
  scrollChatTarget(target)
  flush()
  assert.deepEqual(calls, [{ focus: { preventScroll: true } }, { top: 884, behavior: 'smooth' }])
})

test('short action content aligns at the maximum scroll position', (context) => {
  const { target, scroller, calls, flush } = setup(context)
  scroller.scrollHeight = 1000
  scrollChatTarget(target)
  flush()
  assert.deepEqual(calls.at(-1), { top: 400, behavior: 'smooth' })
})

test('sending reaches the latest bottom immediately without stealing focus', (context) => {
  const { target, scroller, calls, flush } = setup(context)
  scrollChatTarget(target, { focus: false, bottom: true })
  scroller.scrollHeight = 2500
  flush()
  assert.deepEqual(calls, [{ top: 1900, behavior: 'instant' }])
})

test('action scrolling respects reduced-motion preferences', (context) => {
  const { target, calls, flush } = setup(context, true)
  scrollChatTarget(target)
  flush()
  assert.equal(calls.at(-1).behavior, 'instant')
})

test('cancelled or disconnected targets do not scroll', (context) => {
  const { target, calls, flush } = setup(context)
  const cancel = scrollChatTarget(target)
  context.mock.timers.tick(80)
  cancel()
  flush()
  scrollChatTarget(target)
  target.isConnected = false
  flush()
  assert.deepEqual(calls, [])
})

test('background conversations never steal focus or scroll the active page', (context) => {
  const { target, calls, flush } = setup(context)
  target.closest = () => ({ hidden: true })
  scrollChatTarget(target)
  flush()
  assert.deepEqual(calls, [])
})
