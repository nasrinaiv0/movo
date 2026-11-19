// Render the real components with synthetic records; block every external request.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const output = process.env.QA_OUTPUT || '/tmp/movo-solid-panels';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname;
    const file = path.join('/tmp/movo-ui-qa', name === '/' ? 'index.html' : path.basename(name));
    fs.readFile(file, (error, data) => {
      res.writeHead(error ? 404 : 200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
      res.end(error ? 'Not found' : data);
    });
  });
  await new Promise(resolve => server.listen(4175, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const errors = [], results = [];
  try {
    for (const width of [320, 390, 430, 768, 1280]) for (const mode of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4175/') ? route.continue() : route.abort());
      await page.route('**/api/purchases/entitlements', route => route.fulfill({ json: { active: true, tier: 'pro_plus', expiresAt: '2027-11-09T00:00:00Z' } }));
      for (const screen of ['menu', 'usage', 'planning']) {
        await page.goto(`http://127.0.0.1:4175/?screen=${screen}&mode=${mode}`, { waitUntil: 'networkidle' });
        await page.locator('.movo-app').waitFor({timeout: 5000}).catch(error => { throw new Error(JSON.stringify({errors, cause:error.message})); });
        await page.evaluate(width => {
          document.querySelector('.movo-app').classList.add(width >= 1024 ? 'layout-desktop' : width >= 768 ? 'layout-tablet' : 'layout-phone');
        }, width);
        if (screen === 'menu') {
          assert.equal(await page.locator('.menu-tile strong', { hasText: /^Plans$|^Limits$/ }).count(), 0);
          assert.equal(await page.locator('.menu-tile strong', { hasText: 'Financial planning' }).count(), 1);
        }
        if (screen === 'planning') {
          await page.locator('.fp-plans-limits').click();
          await page.getByRole('dialog', { name: 'Budgets and plans' }).waitFor();
          await page.getByRole('button', { name: 'Limits', exact: true }).click();
          await page.getByRole('button', { name: 'Account & merchant limits', exact: true }).waitFor();
          await page.getByRole('button', { name: 'Plans', exact: true }).click();
          await page.getByRole('button', { name: 'Add plan', exact: true }).waitFor();
        }
        const measure = await page.evaluate(() => {
          const dialog = document.querySelector('[role=dialog]');
          const style = dialog && getComputedStyle(dialog), rect = dialog?.getBoundingClientRect();
          const close = dialog?.querySelector('.sheet-close')?.getBoundingClientRect();
          return { overflow: document.documentElement.scrollWidth > innerWidth, dialog: dialog && {
            bg: style.backgroundColor, image: style.backgroundImage, blur: style.backdropFilter,
            x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom, scroll: dialog.scrollWidth, width: dialog.clientWidth,
            close: close && { width: close.width, height: close.height }
          }};
        });
        assert.equal(measure.overflow, false, JSON.stringify({ width, mode, screen, measure }));
        if (measure.dialog) {
          const d = measure.dialog;
          assert.equal(d.bg, mode === 'dark' ? 'rgb(28, 28, 30)' : 'rgb(255, 255, 255)');
          assert.equal(d.image, 'none'); assert.equal(d.blur, 'none');
          assert.ok(d.x >= 0 && d.right <= width + 1 && d.y >= 0 && d.bottom <= 845, JSON.stringify(d));
          assert.ok(d.scroll <= d.width + 1, JSON.stringify({width,mode,screen,d,wide:await page.locator('[role=dialog] *').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().right>innerWidth-16).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,text:e.textContent?.slice(0,65)})).slice(0,15))}));
          assert.deepEqual(d.close, { width: 44, height: 44 });
        }
        results.push({ width, mode, screen, ...measure });
        if (width === 390) await page.screenshot({ path: `${output}/${screen}-${mode}.png`, fullPage: true });
      }
      await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2));
    console.log(`${results.length} rendered navigation, solid-surface and responsive checks passed.`);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exit(1); });
