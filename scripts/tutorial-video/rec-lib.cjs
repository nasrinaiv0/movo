// Records the real MOVO build (against the local mock cloud) with invented sample records for the video guide.
const { chromium } = require('playwright');
const BASE = 'http://localhost:3312';
const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600 * 6;
const email = 'ana@example.com';
const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: OWNER, aud: 'authenticated', role: 'authenticated', email, exp, iat: exp - 3600 })}.sig`;
const user = { id: OWNER, aud: 'authenticated', role: 'authenticated', email, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const session = { access_token: token, token_type: 'bearer', expires_in: 21600, expires_at: exp, refresh_token: 'mock-refresh', user };
const id = (p, n) => `${p}-${String(n).padStart(12, '0')}`;
const A = { bpi: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', mb: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', gc: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000003', maya: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000004', bdo: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000005', cash: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000006' };
const accounts = [
  { id: A.bpi, name: 'BPI Savings', account_type: 'bank', institution_name: 'BPI', currency: 'PHP', opening_balance: 48500, is_archived: false, display_order: 0 },
  { id: A.gc, name: 'GCash', account_type: 'e_wallet', institution_name: 'GCash', currency: 'PHP', opening_balance: 6200, is_archived: false, display_order: 1 },
  { id: A.mb, name: 'Metrobank Savings', account_type: 'bank', institution_name: 'Metrobank', currency: 'PHP', opening_balance: 22000, is_archived: false, display_order: 2 },
  { id: A.maya, name: 'Maya', account_type: 'e_wallet', institution_name: 'Maya', currency: 'PHP', opening_balance: 3150, is_archived: false, display_order: 3 },
  { id: A.bdo, name: 'BDO Savings', account_type: 'bank', institution_name: 'BDO', currency: 'PHP', opening_balance: 15800, is_archived: false, display_order: 4 },
  { id: A.cash, name: 'Cash', account_type: 'cash', institution_name: '', currency: 'PHP', opening_balance: 2500, is_archived: false, display_order: 5 },
];
let n = 0;
const t = (merchant, category, amount, type, acct, iso) => ({ id: id('bbbbbbbb-bbbb-4bbb-8bbb', ++n), account_id: acct, transfer_to_account_id: null, transaction_type: type, amount, currency: 'PHP', merchant, category, note: null, occurred_at: iso, source: 'manual', external_reference: null, payment_reference: null, receipt_note: null, receipt_path: null, schedule_id: null });
const transactions = [
  t('Salary', 'Income', 45000, 'income', A.bpi, '2026-10-30T01:00:00Z'),
  t('Freelance design', 'Income', 12000, 'income', A.mb, '2026-10-20T03:00:00Z'),
  t('Meralco', 'Bills', 2450, 'expense', A.bpi, '2026-10-16T02:00:00Z'),
  t('SM Supermarket', 'Groceries', 3120, 'expense', A.bpi, '2026-10-12T08:30:00Z'),
  t('Jollibee', 'Food & drinks', 389, 'expense', A.gc, '2026-10-08T04:10:00Z'),
  t('Shopee', 'Shopping', 1299, 'expense', A.gc, '2026-10-05T13:00:00Z'),
  t('Grab', 'Transport', 1260, 'expense', A.gc, '2026-10-14T00:30:00Z'),
  t('Puregold', 'Groceries', 2800, 'expense', A.bpi, '2026-10-22T09:00:00Z'),
  t('Globe', 'Bills', 999, 'expense', A.maya, '2026-10-06T03:00:00Z'),
  t('Netflix', 'Subscriptions', 549, 'expense', A.bpi, '2026-10-02T10:00:00Z'),
  t('Starbucks', 'Food & drinks', 420, 'expense', A.gc, '2026-10-18T02:15:00Z'),
  t('Salary', 'Income', 45000, 'income', A.bpi, '2026-11-01T01:00:00Z'),
  t('Netflix', 'Subscriptions', 549, 'expense', A.bpi, '2026-11-02T10:00:00Z'),
  t('SM Supermarket', 'Groceries', 2860, 'expense', A.bpi, '2026-11-03T09:20:00Z'),
  t('Grab', 'Transport', 320, 'expense', A.gc, '2026-11-04T00:40:00Z'),
  t('Starbucks', 'Food & drinks', 210, 'expense', A.gc, '2026-11-05T02:15:00Z'),
  t('Globe', 'Bills', 999, 'expense', A.maya, '2026-11-06T03:00:00Z'),
  t('Mercury Drug', 'Health', 640, 'expense', A.bpi, '2026-11-07T07:30:00Z'),
  t('Jollibee', 'Food & drinks', 468, 'expense', A.gc, '2026-11-08T04:45:00Z'),
  t('Shopee', 'Shopping', 1599, 'expense', A.maya, '2026-11-09T12:00:00Z'),
  t('Meralco', 'Bills', 2380, 'expense', A.bpi, '2026-11-10T02:00:00Z'),
  t('Grab', 'Transport', 275, 'expense', A.gc, '2026-11-11T00:20:00Z'),
];
const prefsBase = {
  onboarded: true, planWelcomeSeen: true, tutorialSeen: true, legalAccepted: '2026-11-11', legalAcceptedAt: '2026-11-11T08:00:00.000Z',
  theme: 'dark', briefing: false, nasrinPrivacyAccepted: true,
  subscriptions: [
    { id: 'sub-netflix', name: 'Netflix', amount: 549, currency: 'PHP', cycle: 'monthly', start: '2026-11-15', category: 'Entertainment', accountId: A.bpi },
    { id: 'sub-spotify', name: 'Spotify', amount: 279, currency: 'PHP', cycle: 'monthly', start: '2026-11-18', category: 'Entertainment', accountId: A.gc },
    { id: 'sub-icloud', name: 'iCloud+', amount: 149, currency: 'PHP', cycle: 'monthly', start: '2026-11-21', category: 'Utilities', accountId: A.bpi },
  ],
  budgets: [
    { id: 'bud-food', category: 'Food & drinks', amount: 6000, currency: 'PHP' },
    { id: 'bud-transport', category: 'Transport', amount: 3000, currency: 'PHP' },
  ],
  plans: [{ id: 'plan-emergency', name: 'Emergency fund', target: 60000, saved: 21500, currency: 'PHP' }],
};
async function reset() { await fetch(BASE + '/__mock/reset', { method: 'POST', body: JSON.stringify({ financial_accounts: accounts, transactions }) }); }
async function openApp(browser, { prefs = {}, motion = 'no-preference', entitlement } = {}) {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, reducedMotion: motion, colorScheme: 'dark', locale: 'en-PH', timezoneId: 'Asia/Manila', hasTouch: true, isMobile: true });
  await context.addInitScript(({ session, prefs, now }) => {
    if (!localStorage.getItem('sb-localhost-auth-token')) localStorage.setItem('sb-localhost-auth-token', JSON.stringify(session));
    localStorage.setItem('movo.ai.ack.v1.123e4567-e89b-42d3-a456-426614174000', '1');
    if (!localStorage.getItem('movo.preferences.v3')) localStorage.setItem('movo.preferences.v3', JSON.stringify({ logsSeenAt: now, briefingDay: new Date().toLocaleDateString('en-CA'), ...prefs }));
  }, { session, prefs: { ...prefsBase, ...prefs }, now: new Date().toISOString() });
  if (entitlement) await context.route('**/api/purchases/entitlements', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entitlement) }));
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(BASE + '/');
  await page.waitForSelector('.bottom-nav', { timeout: 20000 });
  await page.waitForTimeout(1800);
  return { context, page, errors };
}
module.exports = { chromium, BASE, A, reset, openApp, prefsBase };
