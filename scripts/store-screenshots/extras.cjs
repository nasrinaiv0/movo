// Extra captures for the store screenshots: the logged chat card, goal rows, subscription calendar and card faces.
// Usage: PLATFORM=ios|android node scripts/store-screenshots/extras.cjs
const { chromium, reset, openApp, nav, sleep, outDir } = require('./lib.cjs');
const OUT = outDir();
async function open(browser, opts) {
  const r = await openApp(browser, { dsf: 3, ...opts });
  const cdp = await r.context.newCDPSession(r.page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: (process.env.PLATFORM === 'android' ? 40 : 59), bottom: (process.env.PLATFORM === 'android' ? 20 : 34), left: 0, right: 0 } });
  await r.page.addStyleTag({ content: '*{caret-color:transparent!important} ::-webkit-scrollbar{display:none}' }); await sleep(800); return r;
}
const shot = async (page, name) => { await sleep(1100); await page.screenshot({ path: OUT + name + '.png' }); console.log('screen', name); };
const crop = async (page, l, name) => { l = l.first(); await l.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(900); await l.screenshot({ path: OUT + name + '.png' }); console.log('crop', name); };
(async () => {
  const browser = await chromium.launch(); const errs = [];
  const run = async (opts, fn) => { await reset(); const r = await open(browser, opts); try { await fn(r.page); } catch (e) { console.log('ERR', e.message.split('\n')[0]); } finally { errs.push(...r.errors); await r.context.close(); } };
  // First chat log card (Coffee).
  await run({}, async page => {
    await nav(page, 'NasrinAI'); await sleep(1200);
    await page.click('[placeholder*="Ask NasrinAI"]'); await page.keyboard.type('Coffee 180'); await page.click('[aria-label="Send message"]'); await sleep(1700);
    await crop(page, page.locator('.chat-log-card'), 'x-chat-coffee');
  });
  // Plans tab of the budgets sheet, and subscription calendar / insights.
  await run({}, async page => {
    await page.getByText('Manage', { exact: true }).first().click(); await sleep(1200);
    await page.getByRole('button', { name: 'Plans', exact: true }).first().click().catch(() => page.getByText('Plans', { exact: true }).last().click()); await shot(page, 'plans-sheet');
    for (const [name, text] of [['x-goal-1', 'Emergency fund'], ['x-goal-2', 'Kyoto trip']]) {
      const h = await page.getByText(text, { exact: true }).last().evaluateHandle(e => { let p = e; while (p && !(parseFloat(getComputedStyle(p).borderTopLeftRadius) >= 10 && p.getBoundingClientRect().width > 250)) p = p.parentElement; p.style.background = '#fff'; p.style.backdropFilter = 'none'; p.style.webkitBackdropFilter = 'none'; return p; });
      await sleep(300);
      await h.asElement().screenshot({ path: OUT + name + '.png' }); console.log('crop', name);
    }
  });
  await run({}, async page => {
    await nav(page, 'Menu'); await sleep(700); await page.getByText('Subscriptions', { exact: true }).first().click(); await sleep(1200);
    await page.getByText('Calendar', { exact: true }).first().click(); await shot(page, 'subs-calendar');
    await page.getByText('Insights', { exact: true }).first().click(); await shot(page, 'subs-insights');
  });
  await run({}, async page => {
    await nav(page, 'Wallet'); await sleep(900);
    for (const tab of ['Cards']) {
      await page.getByRole('button', { name: tab, exact: true }).first().click(); await sleep(1300);
      const faces = page.locator('.card-cylinder-face'); const n = await faces.count();
      for (let i = 0; i < n; i++) {
        if (i > 0) { await faces.nth(i).click({ force: true }); await sleep(1300); }
        const active = page.locator('.card-cylinder-face.active .credit-card').first();
        const label = await active.getAttribute('aria-label');
        await active.screenshot({ path: OUT + 'x-face-' + label.split(' · ')[0].toLowerCase().replace(/[^a-z]+/g, '-') + '.png' }); console.log('face', label);
      }
    }
  });
  console.log('errors', errs.slice(0, 5)); await browser.close();
})();
