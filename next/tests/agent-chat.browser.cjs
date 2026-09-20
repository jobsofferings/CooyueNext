const assert = require('node:assert/strict')
const { join } = require('node:path')
const { randomUUID } = require('node:crypto')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

const origin = process.env.COOYUE_TEST_ORIGIN || 'http://127.0.0.1:3011'
const products = ['GF77', 'PV400', 'G306'].map((model) => ({
  id: model.toLowerCase(), slug: model.toLowerCase(), type: 'product', model, name: `Fixture ${model}`,
  category: 'gas-imaging', categoryName: '气体红外成像', description: '用于测试聊天内人工对比与询盘的公开产品资料。',
  specs: ['手持', '公开参数'], metrics: [{ label: '型号', value: model }],
  facts: { gases: ['methane'], formFactor: 'handheld', resolution: '320×256' },
  detailPath: `/zh/products/${model.toLowerCase()}`, version: `fixture-${model}`, matchReasons: ['审核资料记录甲烷'],
}))
const allProducts = [...products, ...Array.from({ length: 17 }, (_, index) => ({ ...products[0],
  id: `extra-${index}`, slug: `extra-${index}`, name: `Fixture device ${index + 4}`, model: `EX${index + 4}`, version: `fixture-extra-${index}` }))]

async function verify(browser, mobile) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 } })
  const page = await context.newPage()
  const chat = page.locator('[data-agent-active="true"]')
  const errors = []
  const calls = []
  let history = []
  let searches = 0
  let failCompare = false
  let comparisonGate = null
  let failSearch = false
  let responseGate = null
  let contextId = randomUUID()
  const knownContexts = new Set([contextId])
  const pendingMessages = new Set()
  const messageGates = new Map()
  let activationGate = null
  let historyReads = 0
  let revision = 0
  let contextChanges = 0
  const sentContexts = []
  const titles = new Map()
  const contextList = () => {
    const grouped = new Map()
    for (const turn of history) {
      const previous = grouped.get(turn.contextId)
      grouped.set(turn.contextId, { id: turn.contextId, title: titles.get(turn.contextId), turnCount: (previous?.turnCount || 0) + 1, updatedAt: turn.createdAt })
    }
    for (const id of knownContexts) if (!grouped.has(id)) grouped.set(id, { id, title: '新对话', turnCount: 0, updatedAt: null })
    return [...grouped.values()]
  }
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/agent/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/agent/sessions') return route.fulfill({ json: { ok: true, data: { id: 'test-session', contextId } } })
    if (request.method() === 'GET') { historyReads += 1; return route.fulfill({ json: { ok: true, data: { history, contextId, contexts: contextList(), revision } } }) }
    if (path.endsWith('/activate')) {
      const target = path.split('/').at(-2)
      assert(knownContexts.has(target))
      if (activationGate) await activationGate
      contextId = target
      return route.fulfill({ json: { ok: true, data: { contextId } } })
    }
    if (path.endsWith('/contexts')) {
      assert(knownContexts.has(request.postDataJSON().contextId))
      contextId = randomUUID(); contextChanges += 1
      knownContexts.add(contextId); revision += 1
      return route.fulfill({ json: { ok: true, data: { contextId, contexts: contextList(), revision } } })
    }
    const messageContext = request.postDataJSON().contextId
    assert(knownContexts.has(messageContext))
    sentContexts.push(messageContext)
    searches += 1
    if (failSearch) return route.fulfill({ status: 503, json: { ok: false, error: 'AGENT_UPSTREAM_ERROR' } })
    const message = request.postDataJSON().message
    pendingMessages.add(messageContext)
    if (messageGates.has(message)) await messageGates.get(message)
    if (responseGate) await responseGate
    const result = { query: message, status: 'matches', message: '找到相关候选，请在本轮选择产品，再手动对比或询盘。'.repeat(5), products: message === '全部20款' ? allProducts : products, news: [], clarification: null }
    if (!titles.has(messageContext)) titles.set(messageContext, message === '甲烷巡检' ? '甲烷巡检手持设备' : `${message}产品选型`)
    history.push({ user: message, result, contextId: messageContext, createdAt: `turn-${searches}` })
    history = history.slice(-10)
    pendingMessages.delete(messageContext); revision += 1
    const frames = [['status', { phase: 'explaining' }], ['message_delta', { delta: result.message }], ['context', { contextId: messageContext, contexts: contextList(), revision }], ['results', result], ['done', { ok: true }]]
    return route.fulfill({ contentType: 'text/event-stream', body: frames.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('') })
  })
  await page.route('**/api/knowledge/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/knowledge/', '')
    const body = route.request().postDataJSON()
    calls.push({ path, body })
    if (path === 'compare') {
      if (failCompare) return route.fulfill({ status: 503, json: { ok: false, error: 'internal_failure' } })
      if (comparisonGate) await comparisonGate
      await new Promise((resolve) => setTimeout(resolve, 150))
      return route.fulfill({ json: { ok: true, data: { products: allProducts.filter((product) => body.productSlugs.includes(product.slug)) } } })
    }
    if (path === 'inquiries/draft') return route.fulfill({ json: { ok: true, data: {
      id: `draft-${calls.length}`, confirmationToken: 'fixture-preview-only', expiresAt: '2030-01-01T00:00:00Z',
      summary: { query: body.query, requirements: body.requirements, products: allProducts.filter((product) => body.productSlugs.includes(product.slug)) },
    } } })
    if (/^inquiries\/draft-\d+\/confirm$/.test(path)) return route.fulfill({ json: { ok: true, data: { delivery: 'sent' } } })
    throw new Error(`Unexpected request: ${path}`)
  })
  const ready = () => page.waitForFunction(() => document.querySelector('#agent-message') && !document.querySelector('#agent-message').disabled, null, { timeout: 30000 })
  const positioned = async (selector) => {
    await page.waitForFunction((value) => {
      const target = document.querySelector('[data-agent-active="true"]').querySelector(value)
      if (!target) return false
      let parent = target.parentElement
      while (parent && (!/(auto|scroll)/.test(getComputedStyle(parent).overflowY) || parent.scrollHeight <= parent.clientHeight)) parent = parent.parentElement
      if (!parent) return false
      const top = target.getBoundingClientRect().top
      const offset = top - parent.getBoundingClientRect().top
      const composer = document.querySelector('#agent-message').getBoundingClientRect()
      const maximum = parent.scrollHeight - parent.clientHeight
      const expected = Math.min(maximum, Math.max(0, offset + parent.scrollTop - 16))
      return document.activeElement === target && Math.abs(parent.scrollTop - expected) <= 4 && top >= parent.getBoundingClientRect().top - 2 && top < composer.top - 35
    }, selector, { timeout: 10000 })
  }
  const atBottom = () => page.waitForFunction(() => {
    let parent = document.querySelector('[data-agent-active="true"] [data-testid="copilot-scroll-content"]')?.parentElement
    while (parent && (!/(auto|scroll)/.test(getComputedStyle(parent).overflowY) || parent.scrollHeight <= parent.clientHeight)) parent = parent.parentElement
    if (!parent) return false
    const latest = [...document.querySelectorAll('[data-agent-active="true"] [data-message-id]')].at(-1)
    const composer = document.querySelector('#agent-message').getBoundingClientRect()
    return parent.scrollHeight - parent.clientHeight - parent.scrollTop <= 4 && latest.getBoundingClientRect().bottom <= composer.top
  }, null, { timeout: 10000 })
  const send = async (message) => {
    await page.locator('#agent-message').fill(message)
    await page.getByRole('button', { name: '发送消息', exact: true }).click()
    await ready()
    await atBottom()
  }
  const selectHistory = async (id, waitReady = true) => {
    const item = page.locator(`[data-history-context="${id}"]`)
    if (!await item.isVisible()) await page.getByRole('button', { name: /^历史会话/ }).click()
    await item.click()
    assert.equal(await chat.getAttribute('data-agent-context'), id)
    if (waitReady) await ready()
  }
  const startNew = async () => {
    const before = await chat.getAttribute('data-agent-context')
    await page.getByRole('button', { name: 'New · 开始新上下文', exact: true }).click()
    await page.waitForFunction((previous) => document.querySelector('[data-agent-active="true"]')?.dataset.agentContext !== previous, before)
    await ready()
  }
  const fitsViewport = async () => {
    await page.waitForFunction(() => {
      const main = document.querySelector('main').getBoundingClientRect()
      const header = document.querySelector('.main-header').getBoundingClientRect()
      return Math.abs(main.bottom - window.innerHeight) <= 1 && Math.abs(main.top - header.bottom) <= 1
    }, null, { timeout: 5000 })
    const layout = await page.evaluate(() => {
      const history = document.querySelector('aside[aria-label="历史会话"]')
      const heading = history.querySelector('h2')
      const title = (heading.getClientRects().length ? heading : history.querySelector('[aria-controls="agent-history-list"]')).getBoundingClientRect()
      const button = history.querySelector('button[aria-label^="New"]')
      const action = button.getBoundingClientRect()
      const row = getComputedStyle(button.parentElement)
      const composer = document.querySelector('#agent-message').closest('form').parentElement.getBoundingClientRect()
      return { scrollY: window.scrollY, headerTop: document.querySelector('.main-header').getBoundingClientRect().top,
        titleRight: title.right, actionLeft: action.left, centerDifference: Math.abs(title.top + title.height / 2 - action.top - action.height / 2),
        display: row.display, justifyContent: row.justifyContent, composerBottom: composer.bottom, viewportHeight: window.innerHeight,
        overflow: document.documentElement.scrollWidth > window.innerWidth }
    })
    assert.equal(layout.scrollY, 0, JSON.stringify(layout))
    assert.equal(layout.headerTop, 0, JSON.stringify(layout))
    assert.equal(layout.display, 'flex')
    assert.equal(layout.justifyContent, 'space-between')
    assert(layout.actionLeft > layout.titleRight, JSON.stringify(layout))
    assert(layout.centerDifference <= 1, JSON.stringify(layout))
    assert(layout.composerBottom <= layout.viewportHeight, JSON.stringify(layout))
    assert.equal(layout.overflow, false)
    assert.equal(await page.locator('main section > header').count(), 0)
  }
  await page.goto(`${origin}/zh`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  assert.equal(await page.locator('.main-header .main-menu__search').getAttribute('href'), '/zh/search')
  assert.equal(await page.locator('.stricky-header .main-menu__search').getAttribute('href'), '/zh/search')
  await page.locator('.main-header .main-menu__search').click()
  await page.waitForURL('**/zh/search')
  await ready()
  await fitsViewport()
  const initialViewport = page.viewportSize()
  for (const viewport of mobile ? [{ width: 768, height: 1024 }, { width: 390, height: 568 }]
    : [{ width: 1280, height: 720 }, { width: 1440, height: 600 }]) {
    await page.setViewportSize(viewport)
    await fitsViewport()
  }
  await page.setViewportSize(initialViewport)
  await fitsViewport()
  assert.equal(await page.locator('.search-popup, .search-toggler').count(), 0)
  await page.goto(`${origin}/zh/search?keywords=K10`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await ready()
  assert.equal(await page.locator('#agent-message').inputValue(), 'K10')
  const placeholder = await page.locator('#agent-message').evaluate((element) => ({ text: getComputedStyle(element).color,
    hint: getComputedStyle(element, '::placeholder').color, opacity: getComputedStyle(element, '::placeholder').opacity }))
  assert.equal(placeholder.hint, 'rgb(129, 144, 162)')
  assert.notEqual(placeholder.hint, placeholder.text)
  assert.equal(placeholder.opacity, '1')
  if (!mobile) {
    const phone = await page.locator('.main-header').evaluate((header) => {
      const icon = header.querySelector('.main-menu__call-icon').getBoundingClientRect()
      const menu = header.querySelector('.main-menu__bottom-inner').getBoundingClientRect()
      const call = header.querySelector('.main-menu__call').getBoundingClientRect()
      return { gap: icon.left - menu.right, centerDifference: Math.abs(icon.top + icon.height / 2 - call.top - call.height / 2) }
    })
    assert(phone.gap >= 8, JSON.stringify(phone))
    assert(phone.centerDifference < 1, JSON.stringify(phone))
  }
  assert.equal(searches, 0)
  assert.equal(calls.length, 0)
  assert.equal(await page.locator('#product-query, [class*="selectionBar"], [class*="readOnly"], form[class*="knowledge_card"]').count(), 0)
  assert.equal(await page.getByText('COOYUE ASSISTANT', { exact: true }).count(), 0)
  assert.equal(await page.getByRole('link', { name: /产品目录/ }).count(), 0)
  const newContext = page.getByRole('button', { name: 'New · 开始新上下文', exact: true })
  assert.equal(await newContext.isDisabled(), true)
  await send('甲烷巡检')
  const first = chat.locator('[data-message-id][data-role="assistant"]').first()
  await first.locator('[data-product-id]').first().waitFor()
  for (const link of await first.getByRole('link', { name: '查看产品详情', exact: true }).all()) {
    assert.equal(await link.getAttribute('target'), '_blank')
    assert.match(await link.getAttribute('rel'), /noopener/)
  }
  const compare = first.getByRole('button', { name: '对比所选产品', exact: true })
  const inquiry = first.getByRole('button', { name: '询盘所选产品', exact: true })
  assert.equal(await compare.isDisabled(), true)
  assert.equal(await inquiry.isDisabled(), true)
  const selectAll = first.getByRole('checkbox', { name: '全选本轮产品', exact: true })
  await selectAll.check()
  assert.equal(await first.locator('[data-product-id] input:checked').count(), 3)
  assert.equal(calls.length, 0)
  await selectAll.uncheck()
  assert.equal(await first.locator('[data-product-id] input:checked').count(), 0)
  for (const slug of ['gf77', 'pv400']) await first.locator(`[data-product-id="${slug}"] input`).check()
  assert.equal(await selectAll.evaluate((element) => element.indeterminate), true)
  assert.equal(await first.locator('[data-message-actions]').evaluate((element) => element.closest('[class*="bubble"]') === null), true)
  await compare.click()
  await first.locator('[data-chat-action="compare"] table').waitFor()
  await ready()
  await positioned('[data-chat-action="compare"]')
  assert.equal(await first.locator('[data-message-followups]').evaluate((element) => getComputedStyle(element).borderLeftWidth), '0px')
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
  await positioned('[data-chat-action="compare"]')
  assert.deepEqual(await first.locator('table thead th').allTextContents(), ['参数', 'Fixture PV400', 'Fixture G306'])
  const beforeInquiry = calls.length
  await inquiry.click()
  const form = first.locator('[data-chat-action="inquiry"]')
  await form.locator('[data-inquiry-form]').waitFor()
  await positioned('[data-chat-action="inquiry"]')
  assert.equal(calls.length, beforeInquiry)
  await form.getByLabel('补充需求与待确认问题', { exact: true }).fill('请确认镜头配置')
  await form.getByRole('button', { name: '预览询盘邮件', exact: true }).click()
  await form.getByLabel('姓名', { exact: true }).waitFor()
  await ready()
  await positioned('[data-inquiry-preview]')
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
  await positioned('[data-inquiry-form] [role="status"]')
  assert.equal(calls.filter((call) => call.path.endsWith('/confirm')).length, 1)
  assert.deepEqual(calls.filter((call) => call.path === 'inquiries/draft').at(-1).body.productSlugs, ['pv400', 'g306', 'gf77'])
  await page.evaluate(() => {
    let parent = document.querySelector('[data-agent-active="true"] [data-testid="copilot-scroll-content"]').parentElement
    while (parent && (!/(auto|scroll)/.test(getComputedStyle(parent).overflowY) || parent.scrollHeight <= parent.clientHeight)) parent = parent.parentElement
    parent.scrollTo({ top: 0, behavior: 'instant' })
  })
  await page.getByTestId('copilot-scroll-to-bottom').waitFor({ state: 'visible' })
  let releaseResponse
  responseGate = new Promise((resolve) => { releaseResponse = resolve })
  await page.locator('#agent-message').fill('LE')
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await atBottom()
  assert.equal(await page.locator('#agent-message').isDisabled(), true)
  releaseResponse()
  responseGate = null
  await ready()
  await atBottom()
  const second = chat.locator('[data-message-id][data-role="assistant"]').nth(1)
  assert.equal(await second.locator('[data-product-id] input:checked').count(), 0)
  assert.equal(await first.locator('[data-product-id] input:checked').count(), 3)
  assert.equal(await second.getByRole('button', { name: '对比所选产品', exact: true }).isDisabled(), true)
  const oldContext = contextId
  await startNew()
  await ready()
  assert.equal(contextChanges, 1)
  assert.notEqual(contextId, oldContext)
  assert.equal(await page.locator('#agent-message').inputValue(), '')
  assert.equal(await chat.locator('[data-context-boundary]').count(), 0)
  assert.equal(await chat.locator('[data-message-id]').count(), 0)
  assert.equal(await chat.locator('[data-product-id]').count(), 0)
  assert.equal(await page.locator(`[data-history-context="${oldContext}"]`).getAttribute('aria-label'), '甲烷巡检手持设备')
  assert.equal(await newContext.isDisabled(), true)
  if (!mobile) {
    const widths = await page.evaluate(() => ({ messages: document.querySelector('[data-agent-active="true"] [data-testid="copilot-scroll-content"]').getBoundingClientRect().width,
      composer: document.querySelector('#agent-message').closest('[class*="composer"]').getBoundingClientRect().width }))
    assert.equal(widths.messages, 900)
    assert.equal(widths.composer, 900)
    assert.equal(await page.getByRole('log').evaluate((element) => element.getBoundingClientRect().width), 900)
  }
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }))
  assert(dimensions.document <= dimensions.viewport + 2, JSON.stringify(dimensions))
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  await ready()
  assert.equal(await chat.locator('[data-product-id]').count(), 0)
  assert.equal(await chat.locator('[data-message-id]').count(), 0)
  await selectHistory(oldContext)
  assert.equal(await chat.locator('[data-product-id]').count(), 6)
  assert.equal(await chat.locator('[data-message-actions]').count(), 2)
  assert.equal(await chat.locator('[data-chat-action]').count(), 0)
  assert.equal(await chat.locator('[data-context-boundary]').count(), 0)
  assert.equal(await chat.locator('[data-product-id] input:checked').count(), 0)
  assert.equal(await chat.locator('input[type="email"]').count(), 0)
  await send('只要手持')
  assert.equal(sentContexts.at(-1), oldContext)
  assert.equal(await chat.locator('[data-role="user"]').count(), 3)
  assert.equal(await page.locator(`[data-history-context="${oldContext}"]`).getAttribute('aria-label'), '甲烷巡检手持设备')
  await startNew()
  await ready()
  assert.equal(await chat.locator('[data-message-id]').count(), 0)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('cooyue:search-keywords', { detail: { keywords: '所有气体红外成像' } })))
  assert.equal(await page.locator('#agent-message').inputValue(), '所有气体红外成像')
  await send('K10')
  const k10Context = contextId
  assert.equal(await chat.locator('[data-role="user"]').count(), 1)
  assert.equal(await chat.locator('[data-product-id]').count(), 3)
  assert.equal(sentContexts.at(-1), contextId)
  assert.notEqual(sentContexts[0], sentContexts.at(-1))
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  await ready()
  assert.equal(await chat.locator('[data-role="user"]').count(), 1)
  assert.equal(await chat.locator('[data-product-id]').count(), 3)
  await selectHistory(oldContext)
  assert.equal(await chat.locator('[data-role="user"]').count(), 3)
  assert.equal(await chat.locator('[data-product-id]').count(), 9)
  await selectHistory(k10Context)
  assert.equal(await chat.locator('[data-role="user"]').count(), 1)
  await send('全部20款')
  const largeReply = chat.locator('[data-message-id][data-role="assistant"]').last()
  const selectTwenty = largeReply.getByRole('checkbox', { name: '全选本轮产品', exact: true })
  await selectTwenty.check()
  assert.equal(await largeReply.locator('[data-product-id] input:checked').count(), 20)
  await largeReply.locator('[data-product-id] input').last().uncheck()
  assert.equal(await selectTwenty.evaluate((element) => element.indeterminate), true)
  await selectTwenty.check()
  await largeReply.getByRole('button', { name: '对比所选产品', exact: true }).click()
  await largeReply.locator('table thead th').nth(20).waitFor()
  await ready()
  assert.equal(calls.filter((call) => call.path === 'compare').at(-1).body.productSlugs.length, 20)
  assert.equal(await largeReply.locator('table thead th').count(), 21)
  await selectTwenty.uncheck()
  assert.equal(await largeReply.locator('[data-product-id] input:checked').count(), 0)
  assert.equal(calls.filter((call) => call.path.endsWith('/confirm')).length, 1)
  await largeReply.locator('[data-message-actions]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(process.env.COOYUE_SCREENSHOT_DIR || '/tmp', `cooyue-chat-history-${mobile ? 'mobile' : 'desktop'}.png`) })
  const readsBeforeSwitching = historyReads
  await page.locator('#agent-message').fill('保留本对话输入草稿')
  await selectTwenty.check()
  await selectHistory(oldContext)
  await selectHistory(k10Context)
  assert.equal(await page.locator('#agent-message').inputValue(), '保留本对话输入草稿')
  assert.equal(await selectTwenty.isChecked(), true)
  assert.equal(await largeReply.locator('table thead th').count(), 21)
  let releaseFirst, releaseSecond, releaseActivation
  messageGates.set('并行任务 A', new Promise((resolve) => { releaseFirst = resolve }))
  messageGates.set('并行任务 B', new Promise((resolve) => { releaseSecond = resolve }))
  await page.locator('#agent-message').fill('并行任务 A')
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await page.locator(`[data-history-context="${k10Context}"]`).getByText('正在处理…').waitFor({ state: 'attached' })
  await startNew()
  const parallelContext = await chat.getAttribute('data-agent-context')
  await page.locator('#agent-message').fill('并行任务 B')
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await page.locator(`[data-history-context="${parallelContext}"]`).getByText('正在处理…').waitFor({ state: 'attached' })
  assert.equal(pendingMessages.size, 2)
  activationGate = new Promise((resolve) => { releaseActivation = resolve })
  const switchStarted = Date.now()
  await selectHistory(k10Context, false)
  assert.equal(await page.locator('#agent-message').isDisabled(), true)
  assert.equal(await chat.locator('[data-role="user"]').last().innerText(), '您\n\n并行任务 A')
  await selectHistory(parallelContext, false)
  await selectHistory(k10Context, false)
  const switchDuration = Date.now() - switchStarted
  assert(switchDuration < 1500, `Switching blocked while activation is held: ${switchDuration}ms`)
  releaseSecond()
  await page.locator(`[data-agent-context="${parallelContext}"] [data-product-id]`).first().waitFor({ state: 'attached' })
  assert.equal(await chat.getAttribute('data-agent-context'), k10Context)
  assert(!await chat.innerText().then((text) => text.includes('并行任务 B')))
  releaseFirst()
  releaseActivation(); activationGate = null
  await ready()
  await selectHistory(parallelContext)
  assert.equal(await chat.locator('[data-role="user"]').count(), 1)
  assert.equal(await chat.locator('[data-product-id]').count(), 3)
  assert.equal(historyReads, readsBeforeSwitching)
  assert.equal(pendingMessages.size, 0)
  let releaseComparison
  comparisonGate = new Promise((resolve) => { releaseComparison = resolve })
  await chat.getByRole('checkbox', { name: '全选本轮产品', exact: true }).check()
  await chat.getByRole('button', { name: '对比所选产品', exact: true }).click()
  await selectHistory(k10Context)
  await page.locator('#agent-message').focus()
  releaseComparison(); comparisonGate = null
  await page.locator(`[data-agent-context="${parallelContext}"] table thead th`).nth(3).waitFor({ state: 'attached' })
  await page.waitForTimeout(150)
  assert.equal(await page.locator('#agent-message').evaluate((element) => document.activeElement === element), true)
  assert.equal(await chat.getAttribute('data-agent-context'), k10Context)
  await selectHistory(parallelContext)
  assert.equal(await chat.locator('table thead th').count(), 4)
  failSearch = true
  await send('故障测试')
  assert.doesNotMatch(await page.getByRole('region', { name: '选型助手', exact: true }).getByRole('alert').innerText(), /AGENT_UPSTREAM_ERROR|普通搜索|下方/)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ mobile, passed: true, updatedComparison: true, updatedInquiry: true, consentReconfirmed: true,
    replySelectionsIndependent: true, historyCardsRestored: true, historyIsolatedAndSwitchable: true, summaryTitlesPersist: true,
    selectAllTwenty: true, menuOpensChat: true, newContextPreservesHistory: true, actionScrollPositioned: true,
    parallelConversations: true, backgroundComparisonPreservesFocus: true, nonBlockingSwitchMs: switchDuration, cachedSwitchesWithoutHistoryRequests: true, placeholderLighter: true, phoneAligned: true,
    sendScrollsToBottom: true, streamedReplyStaysAtBottom: true, detailsOpenInNewTab: true, alignedWidth: true,
    viewportFitted: true, newContextBesideHistory: true, overflow: false, mockedDeliveries: 1, realEmailsSent: 0 }))
  await context.close()
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  try { await verify(browser, false); await verify(browser, true) } finally { await browser.close() }
})().catch((error) => { console.error(error.stack); process.exitCode = 1 })
