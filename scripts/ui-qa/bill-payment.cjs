// Synthetic repository fixtures only; never posts payments to an account.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [], results = [];
  try {
    for (const width of [320, 390, 430]) for (const mode of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${process.env.QA_URL || 'http://127.0.0.1:4175'}/?screen=bills&mode=${mode}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Log payment', exact: true }).click();
      const sheet = page.locator('.bill-payment-sheet');
      await sheet.locator('.bill-split-toggle input').check();
      await page.waitForTimeout(700);
      const measure = () => sheet.evaluate(el => {
        const rect = selector => { const r = el.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
        return { width: el.clientWidth, scroll: el.scrollWidth, height: el.getBoundingClientRect().height,
          checkbox: rect('.bill-split-toggle input'), toggleText: rect('.bill-split-toggle span'),
          account: rect('.acct-pick'), balance: rect('.acct-pick-availability strong'),
          footer: [...el.querySelectorAll('.sheet-actions button')].map(b => ({ width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height })) };
      });
      const m = await measure();
      assert.ok(m.scroll <= m.width + 1, JSON.stringify(m));
      assert.ok(m.height < 550, `Sheet should be compact: ${m.height}`);
      assert.ok(Math.abs(m.checkbox.y + m.checkbox.height / 2 - m.toggleText.y - m.toggleText.height / 2) < 2, 'checkbox alignment');
      assert.ok(m.balance.width > 30 && m.balance.right <= m.account.right, 'balance is visible');
      assert.ok(m.footer.every(b => b.height >= 44 && b.width > 100), 'usable footer buttons');
      results.push({ width, mode, ...m });
      if (width === 390) await sheet.screenshot({ path: `/tmp/bill-payment-${mode}.png` });
      await sheet.getByRole('button', { name: 'Add another account' }).click();
      await sheet.locator('.bill-split-account select').nth(1).selectOption('bank');
      await sheet.locator('.bill-split-amount input').nth(0).fill('3000');
      await sheet.locator('.bill-split-amount input').nth(1).fill('2858');
      assert.equal(await sheet.getByRole('button', { name: 'Record payment', exact: true }).isDisabled(), false);
      const multi = await measure(); assert.ok(multi.scroll <= multi.width + 1);
      await sheet.locator('.bill-split-remove').nth(1).click();
      assert.equal(await sheet.locator('.bill-payment-split').count(), 1);
      await sheet.getByRole('button', { name: 'Record payment', exact: true }).click();
      await sheet.waitFor({ state: 'detached' });
      await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync('/tmp/bill-payment-results.json', JSON.stringify({ results, errors }, null, 2));
    console.log('6 compact payment sheet checks passed, including split add/remove and recording against synthetic fixtures.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
