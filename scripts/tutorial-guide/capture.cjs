// Takes the guided tour's screenshots from the real MOVO build (sample records only) in the light and dark themes,
// and records where each step's highlight sits. Usage: node capture.cjs <outDir> [imageName...]
// Writes <outDir>/<image>-<theme>.png and <outDir>/rects.json. See README.md for the full pipeline.
const fs = require('fs'); const path = require('path');
const { chromium, reset, openApp } = require('./rec-lib.cjs');
const { STEPS } = require('./steps.cjs');
const OUT = path.resolve(process.argv[2] || 'tour-out'); fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv.slice(3);
const W = 430, H = 932;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PRO = { tier: 'pro', active: true, plan: 'pro', source: 'trial', trialEligible: false, expiresAt: '2099-01-01T00:00:00Z', entitlements: [] };
const TRIAL = { tier: 'free', active: false, trialEligible: true };
const PLUS = { ...PRO, tier: 'pro_plus', plan: 'pro_plus' };
// What the AI scan returns for the invented sample receipt (the real AI is never called while capturing).
const RECEIPT = { merchant: 'Mang Inasal', amount: 278, currency: 'PHP', date: new Date().toISOString().slice(0, 10), time: '12:41', type: 'expense',
  category: 'food:restaurants', branch: 'SM North EDSA', paymentMethod: 'GCash', items: [
    { name: 'Paa Large Meal', quantity: 1, total: 189, category: 'food:restaurants' }, { name: 'Halo-Halo', quantity: 1, total: 89, category: 'food:restaurants' }], warnings: [] };
const SAMPLE_RECEIPT = path.join(__dirname, 'sample-receipt.png');
const nav = (page, label) => page.click(`.bottom-nav [aria-label="${label}"]`);
const scrollTo = (page, y) => page.evaluate(v => document.scrollingElement.scrollTo(0, v), Math.max(0, Math.round(y)));

// Runs in the page: the rectangle (viewport pixels) covering every element a step focuses on.
function focusRect({ focus = [], group = [] }) {
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
  const byText = (sel, text) => [...document.querySelectorAll(sel)].filter(el => visible(el) && (el.textContent || '').includes(text));
  const smallest = list => list.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height)[0];
  const named = {
    '@rows': () => [...document.querySelectorAll('main section')].filter(s => s.querySelector('.list-card') && visible(s)).slice(0, 3),
    '@menu': () => ['Subscriptions', 'Plans', 'Cashback', 'Scheduled', 'Financial planning', 'Exchange rates', 'Crypto market', 'Stocks market', 'Archive', 'Limits']
      .map(label => smallest(byText('main button', label))).filter(Boolean),
    '@notice': () => [smallest(byText('main p, main small', 'trademarks'))].filter(Boolean),
    '@chat': () => { const said = smallest(byText('main div, main li, main article', 'Mang Inasal 250')); const logged = smallest(byText('main div, main li, main article', 'Added to your transactions')); return [said, logged].filter(Boolean); },
  };
  const els = [];
  for (const sel of focus) els.push(...(named[sel] ? named[sel]() : [...document.querySelectorAll(sel)].filter(visible).slice(0, 1)));
  for (const title of group) { const h = [...document.querySelectorAll('main h2')].find(x => x.textContent.trim() === title); if (h) els.push(h.closest('section') || h.parentElement); }
  if (!els.length) return null;
  const box = els.map(el => el.getBoundingClientRect()).reduce((a, r) => ({ l: Math.min(a.l, r.left), t: Math.min(a.t, r.top), r: Math.max(a.r, r.right), b: Math.max(a.b, r.bottom) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
  return [box.l, box.t, box.r - box.l, box.b - box.t];
}
// Scroll so the top of what a step focuses on sits `top` pixels down the screen.
async function place(page, spec, top) {
  await scrollTo(page, 0); await sleep(250);
  const rect = await page.evaluate(focusRect, spec);
  if (!rect) throw new Error('nothing to focus for ' + JSON.stringify(spec));
  await scrollTo(page, rect[1] - top); await sleep(500);
}
const stepOf = id => STEPS.find(s => s.id === id);
const settings = async (page) => { await nav(page, 'Menu'); await sleep(700); await page.click('main [aria-label="Settings"]'); await sleep(900); };

// One entry per screenshot: how to get the app onto that screen.
const SCENES = {
  // Shown on its own to someone who has not seen the plans yet; a sync notice may sit on top of it first.
  pro: async (page) => { const later = page.getByRole('button', { name: 'Not now', exact: true }); if (await later.count()) { await later.first().click(); await sleep(900); } },
  'home-top': async (page) => { await nav(page, 'Home'); await sleep(900); await scrollTo(page, 0); },
  // The Home header stays pinned over the top third of the screen, so each card is placed just below it.
  'home-planning': async (page) => { await nav(page, 'Home'); await sleep(900); await place(page, stepOf('planning'), 322); },
  'home-flow': async (page) => { await nav(page, 'Home'); await sleep(900); await place(page, stepOf('flow'), 322); },
  'home-budgets': async (page) => { await nav(page, 'Home'); await sleep(900); await place(page, stepOf('budgets'), 360); },
  'wallet-cards': async (page) => { await nav(page, 'Wallet'); await sleep(900); await place(page, stepOf('wallet'), 150); },
  'wallet-accounts': async (page) => { await nav(page, 'Wallet'); await sleep(900); await place(page, stepOf('accounts'), 110); },
  add: async (page) => {
    await nav(page, 'Wallet'); await sleep(800); await scrollTo(page, 0);
    await page.getByText('Add Transaction', { exact: true }).first().click(); await sleep(900);
    const dialog = page.locator('[role="dialog"]').first();
    for (const key of ['2', '7', '8']) await dialog.getByRole('button', { name: key, exact: true }).click();
    await dialog.getByPlaceholder('What was it for?').fill('Mang Inasal');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
  },
  chat: async (page) => {
    await page.keyboard.press('Escape'); await sleep(400);
    await nav(page, 'NasrinAI'); await sleep(1300);
    await page.click('[placeholder*="Ask NasrinAI"]'); await page.keyboard.type('Mang Inasal 250'); await page.click('[aria-label="Send message"]');
    await sleep(5200); // the "added" toast has gone
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
  },
  // The scanner after the sample receipt was read: the consent step is accepted, the AI answer is the fixed RECEIPT.
  scan: async (page) => {
    await page.route('**/api/receipts/scan', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ receipt: RECEIPT }) }));
    await settings(page); await page.getByText('Receipt Scanner', { exact: true }).first().click(); await sleep(900);
    await page.setInputFiles('input[aria-label="Upload a photo or screenshot"]', SAMPLE_RECEIPT); await sleep(600);
    await page.getByRole('button', { name: 'Analyze with AI', exact: true }).click(); await sleep(1500);
    const gcash = await page.$$eval('#scan-account option', list => (list.find(o => /GCash/.test(o.textContent)) || {}).value);
    if (gcash) await page.selectOption('#scan-account', gcash);
    await page.evaluate(() => { document.activeElement && document.activeElement.blur(); const d = document.querySelector('[role="dialog"] .sheet-body, [role="dialog"]'); if (d) d.scrollTop = 0; });
  },
  // The device registers with MOVO's logging endpoint; here that answer is a fixed success (nothing leaves the machine).
  autolog: async (page) => {
    await page.route('**/api/log', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
    await settings(page); await page.getByText('Set Up Phone Automation', { exact: true }).first().click(); await sleep(1400); },
  transactions: async (page) => { await page.keyboard.press('Escape'); await sleep(500); await nav(page, 'Transactions'); await sleep(1000); await place(page, stepOf('transactions'), 150); },
  subscriptions: async (page) => { await nav(page, 'Menu'); await sleep(700); await page.getByText('Subscriptions', { exact: true }).first().click(); await sleep(1000); await scrollTo(page, 0); },
  menu: async (page) => { await nav(page, 'Menu'); await sleep(900); await scrollTo(page, 0); },
  'settings-appearance': async (page) => { await settings(page); await place(page, stepOf('appearance'), 96); },
  'settings-security': async (page) => { await settings(page); await place(page, stepOf('security'), 150); },
  'settings-sync': async (page) => { await settings(page); await place(page, stepOf('sync'), 96); },
};

(async () => {
  const browser = await chromium.launch(); const rects = {}; const problems = [];
  for (const theme of ['light', 'dark']) {
    const run = async (names, options) => {
      await reset();
      const { page, context, errors } = await openApp(browser, { ...options, scheme: theme, prefs: { ...(options.prefs || {}), theme } });
      await page.addStyleTag({ content: '.toast,.app-alert{display:none!important} ::-webkit-scrollbar{display:none}' });
      for (const name of names) {
        if (ONLY.length && !ONLY.includes(name)) continue;
        if (SCENES[name]) await SCENES[name](page);
        await sleep(900);
        await page.screenshot({ path: path.join(OUT, `${name}-${theme}.png`) });
        for (const step of STEPS.filter(s => s.image === name)) {
          const raw = step.focus || step.group ? await page.evaluate(focusRect, { focus: step.focus || [], group: step.group || [] }) : [0, 0, W, H];
          if (!raw) { problems.push(`${theme} ${step.id}: nothing to focus`); continue; }
          // A little air around the highlight, kept on the screen.
          const pad = step.focus || step.group ? 6 : 0;
          const x = Math.max(0, raw[0] - pad), y = Math.max(0, raw[1] - pad);
          const rect = [x, y, Math.min(W, raw[0] + raw[2] + pad) - x, Math.min(H, raw[1] + raw[3] + pad) - y].map(v => Math.round(v));
          if (rect[2] < 40 || rect[3] < 24) problems.push(`${theme} ${step.id}: highlight too small ${rect}`);
          if (theme === 'light') rects[step.id] = rect;
          else if (rects[step.id] && rects[step.id].some((v, i) => Math.abs(v - rect[i]) > 3)) problems.push(`${step.id}: light ${rects[step.id]} and dark ${rect} differ`);
          console.log(theme, step.id.padEnd(14), name.padEnd(20), rect.join(','));
        }
      }
      const real = errors.filter(e => !/ERR_TUNNEL|404|er-api|Failed to load resource/.test(e));
      if (real.length) problems.push(`${theme} console: ${real.slice(0, 3).join(' | ')}`);
      await context.close();
    };
    await run(Object.keys(SCENES).filter(name => !['pro', 'autolog'].includes(name)), { entitlement: PRO });
    // Automatic logging is part of Pro+.
    await run(['autolog'], { entitlement: PLUS });
    // The free-month offer appears on its own for someone who has not seen it yet.
    await run(['pro'], { entitlement: TRIAL, prefs: { planWelcomeSeen: false } });
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'rects.json'), JSON.stringify({ size: [W, H], rects }, null, 2));
  if (problems.length) { console.error('PROBLEMS:\n' + problems.join('\n')); process.exit(1); }
})().catch(e => { console.error('FAILED', e.message.split('\n')[0]); process.exit(1); });
