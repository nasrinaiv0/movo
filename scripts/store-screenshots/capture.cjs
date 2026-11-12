// Captures the real MOVO build (local mock cloud, invented records) at 3x with phone safe areas for the store screenshots.
// Usage: PLATFORM=ios|android node scripts/store-screenshots/capture.cjs
// Captures the real MOVO build (mock cloud, invented records) at 3x with iPhone safe areas for store screenshots.
const { chromium, reset, openApp, nav, sleep, outDir } = require('./lib.cjs');
const OUT = outDir();
async function open(browser, opts) {
  const r = await openApp(browser, { dsf: 3, ...opts });
  const cdp = await r.context.newCDPSession(r.page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: (process.env.PLATFORM === 'android' ? 40 : 59), bottom: (process.env.PLATFORM === 'android' ? 20 : 34), left: 0, right: 0 } });
  await r.page.addStyleTag({ content: '*{caret-color:transparent!important} ::-webkit-scrollbar{display:none}' });
  await r.page.evaluate(() => document.scrollingElement.scrollTo(0, 0)); await sleep(900);
  return r;
}
const shot = async (page, name) => { await sleep(1100); await page.screenshot({ path: OUT + name + '.png' }); console.log('screen', name); };
const crop = async (page, loc, name) => {
  const l = typeof loc === 'string' ? page.locator(loc).first() : loc.first();
  await l.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(900);
  await l.screenshot({ path: OUT + name + '.png' }); console.log('crop', name);
};
(async () => {
  const browser = await chromium.launch(); const errs = [];
  const run = async (opts, fn) => { await reset(); const r = await open(browser, opts); try { await fn(r.page); } finally { errs.push(...r.errors); await r.context.close(); } };

  await run({}, async page => {
    await shot(page, 'home');
    await crop(page, 'section.card.balance-card', 'x-balance');
    await crop(page, 'section.card.flow-card', 'x-flow');
    await crop(page, 'section.card.budget-card', 'x-budgets');
    await crop(page, page.locator('section:has(h2:text-is("Upcoming Renewals"))'), 'x-renewals');
    await crop(page, page.locator('section:has(h2:has-text("Spending This Month"))'), 'x-spending');
    await page.evaluate(() => document.scrollingElement.scrollTo(0, 0)); await sleep(400);
    await page.getByText('Manage', { exact: true }).first().click(); await shot(page, 'budgets-sheet');
  });
  await run({}, async page => {
    await nav(page, 'Wallet'); await sleep(600); await shot(page, 'wallet');
    await page.getByRole('button', { name: 'Cards', exact: true }).first().click(); await shot(page, 'wallet-cards');
    await crop(page, '.wallet-balance-spending-card', 'x-10days');
  });
  await run({}, async page => {
    await nav(page, 'NasrinAI'); await sleep(1200);
    const box = page.locator('[placeholder*="Ask NasrinAI"]');
    await box.click(); await page.keyboard.type('Coffee 180'); await page.click('[aria-label="Send message"]'); await sleep(1600);
    await box.click(); await page.keyboard.type('Lunch with team 320'); await page.keyboard.press('Shift+Enter'); await page.keyboard.type('Freelance 5k');
    await page.click('[aria-label="Send message"]'); await sleep(1800); await page.locator('body').click({ position: { x: 215, y: 400 } }).catch(() => {});
    await shot(page, 'chat');
    await crop(page, page.locator('.chat-log-card').last(), 'x-chatlog');
  });
  await run({}, async page => { await nav(page, 'Transactions'); await shot(page, 'transactions'); });
  await run({}, async page => {
    await nav(page, 'Menu'); await sleep(700); await page.getByText('Subscriptions', { exact: true }).first().click(); await shot(page, 'subs');
    await crop(page, 'section.card.sub-hero', 'x-subhero');
  });
  await run({}, async page => { await nav(page, 'Menu'); await shot(page, 'menu'); await page.click('main [aria-label="Settings"]'); await shot(page, 'settings'); });
  await run({ dark: true, prefs: { theme: 'dark' } }, async page => {
    await shot(page, 'home-dark');
    await nav(page, 'Wallet'); await sleep(600); await page.getByRole('button', { name: 'Cards', exact: true }).first().click(); await shot(page, 'wallet-cards-dark');
  });
  console.log('errors', errs.slice(0, 5));
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
