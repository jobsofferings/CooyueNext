const assert = require('node:assert/strict')
const { join } = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

const origin = process.env.COOYUE_TEST_ORIGIN || 'http://127.0.0.1:3011'
const products = ['GF77', 'PV400', 'G306'].map((model) => ({
  id: model.toLowerCase(), slug: model.toLowerCase(), type: 'product', model, name: `Fixture ${model}`,
  category: 'gas-imaging', categoryName: '气体红外成像', description: '用于测试聊天内人工对比与询盘的公开产品资料。',
  specs: ['手持', '公开参数'], metrics: [{ label: '型号', value: model }],
  facts: { gases: ['methane'], formFactor: 'handheld', resolution: '320×256' },
  detailPath: `/zh/products/${model.toLowerCase()}`, version: `fixture-${model}`, matchReasons: ['审核资料记录甲烷'],
}))

async function verify(browser, mobile) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 } })
  const page = await context.newPage()
  const errors = []
  const calls = []
  let history = []
  let searches = 0
  let failCompare = false
  let failSearch = false
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/agent/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/agent/sessions') return route.fulfill({ json: { ok: true, data: { id: 'test-session' } } })
    if (request.method() === 'GET') return route.fulfill({ json: { ok: true, data: { history } } })
    searches += 1
    if (failSearch) return route.fulfill({ status: 503, json: { ok: false, error: 'AGENT_UPSTREAM_ERROR' } })
    const message = request.postDataJSON().message
    const result = { query: message, status: 'matches', message: '找到相关候选，请在本轮选择产品，再手动对比或询盘。'.repeat(5), products, news: [], clarification: null }
    history.push({ user: message, result, createdAt: `turn-${searches}` })
    const frames = [['status', { phase: 'explaining' }], ['message_delta', { delta: result.message }], ['results', result], ['done', { ok: true }]]
    return route.fulfill({ contentType: 'text/event-stream', body: frames.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('') })
  })
  await page.route('**/api/knowledge/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/knowledge/', '')
    const body = route.request().postDataJSON()
    calls.push({ path, body })
    if (path === 'compare') {
      if (failCompare) return route.fulfill({ status: 503, json: { ok: false, error: 'internal_failure' } })
      await new Promise((resolve) => setTimeout(resolve, 150))
      return route.fulfill({ json: { ok: true, data: { products: products.filter((product) => body.productSlugs.includes(product.slug)) } } })
    }
    if (path === 'inquiries/draft') return route.fulfill({ json: { ok: true, data: {
      id: `draft-${calls.length}`, confirmationToken: 'fixture-preview-only', expiresAt: '2030-01-01T00:00:00Z',
      summary: { query: body.query, requirements: body.requirements, products: products.filter((product) => body.productSlugs.includes(product.slug)) },
    } } })
    if (/^inquiries\/draft-\d+\/confirm$/.test(path)) return route.fulfill({ json: { ok: true, data: { delivery: 'sent' } } })
    throw new Error(`Unexpected request: ${path}`)
  })
  const ready = () => page.waitForFunction(() => document.querySelector('#agent-message') && !document.querySelector('#agent-message').disabled, null, { timeout: 30000 })
  const send = async (message) => {
    await page.locator('#agent-message').fill(message)
    await page.getByRole('button', { name: '发送消息', exact: true }).click()
    await ready()
  }
  await page.goto(`${origin}/zh/search?keywords=K10`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await ready()
  assert.equal(await page.locator('#agent-message').inputValue(), 'K10')
  assert.equal(searches, 0)
  assert.equal(calls.length, 0)
  assert.equal(await page.locator('#product-query, [class*="selectionBar"], [class*="readOnly"], form[class*="knowledge_card"]').count(), 0)
  assert.equal(await page.getByText('COOYUE ASSISTANT', { exact: true }).count(), 0)
  await send('甲烷巡检')
  const first = page.locator('[data-message-id][data-role="assistant"]').first()
  await first.locator('[data-product-id]').first().waitFor()
  const compare = first.getByRole('button', { name: '对比所选产品', exact: true })
  const inquiry = first.getByRole('button', { name: '询盘所选产品', exact: true })
  assert.equal(await compare.isDisabled(), true)
  assert.equal(await inquiry.isDisabled(), true)
  for (const slug of ['gf77', 'pv400']) await first.locator(`[data-product-id="${slug}"] input`).check()
  assert.equal(await first.locator('[data-message-actions]').evaluate((element) => element.closest('[class*="bubble"]') === null), true)
  await compare.click()
  await first.locator('[data-chat-action="compare"] table').waitFor()
  await ready()
  assert.equal(await first.locator('table thead th').count(), 3)
  assert.equal(searches, 1)
  await first.locator('[data-product-id="gf77"] input').uncheck()
  await first.locator('[data-product-id="g306"] input').check()
  assert.match(await first.locator('[data-chat-action="compare"]').innerText(), /上一次对比/)
  failCompare = true
  await first.getByRole('button', { name: '更新对比', exact: true }).click()
  await first.getByRole('alert').waitFor()
  assert.doesNotMatch(await first.getByRole('alert').innerText(), /internal_failure/)
  failCompare = false
  await ready()
  await first.getByRole('button', { name: '更新对比', exact: true }).click()
  await ready()
  assert.equal(await first.locator('[data-chat-action="compare"]').count(), 1)
  assert.deepEqual(await first.locator('table thead th').allTextContents(), ['参数', 'Fixture PV400', 'Fixture G306'])
  const beforeInquiry = calls.length
  await inquiry.click()
  const form = first.locator('[data-chat-action="inquiry"]')
  await form.locator('[data-inquiry-form]').waitFor()
  assert.equal(calls.length, beforeInquiry)
  await form.getByLabel('补充需求与待确认问题', { exact: true }).fill('请确认镜头配置')
  await form.getByRole('button', { name: '预览询盘邮件', exact: true }).click()
  await form.getByLabel('姓名', { exact: true }).waitFor()
  await ready()
  const confirm = form.getByRole('button', { name: '确认并发送询盘邮件', exact: true })
  assert.equal(await confirm.isDisabled(), true)
  await form.getByLabel('姓名', { exact: true }).fill('测试访客')
  await form.getByLabel('邮箱', { exact: true }).fill('visitor@example.test')
  await form.locator('input[type="checkbox"]').check()
  await first.locator('[data-product-id="gf77"] input').check()
  await page.waitForFunction(() => !document.querySelector('[data-chat-action="inquiry"] input[type="email"]'))
  assert.match(await form.innerText(), /旧预览已失效/)
  assert.equal(calls.filter((call) => call.path.endsWith('/confirm')).length, 0)
  await first.getByRole('button', { name: '更新询盘', exact: true }).click()
  assert.equal(await first.locator('[data-chat-action="inquiry"]').count(), 1)
  await form.getByRole('button', { name: '预览询盘邮件', exact: true }).click()
  await form.getByLabel('姓名', { exact: true }).waitFor()
  await ready()
  assert.equal(await confirm.isDisabled(), true)
  assert.equal(await form.getByLabel('邮箱', { exact: true }).inputValue(), 'visitor@example.test')
  await form.locator('input[type="checkbox"]').check()
  await form.getByLabel('姓名', { exact: true }).fill('更新后的测试访客')
  assert.equal(await form.locator('input[type="checkbox"]').isChecked(), false)
  await form.locator('input[type="checkbox"]').check()
  await confirm.click()
  await form.getByRole('status').filter({ hasText: '发送成功' }).waitFor()
  assert.equal(calls.filter((call) => call.path.endsWith('/confirm')).length, 1)
  assert.deepEqual(calls.filter((call) => call.path === 'inquiries/draft').at(-1).body.productSlugs, ['pv400', 'g306', 'gf77'])
  await send('LE')
  const second = page.locator('[data-message-id][data-role="assistant"]').nth(1)
  assert.equal(await second.locator('[data-product-id] input:checked').count(), 0)
  assert.equal(await first.locator('[data-product-id] input:checked').count(), 3)
  assert.equal(await second.getByRole('button', { name: '对比所选产品', exact: true }).isDisabled(), true)
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }))
  assert(dimensions.document <= dimensions.viewport + 2, JSON.stringify(dimensions))
  await first.locator('[data-message-actions]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(process.env.COOYUE_SCREENSHOT_DIR || '/tmp', `cooyue-chat-actions-${mobile ? 'mobile' : 'desktop'}.png`) })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  await ready()
  assert.equal(await page.locator('[data-product-id]').count(), 6)
  assert.equal(await page.locator('[data-message-actions]').count(), 2)
  assert.equal(await page.locator('[data-chat-action]').count(), 0)
  assert.equal(await page.locator('input[type="email"]').count(), 0)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('cooyue:search-keywords', { detail: { keywords: '所有气体红外成像' } })))
  assert.equal(await page.locator('#agent-message').inputValue(), '所有气体红外成像')
  failSearch = true
  await send('故障测试')
  assert.doesNotMatch(await page.locator('section[aria-labelledby="agent-search-title"]').getByRole('alert').innerText(), /AGENT_UPSTREAM_ERROR|普通搜索|下方/)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ mobile, passed: true, updatedComparison: true, updatedInquiry: true, consentReconfirmed: true,
    replySelectionsIndependent: true, historyCardsRestored: true, overflow: false, mockedDeliveries: 1, realEmailsSent: 0 }))
  await context.close()
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  try { await verify(browser, false); await verify(browser, true) } finally { await browser.close() }
})().catch((error) => { console.error(error.stack); process.exitCode = 1 })
