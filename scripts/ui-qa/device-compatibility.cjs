'use strict';
// Browser acceptance using synthetic data. Requires Playwright and a running production web bundle.
// Injected segments exercise geometry deterministically; they do not certify a physical folding device.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.MOVO_COMPAT_BASE_URL || 'http://127.0.0.1:4195';
const output = process.env.MOVO_COMPAT_OUTPUT || '/tmp/movo-device-acceptance';
const account = '10000000-0000-4000-8000-000000000093';
const language = process.env.MOVO_COMPAT_LANGUAGE || 'en';
const fontSize = process.env.MOVO_COMPAT_FONT_SIZE || 'default';
assert.ok(['en', 'ar'].includes(language), 'This acceptance harness supports English and Arabic fixtures');
const translations = language === 'ar' ? require('../../src/i18n/locales/ar.json') : {};
const label = text => translations[text] || text;
const expectedBalance = new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(87.91);

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.MOVO_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const results = [], errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
    await context.addInitScript(({ id, language, fontSize }) => {
      if (localStorage.getItem('movo.finance.vault.initialized.v1')) return;
      localStorage.setItem('movo.preferences.scope.v1.guest', JSON.stringify({ version: 1, ownerId: null, stickers: [], prefs: { theme: 'light', language, fontSize, onboarded: true, tutorialSeen: true, planWelcomeSeen: true, logsSeenAt: Date.now(), legalAccepted: '2026-11-20', legalAcceptedRevision: '2026-11-20-r1' } }));
      localStorage.setItem('movo.local.accounts.v1', JSON.stringify([{ id, name: 'Synthetic adaptive cash', account_type: 'cash', opening_balance: 100.25, currency: 'PHP' }]));
    }, { id: account, language, fontSize });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    const record = async (step, capture = false) => {
      await page.waitForTimeout(180);
      const geometry = await page.evaluate(() => {
        const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        return { window: { width: innerWidth, height: innerHeight }, bodyWidth: document.documentElement.scrollWidth, view: document.querySelector('main')?.dataset.view,
          pane: document.querySelector('.layout-pane') ? rect(document.querySelector('.layout-pane')) : null,
          dialogs: [...document.querySelectorAll('[role=dialog]')].map(element => ({ ...rect(element), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })) };
      });
      const area = geometry.pane || { x: 0, y: 0, ...geometry.window };
      if (geometry.dialogs.some(d => d.scrollWidth > d.clientWidth + 1)) {
        const offenders = await page.getByRole('dialog').evaluateAll(dialogs => dialogs.flatMap(dialog => {
          const box = dialog.getBoundingClientRect();
          return [...dialog.querySelectorAll('*')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1); })
            .slice(0, 20).map(el => ({ tag: el.tagName, class: el.getAttribute('class'), text: el.textContent.slice(0, 80), width: el.getBoundingClientRect().width }));
        }));
        fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ step, geometry, offenders }, null, 2));
        await page.screenshot({ path: path.join(output, 'failure.png') });
      }
      assert.ok(geometry.bodyWidth <= geometry.window.width + 1, `${step}: document overflow`);
      for (const dialog of geometry.dialogs) {
        assert.ok(dialog.x >= area.x - 1 && dialog.y >= area.y - 1 && dialog.x + dialog.width <= area.x + area.width + 1 && dialog.y + dialog.height <= area.y + area.height + 1, `${step}: dialog outside safe pane: ${JSON.stringify({ dialog, area })}`);
        assert.ok(dialog.scrollWidth <= dialog.clientWidth + 1, `${step}: dialog content overflow`);
      }
      results.push({ step, ...geometry });
      if (capture) await page.screenshot({ path: path.join(output, step + '.png'), animations: 'disabled' });
      fs.writeFileSync(path.join(output, 'partial.json'), JSON.stringify(results, null, 2));
    };
    const setSegments = async segments => {
      await page.evaluate(value => { window.getWindowSegments = () => value; window.dispatchEvent(new Event('resize')); }, segments);
    };
    const dismissLogs = async () => { const done = page.locator('.rl-done'); if (await done.isVisible()) await done.click(); };
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.getByTitle(label('Wallet'), { exact: true }).first().click();
    await page.locator('main[data-view="Wallet"]').waitFor();
    await page.locator('main').getByRole('button', { name: label('Add Transaction'), exact: true }).click();
    const dialog = page.getByRole('dialog', { name: label('Add transaction'), exact: true });
    await dialog.getByLabel(label('Description'), { exact: true }).fill('Synthetic adaptive expense');
    await dialog.getByLabel(label('Account'), { exact: true }).selectOption(account);
    const pad = dialog.getByRole('group', { name: label('Amount keypad'), exact: true });
    for (const digit of ['1', '2', '.', '3', '4']) await pad.getByRole('button', { name: digit, exact: true }).click();
    for (const viewport of [{ width: 280, height: 653 }, { width: 344, height: 882 }, { width: 466, height: 678 }, { width: 674, height: 898 }, { width: 768, height: 1024 }, { width: 890, height: 626 }, { width: 1024, height: 768 }, { width: 674, height: 370 }]) {
      await page.setViewportSize(viewport);
      await record('draft-' + viewport.width + 'x' + viewport.height);
      assert.equal(await dialog.getByLabel(label('Description'), { exact: true }).inputValue(), 'Synthetic adaptive expense');
      assert.equal(await dialog.getByLabel(label('Account'), { exact: true }).inputValue(), account);
    }
    await page.setViewportSize({ width: 1060, height: 900 });
    await setSegments([{ left: 0, top: 0, width: 520, height: 900 }, { left: 540, top: 0, width: 520, height: 900 }]);
    await page.locator('.layout-pane').waitFor();
    await record('vertical-hinge-draft', true);
    assert.equal((await page.locator('.layout-pane').boundingBox()).x, language === 'ar' ? 540 : 0);
    await setSegments([{ left: 0, top: 0, width: 500, height: 900 }, { left: 520, top: 0, width: 540, height: 900 }]);
    await record('larger-right-pane-draft', true);
    assert.equal((await page.locator('.layout-pane').boundingBox()).x, 520);
    await page.setViewportSize({ width: 900, height: 720 });
    await setSegments([{ left: 0, top: 0, width: 900, height: 350 }, { left: 0, top: 370, width: 900, height: 350 }]);
    await record('tabletop-draft', true);
    const save = dialog.getByRole('button', { name: label('Save Expense'), exact: true });
    await save.scrollIntoViewIfNeeded();
    const saveBox = await save.boundingBox();
    assert.ok(saveBox.y >= 0 && saveBox.y + saveBox.height <= 350, 'Save is hidden by the tabletop fold');
    assert.equal(await dialog.getByLabel(label('Description'), { exact: true }).inputValue(), 'Synthetic adaptive expense');
    await save.click();
    await dialog.waitFor({ state: 'detached' });
    await dismissLogs();
    await page.getByTitle(label('Wallet'), { exact: true }).first().click();
    await page.waitForFunction(value => document.querySelector('main')?.textContent.includes(value), expectedBalance);
    await record('tabletop-saved-wallet', true);
    await setSegments([]);
    await page.locator('.layout-pane').waitFor({ state: 'detached' });
    for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      for (const name of ['Home', 'Wallet', 'Transactions', 'Menu']) {
        await page.getByTitle(label(name), { exact: true }).first().click();
        await page.locator(`main[data-view="${name}"]`).waitFor();
        await record(name.toLowerCase() + '-' + viewport.width);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'networkidle' });
    await dismissLogs();
    await page.getByTitle(label('Wallet'), { exact: true }).first().click();
    await page.waitForFunction(value => document.querySelector('main')?.textContent.includes(value), expectedBalance);
    assert.deepEqual(errors, []);
    const result = { browser: await browser.version(), language, fontSize, syntheticDataOnly: true, externalRequestsBlocked: true, nativeDeviceAcceptance: false, segmentSource: 'injected browser segments API; real app hook and CSS', expectedExpense: 12.34, actualBalanceAfterResizeAndReload: 87.91, pageErrors: errors, results };
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ checks: results.length, savedBalance: 87.91, output, nativeDeviceAcceptance: false }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
