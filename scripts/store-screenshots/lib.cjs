// Shared helpers for the store screenshot capture. Needs the mock cloud from scripts/tutorial-video/mockcloud.cjs.
const { chromium } = require('playwright');
const S = require('./seed.cjs');
const BASE = 'http://localhost:3312';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600 * 6;
const email = 'ana@example.com';
const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: S.OWNER, aud: 'authenticated', role: 'authenticated', email, exp, iat: exp - 3600 })}.sig`;
const user = { id: S.OWNER, aud: 'authenticated', role: 'authenticated', email, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const session = { access_token: token, token_type: 'bearer', expires_in: 21600, expires_at: exp, refresh_token: 'mock-refresh', user };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function reset() { await fetch(BASE + '/__mock/reset', { method: 'POST', body: JSON.stringify({ financial_accounts: S.accounts, transactions: S.transactions, budgets: S.budgetRows }) }); }
async function openApp(browser, { prefs = {}, dsf = 3, dark = false, entitlement = null } = {}) {
  const context = await browser.newContext({ viewport: { width: process.env.PLATFORM === 'android' ? 412 : 430, height: process.env.PLATFORM === 'android' ? 915 : 932 }, deviceScaleFactor: dsf, reducedMotion: 'reduce', colorScheme: dark ? 'dark' : 'light', locale: 'en-PH', timezoneId: 'Asia/Manila', hasTouch: true, isMobile: true });
  await context.addInitScript(({ session, prefs, now }) => {
    localStorage.setItem('sb-localhost-auth-token', JSON.stringify(session));
    localStorage.setItem('movo.ai.ack.v1.123e4567-e89b-42d3-a456-426614174000', '1');
    if (!localStorage.getItem('movo.preferences.v3')) localStorage.setItem('movo.preferences.v3', JSON.stringify({ logsSeenAt: now, notifSeenAt: now, subsSeen: now, briefingDay: new Date().toLocaleDateString('en-CA'), ...prefs }));
  }, { session, prefs: { ...S.prefsBase, ...prefs }, now: new Date().toISOString() });
  if (entitlement) await context.route('**/api/purchases/entitlements', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entitlement) }));
  // No outbound favicon / market calls: everything stays local and brand-free.
  await context.route(/google\.com|gstatic|er-api|coinpaprica|paprika/, r => r.abort());
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(BASE + '/');
  await page.waitForSelector('.bottom-nav', { timeout: 20000 });
  await sleep(2200);
  return { context, page, errors };
}
const nav = (page, label) => page.click(`.bottom-nav [aria-label="${label}"]`);
// Captures go to a scratch folder (they are inputs to compose.cjs, not deliverables).
const WORK = process.env.STORE_SHOTS_WORK || require('path').join(require('os').tmpdir(), 'movo-store-shots');
const outDir = () => { const d = require('path').join(WORK, process.env.PLATFORM === 'android' ? 'cap-android' : 'cap') + '/'; require('fs').mkdirSync(d, { recursive: true }); return d; };
module.exports = { chromium, reset, openApp, nav, sleep, S, WORK, outDir };
