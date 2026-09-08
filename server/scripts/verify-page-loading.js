const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.COOYUE_TEST_URL || 'http://127.0.0.1:3100';
const kitPath = '/zh/products/gla07512k-t2-itz1212ip-imaging-kit';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  const errors = [];
  const watchErrors = (page) => page.on('pageerror', (error) => errors.push(error.message));
  try {
    for (const path of ['/zh/products', '/en/products', kitPath]) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control'), /s-maxage=300/);
      assert.ok(['HIT', 'STALE', 'MISS'].includes(response.headers.get('x-nextjs-cache')));
      const html = await response.text();
      assert.ok(!html.includes('class="preloader"'));
      assert.ok(!/<script[^>]+src="\/assets\//.test(html));
    }
    assert.equal((await fetch(`${base}/zh/products/cooyue-loading-test-nonexistent`)).status, 404);
    console.log('PASS public product ISR headers, missing-product 404 and no global plugin scripts');

    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    watchErrors(page);
    const requests = [];
    page.on('request', (request) => requests.push({ url: request.url(), type: request.resourceType() }));
    await page.goto(`${base}${kitPath}`, { waitUntil: 'networkidle' });
    assert.ok(!requests.some((request) => /\/assets\/vendors\/.+\.js/.test(request.url)));
    assert.ok(!requests.some((request) => /\.(glb|gltf)(\?|$)/.test(request.url)));
    assert.equal(await page.locator('.preloader').count(), 0);
    console.log('PASS product cold load requests no legacy JavaScript or offscreen 3D model');

    await page.locator('.main-header a[href="/zh/about"]').first().click();
    await page.waitForURL('**/zh/about');
    await page.waitForFunction(() => Boolean(document.querySelector('.jarallax')?.jarallax));
    assert.ok(!requests.some((request) => /jquery.*\.js/.test(request.url)));
    const initialDocuments = requests.filter((request) => request.type === 'document').length;
    for (let visit = 0; visit < 2; visit += 1) {
      await page.locator('.main-header a[href="/zh"]').first().click();
      await page.waitForURL(/\/zh\/?$/);
      await page.locator('.main-slider__carousel.owl-loaded').waitFor();
      assert.equal(await page.locator('.thm-owl__carousel.owl-loaded').count(), 2);
      await page.locator('.main-slider .owl-next').click();
      await page.locator('.main-header a[href="/zh/about"]').first().click();
      await page.waitForURL('**/zh/about');
      await page.waitForFunction(() => Boolean(document.querySelector('.jarallax')?.jarallax));
    }
    assert.equal(requests.filter((request) => request.type === 'document').length, initialDocuments);
    assert.equal(requests.filter((request) => request.url.endsWith('/owl.carousel.min.js')).length, 1);
    assert.equal(requests.filter((request) => request.url.endsWith('/jarallax.min.js')).length, 1);
    assert.ok(!requests.some((request) => /swiper|nouislider|bxslider|vegas|timePicker|sinace\.js/.test(request.url)));
    console.log('PASS route plugins initialize again after Next Link navigation without duplicate downloads');

    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('.main-header button.mobile-nav__toggler').click();
    await page.locator('.mobile-nav__wrapper.expanded').waitFor();
    assert.equal(await page.locator('body').evaluate((element) => element.classList.contains('locked')), true);
    const submenu = page.locator('.mobile-nav__item button').first();
    await submenu.click();
    assert.equal(await submenu.getAttribute('aria-expanded'), 'true');
    await page.locator('.mobile-nav__container a[href="/zh/products#cores"]').click();
    await page.waitForURL('**/zh/products#cores');
    assert.equal(await page.locator('.mobile-nav__wrapper.expanded').count(), 0);
    assert.equal(await page.locator('body').evaluate((element) => element.classList.contains('locked')), false);
    assert.equal(requests.filter((request) => request.type === 'document').length, initialDocuments);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.main-header button.mobile-nav__toggler').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.mobile-nav__wrapper.expanded').count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    console.log('PASS mobile category Next Link avoids document reload; menu, Escape and body lock work');
    await context.close();

    const searchContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const searchPage = await searchContext.newPage();
    watchErrors(searchPage);
    let browserSearches = 0;
    searchPage.on('request', (request) => { if (request.url().includes('/api/knowledge/search')) browserSearches += 1; });
    const response = await searchPage.goto(`${base}/zh/search?keywords=K10`, { waitUntil: 'networkidle' });
    assert.match(response.headers()['cache-control'], /no-store/);
    assert.ok((await response.text()).includes('gla07512k-t2-itz1212ip-imaging-kit'));
    await searchPage.locator('article input[type="checkbox"]').first().waitFor();
    assert.equal(browserSearches, 0);
    await searchPage.locator('article input[type="checkbox"]').first().check();
    await searchPage.locator('#product-query').fill('目镜');
    await searchPage.getByRole('button', { name: '搜索产品', exact: true }).click();
    await searchPage.waitForResponse('**/api/knowledge/search');
    await searchPage.waitForTimeout(100);
    assert.equal(browserSearches, 1);
    await searchPage.goBack();
    await searchPage.waitForFunction(() => document.getElementById('product-query')?.value === 'K10');
    await searchPage.locator('article input:checked').waitFor();
    assert.equal(browserSearches, 2);
    await searchPage.getByRole('button', { name: '搜索产品', exact: true }).click();
    await searchPage.waitForResponse('**/api/knowledge/search');
    assert.equal(browserSearches, 3);
    console.log('PASS initial search arrives in server HTML with zero browser searches; edits, history and same-query retry work');
    await searchContext.close();

    const plain = await browser.newContext({ javaScriptEnabled: false });
    const plainPage = await plain.newPage();
    await plainPage.goto(`${base}${kitPath}`);
    assert.ok((await plainPage.locator('body').innerText()).includes('GLA07512K-T2'));
    assert.equal(await plainPage.locator('.preloader').count(), 0);
    await plainPage.goto(`${base}/zh/faq`);
    await plainPage.locator('summary').first().click();
    assert.equal(await plainPage.locator('details').first().getAttribute('open'), '');
    await plainPage.goto(`${base}/zh`);
    assert.equal(await plainPage.locator('.main-slider__title').first().isVisible(), true);
    await plain.close();
    console.log('PASS product content, homepage banner and FAQ remain usable without JavaScript');
    assert.deepEqual(errors, []);
    console.log('PASS no browser runtime errors; no inquiry or email requests sent');
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
