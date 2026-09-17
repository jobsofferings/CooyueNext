const test = require('node:test')
const assert = require('node:assert/strict')
const { createTextReveal, chatHistory } = require('../src/lib/agent-presentation')

function clock() {
  let sequence = 0
  const tasks = new Map()
  return {
    schedule(callback) { const id = ++sequence; tasks.set(id, callback); return id },
    unschedule(id) { tasks.delete(id) },
    tick() { const first = tasks.entries().next().value; if (first) { tasks.delete(first[0]); first[1]() } },
    flush() { for (let step = 0; tasks.size && step < 10000; step += 1) this.tick(); assert.equal(tasks.size, 0) },
  }
}

test('a buffered paragraph is revealed in small real-text increments before completion', async () => {
  const time = clock()
  const rendered = []
  const reveal = createTextReveal(text => rendered.push(text), time)
  const paragraph = '找到甲烷巡检候选产品。'.repeat(18)
  reveal.push(paragraph)
  assert.equal(rendered.length, 0)
  time.tick()
  assert(rendered[0].length <= 8)
  assert(rendered[0].length < paragraph.length)
  const finished = reveal.finish(paragraph)
  time.flush()
  await finished
  assert.equal(rendered.at(-1), paragraph)
  assert(rendered.length > 30)
  for (let index = 1; index < rendered.length; index += 1) {
    assert(rendered[index].startsWith(rendered[index - 1]))
    assert(rendered[index].length - rendered[index - 1].length <= 8)
  }
})

test('successive upstream chunks preserve ordering, Unicode and canonical completion', async () => {
  const time = clock()
  const rendered = []
  const reveal = createTextReveal(text => rendered.push(text), time)
  reveal.push('设备🔍')
  time.tick()
  reveal.push('甲烷')
  const finished = reveal.finish('设备🔍甲烷。')
  time.flush()
  await finished
  assert.equal(rendered.at(-1), '设备🔍甲烷。')
  assert(rendered.every(value => !/[\uD800-\uDBFF]$/.test(value)))
})

test('changed final evidence replaces streamed wording without dumping a full paragraph', async () => {
  const time = clock()
  const rendered = []
  const reveal = createTextReveal(text => rendered.push(text), time)
  reveal.push('此前检索到两款产品')
  time.flush()
  const final = '部分内容已更新或下架，请重新搜索。'
  const finished = reveal.finish(final)
  assert.equal(rendered.at(-1), '')
  time.tick()
  assert(rendered.at(-1).length < final.length)
  time.flush()
  await finished
  assert.equal(rendered.at(-1), final)
})

test('cancel settles rendering without late updates; reduced motion skips the animation', async () => {
  const time = clock()
  const rendered = []
  const reveal = createTextReveal(text => rendered.push(text), time)
  reveal.push('尚未显示的长文本')
  const finished = reveal.finish()
  reveal.cancel()
  time.flush()
  await finished
  reveal.push('不应该出现')
  assert.deepEqual(rendered, [])
  const immediate = createTextReveal(text => rendered.push(text), { ...time, reducedMotion: true })
  immediate.push('无需动画')
  await immediate.finish()
  assert.deepEqual(rendered, ['无需动画'])
})

test('history automatically restores every turn with its own product and news cards', () => {
  const first = { message: '第一轮', products: [{ id: 'methane' }], news: [] }
  const second = { message: '第二轮', products: [], news: [{ id: 'guide' }] }
  const messages = chatHistory([{ createdAt: 'date-a', user: '甲烷', result: first }, { createdAt: 'date-b', user: '资料', result: second }])
  assert.deepEqual(messages.map(message => message.role), ['user', 'assistant', 'user', 'assistant'])
  assert.equal(new Set(messages.map(message => message.id)).size, 4)
  assert.equal(messages[1].result, first)
  assert.equal(messages[3].result, second)
  assert.equal(messages[2].content, '资料')
})
