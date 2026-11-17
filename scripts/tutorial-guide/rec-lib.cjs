// Opens the real MOVO build (against the local mock cloud) with invented sample records for the guided tour.
// "Ana" and every figure here are made up; no customer or financial data is used.
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
const A = {
  sea: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', bpi: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', gc: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000003',
  atome: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000004', mb: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000005', cash: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000006',
};
// Accounts and merchants are chosen from MOVO's curated logo lists whose logos are sharp (owner, 2026-11-16).
const accounts = [
  { id: A.sea, name: 'SeaBank Savings', account_type: 'bank', institution_name: 'SeaBank', currency: 'PHP', opening_balance: 52300, is_archived: false, display_order: 0 },
  { id: A.bpi, name: 'BPI Savings', account_type: 'bank', institution_name: 'BPI', currency: 'PHP', opening_balance: 48500, is_archived: false, display_order: 1 },
  { id: A.gc, name: 'GCash', account_type: 'e_wallet', institution_name: 'GCash', currency: 'PHP', opening_balance: 9200, is_archived: false, display_order: 2 },
  { id: A.atome, name: 'Atome Card', account_type: 'card', institution_name: 'Atome', currency: 'PHP', opening_balance: 0, is_archived: false, display_order: 3 },
  { id: A.mb, name: 'Metrobank Savings', account_type: 'bank', institution_name: 'Metrobank', currency: 'PHP', opening_balance: 22000, is_archived: false, display_order: 4 },
  { id: A.cash, name: 'Cash', account_type: 'cash', institution_name: '', currency: 'PHP', opening_balance: 2500, is_archived: false, display_order: 5 },
];
let n = 0;
const t = (merchant, category, amount, type, acct, iso) => ({ id: id('bbbbbbbb-bbbb-4bbb-8bbb', ++n), account_id: acct, transfer_to_account_id: null, transaction_type: type, amount, currency: 'PHP', merchant, category, note: null, occurred_at: iso, source: 'manual', external_reference: null, payment_reference: null, receipt_note: null, receipt_path: null, schedule_id: null });
// Dates are relative to today so "this month" always has activity when the tour is re-captured.
const day = (back, hour = 4) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - back); d.setUTCHours(hour, 15, 0, 0); return d.toISOString(); };
const transactions = [
  t('Salary', 'Income', 45000, 'income', A.sea, day(40, 1)),
  t('Meralco', 'Bills', 2450, 'expense', A.bpi, day(33, 2)),
  t('Puregold', 'Groceries', 3120, 'expense', A.bpi, day(31, 8)),
  t('Jollibee', 'Food & drinks', 389, 'expense', A.gc, day(30, 4)),
  t('Uniqlo', 'Shopping', 1990, 'expense', A.atome, day(28, 9)),
  t('Shell', 'Transport', 1800, 'expense', A.bpi, day(26, 1)),
  t('Starbucks', 'Food & drinks', 420, 'expense', A.gc, day(24, 2)),
  t('Freelance design', 'Income', 12000, 'income', A.mb, day(22, 3)),
  t('Salary', 'Income', 45000, 'income', A.sea, day(12, 1)),
  t('Puregold', 'Groceries', 2860, 'expense', A.bpi, day(11, 9)),
  t('Meralco', 'Bills', 2380, 'expense', A.bpi, day(10, 2)),
  t('Globe', 'Bills', 999, 'expense', A.gc, day(9, 3)),
  t('Lazada', 'Shopping', 1599, 'expense', A.atome, day(8, 12)),
  t('7-Eleven', 'Food & drinks', 185, 'expense', A.cash, day(7, 11)),
  t('Shell', 'Transport', 1650, 'expense', A.bpi, day(6, 1)),
  t('Starbucks', 'Food & drinks', 210, 'expense', A.gc, day(5, 2)),
  t('Jollibee', 'Food & drinks', 468, 'expense', A.gc, day(4, 4)),
  t('Mercury Drug', 'Health', 640, 'expense', A.sea, day(3, 7)),
  t('Foodpanda', 'Food & drinks', 356, 'expense', A.gc, day(2, 11)),
  t("McDonald's", 'Food & drinks', 312, 'expense', A.gc, day(1, 12)),
  t('Mang Inasal', 'Food & drinks', 278, 'expense', A.gc, day(0, 4)),
];
const soon = (ahead) => { const d = new Date(); d.setDate(d.getDate() + ahead); return d.toLocaleDateString('en-CA'); };
const prefsBase = {
  onboarded: true, planWelcomeSeen: true, tutorialSeen: true, legalAccepted: '2099-12-31', legalAcceptedAt: '2026-11-15T08:00:00.000Z',
  theme: 'light', briefing: false, nasrinPrivacyAccepted: true,
  accountStyles: { [A.atome]: { cardKind: 'credit', creditLimit: 30000, cardNetwork: 'mastercard' } },
  membershipCards: [
    { id: 'loy-inasal', type: 'loyalty', name: 'Mang Inasal', program: 'Mang Inasal', memberNumber: '2026 1184 5520', barcode: '202611845520', points: '420', pointsUnit: 'points', noExpiry: true },
    { id: 'loy-mercury', type: 'loyalty', name: 'Mercury Drug Suki', program: 'Suki Card', memberNumber: '8810 2291 0047', barcode: '881022910047', points: '1260', pointsUnit: 'points', noExpiry: true },
    { id: 'loy-mcdo', type: 'rewards', name: 'McDonald’s', program: 'McDonald’s', memberNumber: '7734 0092 1185', barcode: '773400921185', points: '85', pointsUnit: 'points', noExpiry: true },
  ],
  subscriptions: [
    { id: 'sub-netflix', name: 'Netflix', amount: 549, currency: 'PHP', cycle: 'monthly', start: soon(3), category: 'Entertainment', accountId: A.sea },
    { id: 'sub-spotify', name: 'Spotify', amount: 279, currency: 'PHP', cycle: 'monthly', start: soon(6), category: 'Entertainment', accountId: A.gc },
    { id: 'sub-youtube', name: 'YouTube Premium', amount: 159, currency: 'PHP', cycle: 'monthly', start: soon(12), category: 'Entertainment', accountId: A.atome },
  ],
  budgets: [
    { id: 'bud-food', category: 'Food & drinks', amount: 6000, currency: 'PHP' },
    { id: 'bud-transport', category: 'Transport', amount: 4000, currency: 'PHP' },
    { id: 'bud-groceries', category: 'Groceries', amount: 8000, currency: 'PHP' },
  ],
  plans: [{ id: 'plan-emergency', name: 'Emergency fund', target: 60000, saved: 21500, currency: 'PHP' }, { id: 'plan-japan', name: 'Japan trip', target: 90000, saved: 31000, currency: 'PHP' }],
};
async function reset() { await fetch(BASE + '/__mock/reset', { method: 'POST', body: JSON.stringify({ financial_accounts: accounts, transactions }) }); }
async function openApp(browser, { prefs = {}, motion = 'reduce', entitlement, scheme = 'light' } = {}) {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, reducedMotion: motion, colorScheme: scheme, locale: 'en-PH', timezoneId: 'Asia/Manila', hasTouch: true, isMobile: true });
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
