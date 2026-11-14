// Existing feature regression scenarios run with a verified Pro+ fixture.
// Free/expiry behavior is covered independently by PlanRestrictions.test.js.
// The fixture is one stable object, like the real hook's state, so effects that depend on it do not re-run on
// every render.
jest.mock('./lib/usePlanEntitlement', () => {
  const entitlement = { tier:'pro_plus', active:true, expiresAt:'2099-01-01T00:00:00Z' };
  const refreshEntitlement = jest.fn();
  return { usePlanEntitlement: () => ({ entitlement, refreshEntitlement }) };
});
// These UI tests run without Supabase, i.e. in local mode, where #245 pauses paid features. Feature scenarios use
// plain plan rules; set global.__movoPauseLocalPlans to test the local-mode pause itself (planAccess.test.js
// covers the rule).
jest.mock('./lib/planAccess', () => {
  const actual = jest.requireActual('./lib/planAccess');
  return { ...actual,
    canUseFeatureInMode: (e, f, cloud, now) => (global.__movoPauseLocalPlans ? actual.canUseFeatureInMode(e, f, cloud, now) : actual.canUseFeature(e, f, now)),
    effectiveAccessPlan: (e, cloud, now) => (global.__movoPauseLocalPlans ? actual.effectiveAccessPlan(e, cloud, now) : actual.effectivePlan(e, now)) };
});
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

// Keep UI tests deterministic even when deployment environments contain real
// Supabase configuration. Authenticated flows are tested separately.
jest.mock('./lib/supabaseClient', () => ({ supabase: null, supabaseConfigured: false }));
jest.mock('./lib/financeRepository', () => ({
  getCurrentSession: jest.fn().mockResolvedValue(null),
  listAccounts: jest.fn().mockResolvedValue([]),
  listTransactions: jest.fn().mockResolvedValue([]),
  createAccount: jest.fn(),
  updateAccount: jest.fn(),
  createTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  signOut: jest.fn(),
  loadPreferences: jest.fn().mockResolvedValue(null),
  savePreferences: jest.fn().mockResolvedValue(null),
}));
import App from './App';
import { seedLocalRecords } from './testFixtures';

global.IS_REACT_ACT_ENVIRONMENT = true;

// Keep month-sensitive dashboard and notification tests deterministic.
// The fixture transactions are intentionally dated in October 2026.
const NativeDate = Date;
const FIXED_TEST_NOW = '2026-10-29T12:00:00+08:00';
window.scrollTo = jest.fn();
/* The shared confirmation dialog (components/ConfirmDialog.js); tests skip its animation. */
async function answerConfirm(container, accept) {
  const dialog = container.querySelector('.confirm-dialog');
  if (!dialog) throw new Error('No confirmation dialog');
  await act(async () => { dialog.querySelector(accept ? '.confirm-accept' : '.confirm-cancel').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}
function clickButton(container, name) {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.getAttribute('aria-label') === name || item.textContent.trim() === name);
  if (!button) throw new Error('Button not found: ' + name);
  act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  return button;
}
function setInputValue(input, value) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set
      || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

const nav = (container, name) => {
  const button = Array.from(container.querySelectorAll('.bottom-nav .nav-item')).find(item => item.getAttribute('aria-label') === name);
  act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};
// Profile now lives under the Menu tab.
const openProfile = (container) => {
  nav(container, 'Menu');
  act(() => container.querySelector('.menu-hero').dispatchEvent(new MouseEvent('click', { bubbles: true })));
};

describe('MOVO finance frontend', () => {
  let container; let root;
  beforeEach(() => {
    global.Date = class FixedDate extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [FIXED_TEST_NOW])); }
      static now() { return new NativeDate(FIXED_TEST_NOW).getTime(); }
    };
    window.localStorage.clear();
    seedLocalRecords();
    window.localStorage.setItem('movo.preferences.v3', JSON.stringify({ ...JSON.parse(window.localStorage.getItem('movo.preferences.v3') || '{}'), planWelcomeSeen:true }));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<App />));
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); window.localStorage.clear(); global.Date = NativeDate; });

  test('renders the home dashboard from the design: balance, summary, spending and recent activity', () => {
    expect(container.querySelector('h1').textContent).toContain('Friend');
    expect(container.textContent).toContain('₱203,062.00');
    expect(container.querySelector('[aria-label="Financial summary"]')).not.toBeNull();
    expect(container.textContent).toContain('₱85,000');
    expect(container.textContent).toContain('₱42,350');
    expect(container.textContent).toContain('Spending This Month');
    expect(container.textContent).toContain('Recent Transactions');
    ['Food', 'Shopping', 'Bills', 'Transportation', 'Others'].forEach(label => expect(container.textContent).toContain(label));
    expect(container.querySelectorAll('.bottom-nav .nav-item')).toHaveLength(5);
  });

  test('confirmed local backup refreshes Home, Wallet, Transactions and Menu with durable account-specific data', async () => {
    const initialSummary = container.querySelector('[aria-label="Financial summary"]')?.textContent;
    clickButton(container, 'Settings');
    const importRow = [...container.querySelectorAll('button')].find(button => button.textContent.includes('Import & Export'));
    expect(importRow).toBeDefined();
    act(() => importRow.click());

    const input = container.querySelector('#movo-backup-input');
    expect(input).not.toBeNull();
    const imported = {
      format:'movo-finance-backup', version:1, tables:{},
      accounts:[
        { id:'source-import-bank-1', name:'Imported BPI', account_type:'bank', currency:'PHP', opening_balance:1000 },
        { id:'source-import-bank-2', name:'Imported BPI', account_type:'bank', currency:'PHP', opening_balance:500 },
      ],
      transactions:[
        { id:'source-import-payment-1', account_id:'source-import-bank-1', merchant:'Imported coffee',
          amount:125.35, transaction_type:'expense', currency:'PHP', occurred_at:'2026-10-29T02:00:00Z' },
        { id:'source-import-payment-2', account_id:'source-import-bank-2', merchant:'Imported commute',
          amount:35.20, transaction_type:'expense', currency:'PHP', occurred_at:'2026-10-29T03:00:00Z' },
      ],
    };
    Object.defineProperty(input, 'files', {
      value:[{name:'movo-restore.json',size:2048,text:async () => JSON.stringify(imported)}],configurable:true,
    });
    await act(async () => input.dispatchEvent(new Event('change', {bubbles:true})));
    const confirm = async label => {
      const button = [...container.querySelectorAll('button')].find(item => item.textContent.trim() === label);
      expect(button).toBeDefined();
      await act(async () => button.click());
    };
    await confirm('Save records');
    expect(container.textContent).toContain('Save reviewed records to this device?');
    await confirm('Confirm save locally');
    expect(container.querySelector('#movo-backup-input')).toBeNull();
    expect(container.querySelector('h1')?.textContent).not.toBe('Settings');
    expect(container.querySelector('[aria-label="Financial summary"]')?.textContent).not.toEqual(initialSummary);

    const savedAccounts = JSON.parse(window.localStorage.getItem('movo.local.accounts.v1'));
    const savedTransactions = JSON.parse(window.localStorage.getItem('movo.local.transactions.v1'));
    const newAccounts = savedAccounts.filter(account => account.name === 'Imported BPI');
    expect(newAccounts).toHaveLength(2);
    expect(newAccounts[0].id).not.toBe(newAccounts[1].id);
    expect(savedTransactions.find(t => t.merchant === 'Imported coffee')?.account_id).toBe(newAccounts[0].id);
    expect(savedTransactions.find(t => t.merchant === 'Imported commute')?.account_id).toBe(newAccounts[1].id);

    nav(container, 'Wallet');
    expect(container.textContent).toContain('Imported BPI');
    nav(container, 'Transactions');
    expect(container.textContent).toContain('Imported coffee');
    expect(container.textContent).toContain('Imported commute');
    nav(container, 'Menu');
    expect(container.textContent).toContain('Financial planning');

    // Cold reload must use the same saved snapshot, not the pre-import dashboard state.
    act(() => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<App />));
    nav(container, 'Wallet');
    expect(container.textContent).toContain('Imported BPI');
    nav(container, 'Transactions');
    expect(container.textContent).toContain('Imported coffee');
  });

  test('a backup moves Menu data to another device: subscriptions, plans, limits, card looks and payments follow the restored accounts', async () => {
    clickButton(container, 'Settings');
    act(() => [...container.querySelectorAll('button')].find(button => button.textContent.includes('Import & Export')).click());
    const input = container.querySelector('#movo-backup-input');
    const backup = {
      format:'movo-finance-backup', version:1,
      accounts:[
        { id:'old-bank', name:'Transfer Bank', account_type:'bank', currency:'PHP', opening_balance:2000 },
        { id:'old-card', name:'Transfer Card', account_type:'card', currency:'PHP', opening_balance:-500 },
      ],
      transactions:[{ id:'old-t1', account_id:'old-bank', merchant:'Salary transfer test', amount:1000, transaction_type:'income', category:'income:salary', currency:'PHP', occurred_at:'2026-10-28T02:00:00Z' },
        { id:'allocation-9', transaction_type:'allocation', merchant:'Goal allocation', amount:50, currency:'PHP', occurred_at:'2026-10-28T02:00:00Z' }],
      tables:{ local_preferences:[{
        subscriptions:[{ id:'sub-transfer', name:'Netflix Transfer', amount:549, currency:'PHP', cycle:'monthly', start:'2026-11-05', accountId:'old-card' }],
        plans:[{ id:'plan-transfer', name:'Japan trip', target:50000, saved:0, fundingAllocations:[{ id:'fa-1', account_id:'old-bank', amount:1000 }] }],
        spendingLimits:[{ id:'limit-transfer', scope:'account', account_id:'old-bank', monthly_limit:5000, alert_percent:80, currency:'PHP' }],
        accountStyles:{ 'old-card':{ cardKind:'credit', creditLimit:30000, color:'black' } },
        creditCardPayments:{ 'old-card':[{ id:'pay-transfer', amount:200, date:'2026-10-10', month:'2026-10' }] },
        autoLogKey:'never-restore-this', devices:[{ id:'other-phone' }],
      }] },
    };
    Object.defineProperty(input, 'files', { value:[{ name:'movo-finance-backup.json', size:4096, text:async () => JSON.stringify(backup) }], configurable:true });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles:true })));
    const press = async label => { await act(async () => [...container.querySelectorAll('button')].find(item => item.textContent.trim() === label).click()); };
    await press('Save records');
    await press('Confirm save locally');
    const accounts = JSON.parse(window.localStorage.getItem('movo.local.accounts.v1'));
    const transactions = JSON.parse(window.localStorage.getItem('movo.local.transactions.v1'));
    const prefs = JSON.parse(window.localStorage.getItem('movo.preferences.v3'));
    const bank = accounts.find(a => a.name === 'Transfer Bank'); const card = accounts.find(a => a.name === 'Transfer Card');
    expect(bank && card).toBeTruthy();
    expect(bank.id).not.toBe('old-bank');
    // Every link points at this device's restored account.
    expect(prefs.subscriptions.find(item => item.id === 'sub-transfer').accountId).toBe(card.id);
    expect(prefs.plans.find(item => item.id === 'plan-transfer').fundingAllocations[0].account_id).toBe(bank.id);
    expect(prefs.spendingLimits.find(item => item.id === 'limit-transfer').account_id).toBe(bank.id);
    expect(prefs.accountStyles[card.id]).toEqual(expect.objectContaining({ cardKind:'credit', creditLimit:30000 }));
    expect(prefs.creditCardPayments[card.id]).toEqual([expect.objectContaining({ id:'pay-transfer', amount:200 })]);
    // Device secrets and cloud accounting activity are never restored; categories keep their own id.
    expect(prefs.autoLogKey).not.toBe('never-restore-this');
    expect(JSON.stringify(prefs.devices || [])).not.toContain('other-phone');
    expect(transactions.some(t => t.merchant === 'Goal allocation')).toBe(false);
    expect(transactions.find(t => t.merchant === 'Salary transfer test').category).toBe('income:salary');
    nav(container, 'Menu');
    act(() => Array.from(container.querySelectorAll('.menu-tile')).find(tile => tile.textContent.includes('Subscriptions')).click());
    expect(container.textContent).toContain('Netflix Transfer');
  });

  test('the Home balance box keeps its wallet arrow last, labels the eye row, and shortens the month pill only for larger text', () => {
    const card = container.querySelector('.balance-card.notched');
    const go = card.querySelector('.balance-go');
    expect(go.getAttribute('aria-label')).toBe('Open wallet');
    expect(card.lastElementChild).toBe(go);
    expect(card.querySelector('.balance-label > .balance-label-text').textContent).toBe('Total Balance');
    expect(card.querySelector('.balance-label > .plain-icon').getAttribute('aria-label')).toBe('Hide balances');
    const pill = () => container.querySelector('.notch-slot .home-period-filter');
    expect(pill().classList.contains('in-notch')).toBe(true);
    expect(pill().classList.contains('short')).toBe(false);
    act(() => root.unmount());
    const saved = JSON.parse(window.localStorage.getItem('movo.preferences.v3') || '{}');
    window.localStorage.setItem('movo.preferences.v3', JSON.stringify({ ...saved, fontSize: 'largest' }));
    root = createRoot(container);
    act(() => root.render(<App />));
    expect(pill().classList.contains('short')).toBe(true);
    // Both month forms stay in the pill; the stylesheet picks one, so the accessible name does not change.
    expect(pill().querySelector('.period-long')).not.toBeNull();
    expect(pill().querySelector('.period-short').textContent).toMatch(/2026/);
    act(() => container.querySelector('.balance-card.notched .balance-go').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('.bottom-nav .nav-item[aria-current="page"]').getAttribute('aria-label')).toBe('Wallet');
  });

  test('Back shows the previous page at once, where it was left; going forward still plays the entrance', async () => {
    const back = () => act(async () => { window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(resolve => setTimeout(resolve, 5)); });
    const main = () => container.querySelector('main.screen');
    nav(container, 'Wallet');
    expect(main().className).not.toContain('enter-back');
    Object.defineProperty(window, 'scrollY', { value: 420, configurable: true });
    nav(container, 'Transactions');
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    expect(main().className).toContain('enter-tab-right');
    window.scrollTo.mockClear();
    await back();
    expect(container.querySelector('.bottom-nav .nav-active').getAttribute('aria-label')).toBe('Wallet');
    expect(main().className).toContain('enter-back');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 420);
    delete window.scrollY;
  });

  test('the device Back button closes an open sheet, then returns through the screens visited, then to Home', async () => {
    const back = () => act(async () => { window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(resolve => setTimeout(resolve, 5)); });
    const current = () => container.querySelector('.bottom-nav .nav-item[aria-current="page"]')?.getAttribute('aria-label');
    openProfile(container);
    clickButton(container, 'Settings');
    const plan = Array.from(container.querySelectorAll('.menu-row')).find(row => row.querySelector('strong')?.textContent === 'Plan & Usage');
    act(() => plan.click());
    expect(container.querySelector('[role="dialog"][aria-label="Plan & Usage"]')).not.toBeNull();
    await back(); // closes the sheet, stays on Settings
    expect(container.querySelector('[role="dialog"][aria-label="Plan & Usage"]')).toBeNull();
    expect(Array.from(container.querySelectorAll('.menu-row')).some(row => row.querySelector('strong')?.textContent === 'Plan & Usage')).toBe(true);
    await back(); // Settings → Profile
    expect(container.querySelector('.menu-row strong')?.textContent).not.toBe(undefined);
    expect(Array.from(container.querySelectorAll('.menu-row')).some(row => row.querySelector('strong')?.textContent === 'Plan & Usage')).toBe(false);
    await back(); // Profile → Menu
    expect(current()).toBe('Menu');
    expect(container.querySelector('.menu-hero')).not.toBeNull();
    await back(); // Menu → Home
    expect(current()).toBe('Home');
    await back(); // nothing left: Home stays
    expect(current()).toBe('Home');
  });

  test('Settings → Profile opens the Profile screen (not the edit form), and its back arrow returns to Settings', () => {
    const title = () => container.querySelector('.screen-header h1')?.textContent;
    nav(container, 'Menu');
    clickButton(container, 'Settings');
    expect(title()).toBe('Settings');
    act(() => Array.from(container.querySelectorAll('.menu-row')).find(row => row.querySelector('strong')?.textContent === 'Profile').click());
    expect(title()).toBe('Profile');
    expect(container.querySelector('.profile-card')).not.toBeNull();
    expect(container.querySelector('#movo-profile-form')).toBeNull();
    clickButton(container, 'Back');
    expect(title()).toBe('Settings');
    // Opened from Menu, Profile's back arrow still returns to Menu.
    openProfile(container);
    expect(title()).toBe('Profile');
    clickButton(container, 'Back');
    expect(container.querySelector('.menu-hero')).not.toBeNull();
  });

  test('Home has a pinned scenery header by default; Pro+ can pick a zodiac header in Appearance', () => {
    // The pinned header block reaches down to Total balance, which is drawn inside it (and not again below).
    const header = () => container.querySelector('.home-hero-block');
    expect(header().className).toContain('hero-scenery');
    // Pro+ gets the platinum glowing edge (Pro gets gold; Free gets none).
    expect(header().className).toContain('hero-tier-plus');
    expect(header().querySelector('.hero-edge')).not.toBeNull();
    expect(header().querySelector('.home-header')).not.toBeNull();
    expect(header().querySelector('.balance-card')).not.toBeNull();
    expect(container.querySelectorAll('.balance-card').length).toBe(1);
    openProfile(container);
    clickButton(container, 'Settings');
    act(() => Array.from(container.querySelectorAll('.menu-row')).find(r => r.querySelector('strong')?.textContent === 'Theme').click());
    const tab = Array.from(container.querySelectorAll('.hero-tabs [role="tab"]')).find(b => b.textContent === 'Zodiac');
    act(() => tab.click());
    const leo = Array.from(container.querySelectorAll('.hero-tile')).find(b => b.textContent === 'Leo');
    act(() => leo.click());
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).homeHero).toBe('zodiac:leo');
    nav(container, 'Home');
    expect(header().className).toContain('hero-zodiac');
    expect(header().getAttribute('data-hero')).toBe('zodiac:leo');
  });

  test('Pro+ colours the bottom navigation platinum by default, and Appearance can switch it to the app accent', () => {
    const root_ = () => container.querySelector('.movo-app');
    expect(root_().className).toContain('nav-tier-platinum');
    openProfile(container);
    const options = () => Array.from(container.querySelectorAll('.nav-accent-options button'));
    expect(options().map(b => b.textContent)).toEqual(['Platinum', 'App accent']);
    expect(options()[0].getAttribute('aria-checked')).toBe('true');
    act(() => options()[1].click());
    expect(root_().className).not.toContain('nav-tier-');
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).navAccent).toBe('app');
    act(() => options()[0].click());
    expect(root_().className).toContain('nav-tier-platinum');
  });

  test('tapping a membership card opens the same Account details layout as other cards, with Edit card leading to the editor', () => {
    act(() => root.unmount());
    const saved = JSON.parse(window.localStorage.getItem('movo.preferences.v3') || '{}');
    window.localStorage.setItem('movo.preferences.v3', JSON.stringify({ ...saved, membershipCards: [{ id: 'tim-card', type: 'membership', name: 'Tim Hortons', program: 'Tim Hortons', memberNumber: '99887766', points: '120', pointsUnit: 'points', noExpiry: true }] }));
    root = createRoot(container);
    act(() => root.render(<App />));
    nav(container, 'Wallet');
    const tile = container.querySelector('.loyalty-wallet-item');
    expect(tile).not.toBeNull();
    act(() => tile.click());
    const dialog = container.querySelector('[role="dialog"][aria-label="Account details"]');
    expect(dialog).not.toBeNull();
    expect(dialog.querySelector('.account-hub-hero .loyalty-card-face')).not.toBeNull();
    expect(Array.from(dialog.querySelectorAll('[role="tab"]')).map(b => b.textContent)).toEqual(['Account overview', 'Transactions', 'Connected items', 'More']);
    expect(dialog.querySelector('.account-hub-metrics').textContent).toContain('120');
    act(() => Array.from(dialog.querySelectorAll('button')).find(b => b.textContent === 'Edit card').click());
    expect(container.textContent).toContain('Edit membership or rewards');
  });

  test('Home greeting is unboxed and its three utility buttons remain accessible', () => {
    const header = container.querySelector('.screen-header.home-header');
    const greeting = header.querySelector('.home-greeting');
    const pill = header.querySelector('.home-utility-pill[role="group"]');
    expect(greeting).not.toBeNull();
    expect(greeting.classList.contains('bubble')).toBe(false);
    expect(greeting.querySelector('h1').textContent).toContain('Friend');
    expect(pill).not.toBeNull();
    expect(Array.from(pill.querySelectorAll('button')).map(button => button.getAttribute('aria-label')))
      .toEqual(['Search', 'Notifications', 'Settings']);
    expect(header.querySelector('.ram-mascot, .mascot')).not.toBeNull();
    expect(header.querySelector('.ram-bubble.is-open')).toBeNull();
    clickButton(container, 'Search');
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  test('ships no demo mode or sample data: a first visit starts empty with no demo banner', () => {
    act(() => root.unmount());
    window.localStorage.clear();
    root = createRoot(container);
    act(() => root.render(<App />));
    expect(container.querySelector('[aria-label="Sample data notice"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Demo|sample data|fictional/i);
    expect(container.textContent).toContain('No transactions yet');
    expect(container.textContent).not.toContain('SM Supermarket');
    nav(container, 'Wallet');
    expect(container.textContent).not.toContain('Metrobank');
  });

  test('Cloud Sync in Profile opens the consent-aware sign-in screen', () => {
    openProfile(container);
    act(() => Array.from(container.querySelectorAll('button.menu-row')).find(b => b.textContent.includes('Cloud Sync')).click());
    expect(container.querySelector('form')).not.toBeNull();
    expect(container.textContent).toContain('Terms of Service');
    expect(container.textContent).toContain('Privacy Policy');
  });

  test('privacy toggle hides displayed balances', () => {
    expect(container.textContent).toContain('₱1,250.00');
    clickButton(container, 'Hide balances');
    expect(container.textContent).toContain('••••••');
    expect(container.textContent).not.toContain('₱1,250.00');
    expect(container.textContent).not.toContain('₱203,062.00');
  });

  test('wallet filters switch between cards, bank accounts and e-wallets', () => {
    nav(container, 'Wallet');
    expect(container.querySelector('h1').textContent).toBe('Wallet');
    expect(container.textContent).toContain('Quick Actions');
    clickButton(container, 'Banks');
    expect(container.textContent).toContain('RCBC');
    clickButton(container, 'E-Wallets');
    expect(container.textContent).toContain('GCash');
    clickButton(container, 'Cards');
    expect(container.textContent).toContain('Available Balance');
    expect(container.querySelector('.card-cylinder, .card-stack')).not.toBeNull();
    expect(container.querySelector('.card-cylinder-face, .card-stack-peek, .card-stack-dots button')).not.toBeNull();
  });

  test('Add amount on a card offers Transfer and Manual, and the plus button adds accounts by type', () => {
    nav(container, 'Wallet');
    clickButton(container, 'Cards');
    expect(container.textContent).not.toContain('Block Card');
    expect(container.querySelector('#card-control-limitations')).toBeNull();
    clickButton(container, 'Add amount');
    const sheet = container.querySelector('[role="dialog"][aria-label="Add amount"]');
    expect(sheet.textContent).toContain('Transfer');
    expect(sheet.textContent).toContain('Manual');
    act(() => Array.from(sheet.querySelectorAll('.sheet-card')).find(b => b.textContent.includes('Transfer')).click());
    expect(container.querySelector('[role="dialog"]').textContent).toMatch(/Transfer/);
    clickButton(container, 'Close Add transfer'.replace('Add transfer', container.querySelector('[role="dialog"]').getAttribute('aria-label')));
    clickButton(container, 'New account');
    expect(container.querySelector('[role="dialog"]').getAttribute('aria-label')).toMatch(/account|card/i);
  });

  test('wallet transfer actions open a transfer form rather than an expense form', () => {
    nav(container, 'Wallet');
    clickButton(container, 'Record Transfer');
    const dialog = container.querySelector('[role="dialog"][aria-label="Add transaction"]');
    expect(dialog).not.toBeNull();
    const transfer = Array.from(dialog.querySelectorAll('button')).find(item => item.textContent.trim() === 'Transfer');
    expect(transfer.getAttribute('aria-pressed')).toBe('true');
  });

  test('wallet Add Transaction opens an expense form distinct from Record Transfer', () => {
    nav(container, 'Wallet');
    clickButton(container, 'Add Transaction');
    const dialog = container.querySelector('[role="dialog"][aria-label="Add transaction"]');
    expect(dialog).not.toBeNull();
    const expense = Array.from(dialog.querySelectorAll('button')).find(item => item.textContent.trim() === 'Expense');
    const transfer = Array.from(dialog.querySelectorAll('button')).find(item => item.textContent.trim() === 'Transfer');
    expect(expense.getAttribute('aria-pressed')).toBe('true');
    expect(transfer.getAttribute('aria-pressed')).toBe('false');
  });

  test('transactions screen filters, groups by day and opens details', () => {
    nav(container, 'Transactions');
    expect(container.querySelector('h1').textContent).toBe('Transactions');
    expect(container.textContent).toContain('Total Spent');
    clickButton(container, 'Expenses');
    expect(container.textContent).toContain('Expenses Breakdown');
    expect(container.textContent).toContain('Today');
    clickButton(container, 'Transfers');
    expect(container.textContent).toContain('Total Transfers');
    clickButton(container, 'Transfer to BPI, ₱2,000.00');
    expect(container.querySelector('[role="dialog"]').textContent).toMatch(/transfer/i);
  });

  test('opens a transaction, then deletes it only after confirmation; Cancel changes nothing', async () => {
    const stored = () => JSON.parse(window.localStorage.getItem('movo.local.transactions.v1') || '[]').filter(t => t.id === 'demo-1');
    const walletBalance = () => { nav(container, 'Wallet'); return Number(container.querySelector('.balance-amount').textContent.replace(/[^0-9.-]/g, '')); };
    const balanceBefore = walletBalance();
    nav(container, 'Transactions');
    clickButton(container, 'See All');
    clickButton(container, 'SM Supermarket, −₱1,250.00');
    expect(container.querySelector('[role="dialog"]').textContent).toContain('SM Supermarket');
    const before = stored();
    expect(before).toHaveLength(1);
    clickButton(container, 'Delete SM Supermarket');
    const dialog = container.querySelector('.confirm-dialog');
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(dialog.querySelector('.confirm-title').textContent).toBe('Delete this record?');
    expect(dialog.querySelector('.confirm-name').textContent).toBe('SM Supermarket');
    expect(dialog.textContent).toContain('This action may affect your financial balances and reports.');
    expect(document.activeElement.textContent).toBe('Cancel');
    // Cancel: the record, the open sheet and the stored copy stay exactly as they were.
    await answerConfirm(container, false);
    expect(container.querySelector('.confirm-dialog')).toBeNull();
    expect(stored()).toEqual(before);
    expect(container.querySelector('[role="dialog"]').textContent).toContain('SM Supermarket');
    // Escape and a tap outside only dismiss as well.
    clickButton(container, 'Delete SM Supermarket');
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(container.querySelector('.confirm-dialog')).toBeNull();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    clickButton(container, 'Delete SM Supermarket');
    await act(async () => { container.querySelector('.confirm-backdrop').click(); });
    expect(container.querySelector('.confirm-dialog')).toBeNull();
    expect(stored()).toEqual(before);
    // Confirm: removed from the list and the device, and kept in the Archive.
    clickButton(container, 'Delete SM Supermarket');
    await answerConfirm(container, true);
    expect(stored()).toHaveLength(0);
    expect(container.querySelector('button[aria-label="SM Supermarket, −₱1,250.00"]')).toBeNull();
    const prefs = JSON.parse(window.localStorage.getItem('movo.preferences.v3'));
    expect(prefs.archive.some(entry => entry.kind === 'transaction' && entry.item.id === 'demo-1')).toBe(true);
    // The ₱1,250 expense no longer counts: the wallet total rises by exactly that much.
    expect(Math.round((walletBalance() - balanceBefore) * 100) / 100).toBe(1250);
  });

  test('bottom bar: the tapped tab turns active on touch-down, and a cancelled touch puts the bar back (owner, 2026-11-12)', () => {
    const bar = container.querySelector('.bottom-nav');
    const tab = name => bar.querySelector(`button[aria-label="${name}"]`);
    const active = () => [...bar.querySelectorAll('.nav-item.nav-active')].map(b => b.getAttribute('aria-label'));
    expect(active()).toEqual(['Home']);
    // Each tab carries its outline and filled icon; CSS shows the filled one on the active tab.
    expect(tab('Wallet').querySelectorAll('svg.nav-glyph-off, svg.nav-glyph-on')).toHaveLength(2);
    // Touch-down on Wallet: active straight away, before any click or render.
    act(() => { tab('Wallet').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); });
    expect(active()).toEqual(['Wallet']);
    expect(bar.querySelector('.nav-pill').style.getPropertyValue('--idx')).toBe('1');
    // The finger slides away (scroll): the touch is cancelled and the bar shows Home again.
    act(() => { tab('Wallet').dispatchEvent(new MouseEvent('pointercancel', { bubbles: true })); });
    expect(active()).toEqual(['Home']);
    expect(bar.querySelector('.nav-pill').style.getPropertyValue('--idx')).toBe('0');
    expect(container.querySelector('h1').textContent).not.toBe('Wallet');
    // A real tap opens Wallet and the bar stays in step.
    act(() => { tab('Wallet').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); tab('Wallet').click(); });
    expect(active()).toEqual(['Wallet']);
  });

  test('opens and closes the add-transaction sheet', () => {
    nav(container, 'Transactions');
    clickButton(container, 'Quick actions');
    clickButton(container, 'Add transaction');
    expect(container.querySelector('[role="dialog"][aria-label="Add transaction"]')).not.toBeNull();
    clickButton(container, 'Close Add transaction');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  test('profile editing saves validated fields only when the real form is submitted', () => {
    openProfile(container);
    clickButton(container, 'Edit profile');
    const name = container.querySelector('input[aria-label="Full Name"]');
    const phone = container.querySelector('input[aria-label="Phone Number"]');
    expect(container.querySelector('#movo-profile-form')).not.toBeNull();
    expect(container.textContent).toContain('saved in this browser only');
    setInputValue(name, '  Nasrin Test  ');
    setInputValue(phone, '+63 912 345 6789');
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).profileName || '').not.toBe('Nasrin Test');
    clickButton(container, 'Save');
    expect(container.querySelector('h1').textContent).toBe('Profile');
    const prefs = JSON.parse(window.localStorage.getItem('movo.preferences.v3'));
    expect(prefs.profileName).toBe('Nasrin Test');
    expect(prefs.phone).toBe('+63 912 345 6789');
    expect(container.textContent).toContain('Nasrin Test');
  });

  test('profile editing prevents saving a blank name', () => {
    openProfile(container);
    clickButton(container, 'Edit profile');
    setInputValue(container.querySelector('input[aria-label="Full Name"]'), '   ');
    clickButton(container, 'Save');
    expect(container.querySelector('#movo-profile-form')).not.toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toContain('Enter your name');
    expect(container.querySelector('h1').textContent).toBe('Profile');
  });

  test('profile, settings, appearance and notification screens are reachable', () => {
    openProfile(container);
    expect(container.querySelector('h1').textContent).toBe('Profile');
    expect(container.textContent).toContain('Data & Sync');
    expect(container.textContent).toContain('Manually entered records persist across reloads in this browser');
    expect(container.textContent).toContain('not synced to other devices or encrypted by MOVO');
    clickButton(container, 'Settings');
    expect(container.querySelector('h1').textContent).toBe('Settings');
    clickButton(container, 'Back');
    clickButton(container, 'Notifications');
    expect(container.querySelector('h1').textContent).toBe('Notifications');
    expect(container.textContent).toContain('Expense Recorded');
  });

  test('notification preferences keep the Home destination selected in primary navigation', () => {
    nav(container, 'Home');
    clickButton(container, 'Notifications');
    expect(container.querySelector('h1').textContent).toBe('Notifications');
    clickButton(container, 'Settings');
    expect(container.textContent).toContain('Notification Channels');
    const home = Array.from(container.querySelectorAll('.bottom-nav .nav-item')).find(item => item.getAttribute('aria-label') === 'Home');
    expect(home.getAttribute('aria-current')).toBe('page');
  });

  test('Terms of Service and Privacy Policy are reachable and cross-linked', () => {
    openProfile(container);
    clickButton(container, 'Terms of Service');
    expect(container.querySelector('h1').textContent).toBe('Terms of Service');
    expect(container.textContent).toContain('Effective date: November 11, 2026');
    expect(container.textContent).toContain('Custom card-sticker artwork is cropped in your browser');
    clickButton(container, 'Privacy Policy');
    expect(container.querySelector('h1').textContent).toBe('Privacy Policy');
    expect(container.textContent).toContain('Effective date: November 14, 2026');
    expect(container.textContent).not.toContain('not yet been published');
    expect(container.textContent).toContain('Things you delete in MOVO stay in the Archive for 90 days');
    expect(container.textContent).toContain('Data Privacy Act of 2012');
    expect(container.textContent).toContain('The MOVO service team operates MOVO');
    expect(container.textContent).toContain('Custom card-sticker artwork is processed in your browser and saved locally');
    clickButton(container, 'Back');
    expect(container.querySelector('h1').textContent).toBe('Profile');
  });

  test('Settings Privacy & Data opens the privacy policy instead of changing balance visibility', () => {
    openProfile(container);
    clickButton(container, 'Settings');
    const privacyRow = Array.from(container.querySelectorAll('button.menu-row')).find(item => item.querySelector('strong')?.textContent === 'Privacy & Data');
    expect(privacyRow).toBeTruthy();
    const before = JSON.parse(window.localStorage.getItem('movo.preferences.v3')).showBalance;
    act(() => privacyRow.click());
    expect(container.querySelector('h1').textContent).toBe('Privacy Policy');
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).showBalance).toBe(before);
  });

  test('theme choices update the app theme and persist preferences', () => {
    openProfile(container);
    clickButton(container, 'Dark');
    expect(container.querySelector('.movo-app, .theme-dark')).not.toBeNull();
    expect(container.firstChild.className).toContain('theme-dark');
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).theme).toBe('dark');
    clickButton(container, 'Purple accent');
    expect(container.firstChild.className).toContain('accent-purple');
  });

  test('search from Home expands a search bar with live matching results', () => {
    clickButton(container, 'Search');
    const input = container.querySelector('[aria-label="Filter transactions"]');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Netflix');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const results = container.querySelector('.search-results');
    expect(results.textContent).toContain('Netflix');
    expect(results.textContent).not.toContain('Puregold');
    expect(container.textContent).not.toContain('Show results');
  });

  test('settings work where the browser allows, and explain clearly where it does not', () => {
    openProfile(container);
    clickButton(container, 'Settings');
    // jsdom has no Notification API or platform authenticator: those switches are off and explain why.
    ['Push Notifications', 'Email Notifications', 'Face ID / Touch ID'].forEach(label => {
      const toggle = container.querySelector('button[aria-label="' + label + '"]');
      expect(toggle.disabled).toBe(true);
      expect(toggle.getAttribute('aria-checked')).toBe('false');
      expect(container.querySelector('#' + toggle.getAttribute('aria-describedby'))?.textContent.trim()).not.toBe('');
    });
    expect(container.textContent).toContain('This browser cannot show alerts');
    expect(container.textContent).toContain('used on this device');
    expect(container.querySelector('button[aria-label="Local Storage"]')).toBeNull();
    const autocat = container.querySelector('button[aria-label="Auto Categorization"]');
    expect(autocat.disabled).toBe(false);
    expect(autocat.getAttribute('aria-checked')).toBe('true');
    act(() => autocat.click());
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).autocat).toBe(false);
  });

  test('notification channels and quiet hours', () => {
    openProfile(container);
    const notificationSettings = Array.from(container.querySelectorAll('button.menu-row')).find(button => button.querySelector('strong')?.textContent === 'Notifications');
    act(() => notificationSettings.click());
    expect(container.textContent).toContain('Notification Channels');
    expect(container.querySelector('button[aria-label="Email Notifications"]').disabled).toBe(true);
    expect(container.textContent).toContain('Movo does not send email yet.');
    const quiet = container.querySelector('button[aria-label="Quiet Hours"]');
    expect(quiet.disabled).toBe(false);
    act(() => quiet.click());
    const [from, to] = container.querySelectorAll('.quiet-times input[type="time"]');
    expect(from.value).toBe('22:00');
    expect(to.value).toBe('07:00');
    setInputValue(from, '23:30');
    const prefs = JSON.parse(window.localStorage.getItem('movo.preferences.v3'));
    expect(prefs.quietOn).toBe(true);
    expect(prefs.quietStart).toBe('23:30');
  });

  test('every notification category can be switched and hides its notices', () => {
    openProfile(container);
    const notificationSettings = Array.from(container.querySelectorAll('button.menu-row')).find(button => button.querySelector('strong')?.textContent === 'Notifications');
    act(() => notificationSettings.click());
    ['Transactions', 'Account & Security', 'NasrinAI Updates', 'Money tips', 'Reports'].forEach(label => {
      const toggle = container.querySelector('button[aria-label="' + label + '"]');
      expect(toggle.disabled).toBe(false);
      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });
    act(() => container.querySelector('button[aria-label="NasrinAI Updates"]').click());
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).catAi).toBe(false);
    clickButton(container, 'Back');
    expect(container.textContent).not.toContain('NasrinAI Update');
  });

  test('Clear All Data requires typing DELETE, then resets preferences and removes local records', () => {
    openProfile(container);
    clickButton(container, 'Settings');
    const clearRow = Array.from(container.querySelectorAll('.menu-row')).find(row => row.querySelector('strong')?.textContent === 'Clear All Data');
    expect(clearRow).toBeTruthy();
    act(() => clearRow.click());
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Permanently deletes all MOVO data on this device');
    expect(container.querySelector('button.danger-button').disabled).toBe(true);
    setInputValue(container.querySelector('input[aria-label="Type DELETE to confirm"]'), 'delete');
    clickButton(container, 'Clear all data');
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).theme).toBe('system');
    expect(window.localStorage.getItem('movo.customStickers.v1')).toBeNull();
    nav(container, 'Home');
    expect(container.textContent).not.toContain('SM Supermarket');
  });

  test('turning off in-app alerts hides the notification feed', () => {
    openProfile(container);
    const notificationSettings = Array.from(container.querySelectorAll('button.menu-row')).find(item => item.querySelector('strong')?.textContent === 'Notifications');
    act(() => notificationSettings.click());
    const inAppToggle = container.querySelector('button[aria-label="In-App Alerts"]');
    act(() => inAppToggle.click());
    clickButton(container, 'Back');
    expect(container.textContent).toContain('In-app alerts are turned off');
    expect(container.textContent).not.toContain('Expense Recorded');
  });

  test('choosing a live search result opens its transaction', () => {
    nav(container, 'Transactions');
    clickButton(container, 'Search');
    const input = container.querySelector('[aria-label="Filter transactions"]');
    act(() => { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(input, 'Netflix'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    const row = Array.from(container.querySelectorAll('.search-row')).find(b => b.textContent.includes('Netflix'));
    expect(container.querySelector('.search-results').textContent).not.toContain('Puregold');
    jest.useFakeTimers();
    act(() => { row.click(); });
    act(() => { jest.advanceTimersByTime(250); });
    jest.useRealTimers();
    expect(container.querySelector('.search-overlay')).toBeNull();
    const details = container.querySelector('[aria-label="Transaction details"], .sheet');
    expect(details.textContent).toContain('Netflix');
    // Centered pop-up with when the money was spent; "Logged" appears when the record has a saved time.
    expect(details.querySelector('.tx-detail-name').textContent).toBe('Netflix');
    const labels = Array.from(details.querySelectorAll('.tx-detail-list dt')).map(dt => dt.textContent);
    expect(labels).toContain('Spent');
    if (labels.includes('Logged')) expect(labels.indexOf('Logged')).toBe(labels.indexOf('Spent') + 1);
  });

  test('liquid glass can be switched off and its clarity adjusted', () => {
    expect(container.firstChild.className).toContain('glass-on');
    openProfile(container);
    clickButton(container, 'Settings');
    const row = Array.from(container.querySelectorAll('button.menu-row')).find(b => b.textContent.startsWith('Liquid Glass'));
    act(() => row.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const slider = container.querySelector('input[aria-label="Glass clarity"]');
    act(() => { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(slider, '90'); slider.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(container.firstChild.style.getPropertyValue('--glass-blur')).toBe('7px');
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).clarity).toBe(90);
    const toggle = container.querySelector('button[aria-label="Liquid Glass"][role="switch"]');
    act(() => toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.firstChild.className).not.toContain('glass-on');
  });

  test('NasrinAI chat works locally for logging and offers sign-in for questions', () => {
    nav(container, 'NasrinAI');
    expect(container.querySelector('h1').textContent).toBe('NasrinAI');
    expect(container.textContent).toContain('user-scoped snapshot');
    expect(container.textContent).toContain('Logging works on this device. Sign in to ask NasrinAI about your money.');
    expect(container.querySelector('textarea#movo-ai-prompt')).not.toBeNull();
    clickButton(container, 'Sign in to MOVO');
    expect(container.querySelector('h2').textContent).toBe('Sign in to MOVO');
  });

  test('logs transactions typed in the chat, renders a card, and can undo without contacting NasrinAI', async () => {
    const fetchSpy = jest.fn(); global.fetch = fetchSpy;
    nav(container, 'NasrinAI');
    const box = container.querySelector('textarea#movo-ai-prompt');
    const type = (text) => act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(box, text);
      box.dispatchEvent(new Event('input', { bubbles: true }));
    });
    type('Spent 250 on Grab\nAdd 699 for gpt subs');
    await act(async () => { container.querySelector('form.movo-ai-composer').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    const rows = container.querySelectorAll('.chat-log-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Grab');
    expect(rows[0].textContent).toContain('−₱250.00');
    expect(rows[1].textContent).toContain('ChatGPT Plus');
    expect(container.textContent).toContain('Added to your transactions');
    let saved = JSON.parse(window.localStorage.getItem('movo.local.transactions.v1'));
    expect(saved.filter(t => t.note === 'Logged from NasrinAI chat').map(t => [t.merchant, t.amount, t.category])).toEqual([['Grab', 250, 'transport:ride_hailing'], ['ChatGPT Plus', 699, 'Subscriptions']]);
    await act(async () => { Array.from(rows[0].querySelectorAll('.link-button')).find(b => b.textContent === 'Undo').click(); });
    // Undo deletes a record, so it asks first; Cancel keeps it.
    expect(container.querySelector('.confirm-name').textContent).toBe('Grab');
    await answerConfirm(container, false);
    expect(rows[0].textContent).not.toContain('Removed');
    expect(JSON.parse(window.localStorage.getItem('movo.local.transactions.v1')).some(t => t.merchant === 'Grab')).toBe(true);
    await act(async () => { Array.from(rows[0].querySelectorAll('.link-button')).find(b => b.textContent === 'Undo').click(); });
    await answerConfirm(container, true);
    expect(rows[0].textContent).toContain('Removed');
    saved = JSON.parse(window.localStorage.getItem('movo.local.transactions.v1'));
    expect(saved.filter(t => t.note === 'Logged from NasrinAI chat').map(t => t.merchant)).toEqual(['ChatGPT Plus']);
    // Money questions are answered on this device at once; other questions still need NasrinAI (and sign-in).
    type('How much did I spend on Grab this month?');
    await act(async () => { container.querySelector('form.movo-ai-composer').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(container.textContent).toMatch(/This month · Grab|No Grab records for this month/);
    type('Should I invest in index funds?');
    await act(async () => { container.querySelector('form.movo-ai-composer').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(container.textContent).toContain('Sign in to ask me questions about your money.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Plan & Usage shows real usage, and Help Center opens useful guidance', () => {
    openProfile(container);
    clickButton(container, 'Settings');
    const plan = Array.from(container.querySelectorAll('.menu-row')).find(row => row.querySelector('strong')?.textContent === 'Plan & Usage');
    expect(plan.tagName).toBe('BUTTON');
    act(() => plan.click());
    const sheet = container.querySelector('[role="dialog"][aria-label="Plan & Usage"]');
    // The account in these tests is Pro+: the sheet shows it at once from the plan verified at launch, never "Free".
    expect(sheet.querySelector('.plan-usage-current').className).toContain('tier-pro_plus');
    expect(sheet.textContent).toContain('Pro+');
    expect(sheet.textContent).not.toMatch(/\bFree\b/);
    expect(sheet.textContent).toMatch(/\d+Transactions/);
    expect(sheet.textContent).toContain('Subscribe in the MOVO iOS or Android app.');
    // Restore purchases and Manage subscription are always there (owner, 2026-11-12).
    expect(Array.from(sheet.querySelectorAll('.subscription-links button')).map(b => [b.textContent, b.disabled])).toEqual([['Restore purchases', false], ['Manage subscription', false]]);
    clickButton(container, 'Close Plan & Usage');
    const helpRow = Array.from(container.querySelectorAll('.menu-row')).find(row => row.querySelector('strong')?.textContent === 'Help Center');
    act(() => helpRow.click());
    expect(container.querySelector('h1').textContent).toBe('Help Center');
    expect(container.textContent).toContain('does not move money between banks');
    clickButton(container, 'Privacy Policy');
    expect(container.querySelector('h1').textContent).toBe('Privacy Policy');
  });

  test('account sheets receive keyboard focus, trap Tab, and close on Escape', () => {
    nav(container, 'Wallet');
    const trigger = Array.from(container.querySelectorAll('button')).find(item => item.getAttribute('aria-label') === 'New account');
    expect(trigger).toBeTruthy();
    act(() => { trigger.focus(); trigger.click(); });
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.contains(document.activeElement)).toBe(true);
    const focusable = Array.from(dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    expect(focusable.length).toBeGreaterThan(1);
    act(() => {
      focusable[focusable.length - 1].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(focusable[0]);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test('creates, edits and archives a local-only account across reloads', async () => {
    nav(container, 'Wallet');
    clickButton(container, 'New account');
    act(() => Array.from(container.querySelectorAll('.sheet-card')).find(b => b.textContent.includes('Credit or debit card')).click());
    // A credit card is named after its issuing bank (there is no separate name field).
    clickButton(container, 'Credit');
    setInputValue(container.querySelector('#acct-linked-bank'), 'demo-gotyme');
    act(() => container.querySelector('.acct-network-row button[aria-label="Mastercard"]').click());
    // A credit card asks for its credit limit (and what is already owed) instead of a starting balance.
    expect(container.querySelector('#acct-balance')).toBeNull();
    setInputValue(container.querySelector('#acct-limit'), '50000');
    setInputValue(container.querySelector('#acct-owed'), '1200');
    clickButton(container, 'Add account');
    const created = JSON.parse(window.localStorage.getItem('movo.local.accounts.v1')).find(a => a.account_type === 'card' && a.name === 'GoTyme');
    expect(created).toBeTruthy();
    expect(created.opening_balance).toBe(-1200); // owed, not taken from the issuing bank
    const savedPrefs = JSON.parse(window.localStorage.getItem('movo.preferences.v3'));
    expect(savedPrefs.accountStyles[created.id]).toMatchObject({ creditLimit: 50000, issuerBankId: 'demo-gotyme' });
    expect((savedPrefs.cardBankLinks || {})[created.id]).toBeUndefined(); // the bank's balance is never shared
    // The chosen card network is kept and drawn on the card.
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).accountStyles[created.id].cardNetwork).toBe('mastercard');
    expect(container.querySelector('.ccx-net.net-mastercard')).not.toBeNull();
    clickButton(container, 'Cards');
    const goTymeCard = container.querySelector('button[aria-label="Show GoTyme card"]');
    expect(goTymeCard).toBeTruthy();
    act(() => goTymeCard.click());
    expect(goTymeCard.getAttribute('aria-current')).toBe('true');
    clickButton(container, 'View Details');
    clickButton(container, 'Edit account');
    setInputValue(container.querySelector('#acct-linked-bank'), 'demo-rcbc');
    clickButton(container, 'Save changes');
    expect(JSON.parse(window.localStorage.getItem('movo.local.accounts.v1')).some(a => a.account_type === 'card' && a.name === 'RCBC')).toBe(true);
    act(() => root.unmount());
    root = createRoot(container);
    act(() => root.render(<App />));
    nav(container, 'Wallet');
    clickButton(container, 'Cards');
    const rcbcCard = container.querySelector('button[aria-label="Show RCBC card"]');
    expect(rcbcCard).toBeTruthy();
    act(() => rcbcCard.click());
    expect(rcbcCard.getAttribute('aria-current')).toBe('true');
    clickButton(container, 'View Details');
    clickButton(container, 'Archive account');
    const rcbc = () => JSON.parse(window.localStorage.getItem('movo.local.accounts.v1')).find(account => account.account_type === 'card' && account.name === 'RCBC');
    expect(container.querySelector('.confirm-title').textContent).toBe('Archive this account?');
    await answerConfirm(container, false);
    expect(rcbc().is_archived).toBe(false);
    clickButton(container, 'Archive account');
    await answerConfirm(container, true);
    expect(rcbc().is_archived).toBe(true);
  });

  test('edits a transaction and persists the change locally', () => {
    nav(container, 'Transactions');
    clickButton(container, 'See All');
    clickButton(container, 'SM Supermarket, −₱1,250.00');
    clickButton(container, 'Edit');
    const description = container.querySelector('input[aria-label="Description"]');
    setInputValue(description, 'Edited supermarket');
    clickButton(container, 'Save changes');
    expect(container.textContent).toContain('Edited supermarket');
    expect(window.localStorage.getItem('movo.local.transactions.v1')).toContain('Edited supermarket');
    act(() => root.unmount());
    root = createRoot(container);
    act(() => root.render(<App />));
    expect(container.textContent).toContain('Edited supermarket');
  });

  test('warns when local financial records cannot be saved and retries after storage recovers', () => {
    const originalSetItem = Storage.prototype.setItem;
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (['movo.local.transactions.v1', 'movo.local.accounts.v1', 'movo.samples.enabled.v1'].includes(String(key))) {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    });

    try {
      nav(container, 'Transactions');
      clickButton(container, 'See All');
      clickButton(container, 'SM Supermarket, −₱1,250.00');
      clickButton(container, 'Edit');
      setInputValue(container.querySelector('input[aria-label="Description"]'), 'Storage warning regression');
      clickButton(container, 'Save changes');

      expect(container.textContent).toContain('Local changes may not be saved.');
      expect(container.textContent).toContain('Important records may not survive a reload.');
      clickButton(container, 'Retry save');
      expect(container.textContent).toContain('Browser storage is unavailable or full. Export your records and retry.');
    } finally {
      spy.mockRestore();
    }

    clickButton(container, 'Retry save');
    expect(container.textContent).not.toContain('Local changes may not be saved.');
    expect(window.localStorage.getItem('movo.local.transactions.v1')).toContain('Storage warning regression');
  });

  test('CSV import action opens a review-first import sheet', () => {
    nav(container, 'Wallet');
    clickButton(container, 'More');
    clickButton(container, 'Import CSV');
    expect(container.querySelector('[role="dialog"][aria-label="Import transactions"]')).not.toBeNull();
    expect(container.querySelector('input[type="file"][accept=".csv,text/csv"]')).not.toBeNull();
    expect(Array.from(container.querySelectorAll('button')).some(button => button.textContent.includes('Save records') && button.disabled)).toBe(true);
  });

  test('Menu opens Profile, Subscriptions, Plans and Limits, and a subscription can be added', () => {
    nav(container, 'Menu');
    expect(container.querySelector('h1').textContent).toBe('Menu');
    const tiles = Array.from(container.querySelectorAll('.menu-tile strong')).map(n => n.textContent);
    expect(tiles).toEqual(['Subscriptions', 'Plans', 'Cashback', 'Scheduled', 'Financial planning', 'Exchange rates', 'Crypto market', 'Stocks market', 'Archive', 'Limits']);
    expect(tiles).not.toContain('Profile');
    act(() => Array.from(container.querySelectorAll('.menu-tile')).find(tile => tile.textContent.includes('Subscriptions')).click());
    expect(container.querySelector('h1').textContent).toBe('Subscriptions');
    clickButton(container, 'Add subscription');
    const search = container.querySelector('input[aria-label="Search for an app or service"]');
    setInputValue(search, 'netfl');
    const row = Array.from(container.querySelectorAll('.catalog-row')).find(b => b.textContent.includes('Netflix'));
    act(() => row.click());
    const form = container.querySelector('form.sheet-form');
    clickButton(container, 'Save');
    expect(form.querySelector('[role="alert"]').textContent).toContain('amount greater than zero');
    setInputValue(form.querySelector('input[inputmode="decimal"]'), '549');
    clickButton(container, 'Save');
    const saved = JSON.parse(window.localStorage.getItem('movo.preferences.v3')).subscriptions;
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: 'Netflix', amount: 549, cycle: 'monthly', status: 'active' });
    expect(container.querySelector('[aria-label="Subscription summary"]').textContent).toContain('549');
    clickButton(container, 'Back');
    act(() => Array.from(container.querySelectorAll('.menu-tile')).find(tile => tile.textContent.includes('Limits')).click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  test('NasrinAI briefing lives in Notifications, not Home, and opens on tap', () => {
    expect(container.querySelector('.brief-note')).toBeNull();
    clickButton(container, 'Notifications');
    const note = container.querySelector('.brief-note');
    expect(note).not.toBeNull();
    act(() => note.click());
    expect(container.querySelector('[role="dialog"][aria-label="Your daily briefing"]')).not.toBeNull();
    expect(container.textContent).toContain('Tips for you');
  });

  test('red dots clear once notifications have been seen, and row dots clear when each is opened', () => {
    expect(container.querySelector('.bottom-nav .nav-badge')).not.toBeNull();
    clickButton(container, 'Notifications');
    const rowDots = container.querySelectorAll('.note-row .red-dot').length;
    expect(rowDots).toBeGreaterThan(0);
    nav(container, 'Home');
    expect(container.querySelector('.bottom-nav .nav-badge')).toBeNull();
    expect(container.querySelector('.round-button .red-dot')).toBeNull();
    clickButton(container, 'Notifications');
    act(() => container.querySelector('.note-row').click());
    clickButton(container, 'Back');
    expect(container.querySelectorAll('.note-row .red-dot').length).toBe(rowDots - 1);
    clickButton(container, 'Mark all as read');
    expect(container.querySelectorAll('.note-row .red-dot').length).toBe(0);
    expect(Array.from(container.querySelectorAll('[data-chip] .red-dot'))).toHaveLength(0);
  });

test('in local mode a payment link opens MOVO plans once and is cleared, instead of re-opening on every render', async () => {
    global.__movoPauseLocalPlans = true;
    try {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
      window.location.hash = '#log?src=applepay&k=untrusted&amount=109&merchant=Gadc&card=BPI%20Visa';
      act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
      expect(container.querySelector('[role="alertdialog"][aria-label="Log this payment?"]')).toBeNull();
      expect(document.querySelectorAll('[role="dialog"][aria-label="Offline feature access"]')).toHaveLength(1);
      expect(window.location.hash).toBe('');
    } finally { global.__movoPauseLocalPlans = false; }
  });

test('Apple Pay payment prompt Log button opens a prefilled expense form', async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    window.location.hash = '#log?src=applepay&k=untrusted&amount=109&merchant=Gadc&card=BPI%20Visa';
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    expect(container.querySelector('[role="alertdialog"][aria-label="Log this payment?"]')).not.toBeNull();
    expect(container.textContent).toContain('Apple Pay: ₱109.00');
    clickButton(container, 'Log');
    const dialog = container.querySelector('[role="dialog"][aria-label="Add transaction"]');
    expect(dialog).not.toBeNull();
    const inputValues = Array.from(dialog.querySelectorAll('input')).map(input => input.value);
    expect(inputValues).toContain('Gadc');
    expect(dialog.querySelector('[aria-label="Amount"]')?.textContent).toContain('109');
  });

  test('opening MOVO shows what was logged while it was unused, then remembers it was seen', async () => {
    act(() => root.unmount());
    const prefs = JSON.parse(window.localStorage.getItem('movo.preferences.v3') || '{}');
    window.localStorage.setItem('movo.preferences.v3', JSON.stringify({ ...prefs, onboarded: true, logsSeenAt: '2026-10-29T02:00:00.000Z' }));
    const txs = JSON.parse(window.localStorage.getItem('movo.local.transactions.v1') || '[]');
    const account = JSON.parse(window.localStorage.getItem('movo.local.accounts.v1'))[0];
    window.localStorage.setItem('movo.local.transactions.v1', JSON.stringify([{ id: 'away-1', merchant: 'Away Cafe', amount: 333, currency: 'PHP', transaction_type: 'expense', category: 'Food & drinks', account_id: account.id, occurred_at: '2026-10-29T02:30:00.000Z', created_at: '2026-10-29T02:30:00.000Z', source: 'applepay' }, ...txs]));
    root = createRoot(container);
    act(() => root.render(<App />));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    const dialog = () => container.querySelector('.recent-logs-sheet');
    expect(dialog()).not.toBeNull();
    expect(dialog().textContent).toContain('While you were away');
    expect(dialog().textContent).toContain('Away Cafe');
    expect(dialog().textContent).toContain('Apple Pay');
    expect(dialog().textContent).not.toContain('Not logged'); // nothing failed on this device
    act(() => Array.from(dialog().querySelectorAll('button')).find(b => b.textContent.trim() === 'Done').click());
    expect(dialog()).toBeNull();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(Date.parse(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).logsSeenAt)).toBeGreaterThan(Date.parse('2026-10-29T02:30:00.000Z'));
  });

  test('trusted Apple Pay links log with their own source, and the bank alert for the same purchase is not added twice', async () => {
    const key = 'f'.repeat(32);
    act(() => root.unmount());
    window.localStorage.setItem('movo.preferences.v3', JSON.stringify({ ...JSON.parse(window.localStorage.getItem('movo.preferences.v3') || '{}'), autoLog: true, autoLogKey: key, onboarded: true }));
    root = createRoot(container);
    act(() => root.render(<App />));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    const stored = () => JSON.parse(window.localStorage.getItem('movo.local.transactions.v1') || '[]').filter(t => Number(t.amount) === 109);
    window.location.hash = `#log?src=applepay&k=${key}&amount=109&merchant=Gadc&card=BPI%20Visa`;
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(stored()).toHaveLength(1);
    expect(stored()[0]).toMatchObject({ source: 'applepay', merchant: 'Gadc', transaction_type: 'expense' });
    window.location.hash = `#log?src=bank&k=${key}&amount=109&merchant=POS%20GADC%20MAKATI&card=BPI%20Visa`;
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(stored()).toHaveLength(1);
    expect(container.textContent).toMatch(/not added twice/);
  });

  test('a confirmed (Log) Google Pay prompt keeps Google Pay as its source', async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    window.location.hash = '#log?src=googlepay&k=untrusted&amount=77&merchant=Starbucks&card=BPI%20Visa';
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    clickButton(container, 'Log');
    const dialog = container.querySelector('[role="dialog"][aria-label="Add transaction"]');
    act(() => dialog.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    const saved = JSON.parse(window.localStorage.getItem('movo.local.transactions.v1') || '[]').find(t => t.merchant === 'Starbucks' && Number(t.amount) === 77);
    expect(saved).toMatchObject({ source: 'googlepay' });
  });

  test('Apple Pay payment prompt Skip button dismisses the payment without opening a transaction form', async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    window.location.hash = '#log?src=applepay&k=untrusted&amount=109&merchant=Gadc&card=BPI%20Visa';
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    expect(container.querySelector('[role="alertdialog"][aria-label="Log this payment?"]')).not.toBeNull();
    clickButton(container, 'Skip');
    expect(container.querySelector('[role="alertdialog"][aria-label="Log this payment?"]')).toBeNull();
    expect(container.querySelector('[role="dialog"][aria-label="Add transaction"]')).toBeNull();
    expect(window.localStorage.getItem('movo.local.transactions.v1') || '').not.toContain('Gadc');
  });
});
test('accent text stays readable on dark backgrounds', () => {
  const { readableAccent } = require('./App');
  const lum = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  const onDark = (hex) => (lum(hex) + 0.05) / (0.0116 + 0.05);
  expect(onDark(readableAccent('#334155', true))).toBeGreaterThanOrEqual(6);
  expect(onDark(readableAccent('#2f6bff', true))).toBeGreaterThanOrEqual(6);
  expect(readableAccent('#334155', false)).toBe('#334155');
  expect(readableAccent('#c7f0dc', true)).toBe('#c7f0dc');
  const onLight = hex => 1.05 / (lum(hex) + 0.05);
  ['#13b45f', '#2f6bff', '#7c4dff', '#ff8a1f', '#d32f2f', '#334155'].forEach(accent => {
    expect(onLight(readableAccent(accent, false))).toBeGreaterThanOrEqual(4.5);
  });
});
 
test('accent-filled controls choose a WCAG-strong foreground for every accent family', () => {
  const { contrastTextForAccent } = require('./App');
  const luminance = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  ['#13b45f', '#2f6bff', '#7c4dff', '#ff8a1f', '#d32f2f', '#334155', '#f4e542', '#111111'].forEach(accent => {
    const ink = contrastTextForAccent(accent);
    expect(['#000000', '#ffffff']).toContain(ink);
    expect(ratio(accent, ink)).toBeGreaterThanOrEqual(4.5);
  });
  // Filled dark green uses white lettering; tinted light green uses black.
  expect(contrastTextForAccent('#086b3a')).toBe('#ffffff');
  expect(contrastTextForAccent('#2f6bff')).toBe('#000000');
  expect(contrastTextForAccent('#d6f5e3')).toBe('#000000');
  expect(contrastTextForAccent('#1c1c1e')).toBe('#ffffff');
  expect(contrastTextForAccent('#f3f3f7')).toBe('#000000');
  expect(contrastTextForAccent('invalid')).toBe('#ffffff');
});


describe('setup gate: Terms and Privacy acceptance before the dashboard (owner, 2026-11-11)', () => {
  const { LEGAL_VERSION } = require('./lib/legalVersion');
  let container; let root;
  const prefs = () => JSON.parse(window.localStorage.getItem('movo.preferences.v3') || '{}');
  const start = async (stored) => {
    window.localStorage.clear();
    seedLocalRecords();
    window.localStorage.setItem('movo.preferences.v3', JSON.stringify({ ...prefs(), planWelcomeSeen: true, onboarded: true, tutorialSeen: true, ...stored }));
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => { root.render(<App />); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  };
  const agreement = () => container.querySelector('.setup-agreement [role="dialog"]');
  const navButtons = () => Array.from(container.querySelectorAll('.bottom-nav .nav-item'));
  beforeEach(() => { window.__MOVO_SETUP_GATE__ = true; });
  afterEach(() => { act(() => root.unmount()); container.remove(); window.localStorage.clear(); delete window.__MOVO_SETUP_GATE__; });

  test('without an acceptance the dashboard is covered and the bottom navigation is locked', async () => {
    await start({ legalAccepted: '' });
    expect(agreement()).not.toBeNull();
    expect(container.querySelector('.bottom-nav').classList.contains('is-locked')).toBe(true);
    expect(navButtons().every(b => b.disabled)).toBe(true);
    act(() => navButtons().find(b => b.getAttribute('aria-label') === 'Wallet').click());
    expect(container.querySelector('.bottom-nav .nav-active')?.getAttribute('aria-label')).toBe('Home');
    ['never connects to your bank', 'logos', 'delete your account'].forEach(text => expect(agreement().textContent).toContain(text));
  });

  test('Accept stays off until the box is ticked; accepting saves the version and opens the dashboard', async () => {
    await start({ legalAccepted: '' });
    const accept = container.querySelector('.setup-agreement-accept');
    expect(accept.disabled).toBe(true);
    act(() => accept.click());
    expect(agreement()).not.toBeNull();
    act(() => container.querySelector('.setup-agreement-check input').click());
    expect(accept.disabled).toBe(false);
    act(() => accept.click());
    expect(agreement()).toBeNull();
    expect(prefs().legalAccepted).toBe(LEGAL_VERSION);
    expect(Number.isNaN(Date.parse(prefs().legalAcceptedAt))).toBe(false);
    expect(navButtons().some(b => b.disabled)).toBe(false);
    act(() => navButtons().find(b => b.getAttribute('aria-label') === 'Wallet').click());
    expect(container.querySelector('.bottom-nav .nav-active')?.getAttribute('aria-label')).toBe('Wallet');
  });

  test('the Terms can be read from the agreement, which returns afterwards', async () => {
    await start({ legalAccepted: '' });
    act(() => Array.from(container.querySelectorAll('.setup-agreement-links button')).find(b => b.textContent.includes('Terms of Service')).click());
    expect(agreement()).toBeNull();
    expect(container.textContent).toContain('17. Accepting these terms during setup');
    expect(navButtons().every(b => b.disabled)).toBe(true);
    act(() => container.querySelector('main .back-button').click());
    expect(agreement()).not.toBeNull();
  });

  test('the free-month panel comes first, then the agreement', async () => {
    await start({ legalAccepted: '', planWelcomeSeen: false });
    expect(agreement()).toBeNull();
    expect(container.querySelector('.plan-panel, [aria-label*="MOVO plans"], .plan-offer')).not.toBeNull();
    expect(navButtons().every(b => b.disabled)).toBe(true);
    await act(async () => { container.querySelector('.plan-panel .sheet-close, .sheet-close, [aria-label="Close"]').click(); });
    expect(prefs().planWelcomeSeen).toBe(true);
    expect(agreement()).not.toBeNull();
  });

  test('an older acceptance asks again; the current one opens straight to the dashboard', async () => {
    await start({ legalAccepted: '2026-11-06' });
    expect(agreement()).not.toBeNull();
    act(() => root.unmount()); container.remove();
    await start({ legalAccepted: LEGAL_VERSION });
    expect(agreement()).toBeNull();
    expect(navButtons().some(b => b.disabled)).toBe(false);
  });
});


describe('edge swipe back (iPhone app; owner, 2026-11-12)', () => {
  let container; let root;
  const swipe = (fromX, toX) => {
    const fire = (type, x) => { const e = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(e, 'touches', { value: type === 'touchend' ? [] : [{ clientX: x, clientY: 400 }] }); act(() => { document.body.dispatchEvent(e); }); };
    fire('touchstart', fromX); fire('touchmove', fromX + (toX - fromX) / 3); fire('touchmove', toX); fire('touchend', 0);
  };
  const active = () => container.querySelector('.bottom-nav .nav-active')?.getAttribute('aria-label');
  beforeEach(async () => {
    window.__MOVO_EDGE_SWIPE__ = true;
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    window.localStorage.clear(); seedLocalRecords();
    window.localStorage.setItem('movo.preferences.v3', JSON.stringify({ ...JSON.parse(window.localStorage.getItem('movo.preferences.v3') || '{}'), planWelcomeSeen: true }));
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => { root.render(<App />); });
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); window.localStorage.clear(); delete window.__MOVO_EDGE_SWIPE__; });

  test('swiping in from the left edge returns to the previous screen, and from the right edge too', () => {
    nav(container, 'Wallet'); nav(container, 'Transactions');
    expect(active()).toBe('Transactions');
    swipe(4, 300);
    expect(active()).toBe('Wallet');
    swipe(386, 80);
    expect(active()).toBe('Home');
    swipe(4, 300); // nothing left: Home stays
    expect(active()).toBe('Home');
  });

  test('an open sheet closes first, and the screen stays', () => {
    nav(container, 'Wallet');
    clickButton(container, 'New account');
    expect(container.querySelector('.sheet-backdrop')).not.toBeNull();
    swipe(4, 300);
    expect(container.querySelector('.sheet-backdrop')).toBeNull();
    expect(active()).toBe('Wallet');
  });
});

describe('Home header block (owner, 2026-11-12)', () => {
  let container; let root;
  const start = (prefs) => {
    window.localStorage.clear(); seedLocalRecords();
    window.localStorage.setItem('movo.preferences.v3', JSON.stringify({ ...JSON.parse(window.localStorage.getItem('movo.preferences.v3') || '{}'), planWelcomeSeen: true, ...prefs }));
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    act(() => root.render(<App />));
  };
  afterEach(() => { act(() => root.unmount()); container.remove(); window.localStorage.clear(); });

  test('when another box comes first, the header stands alone with the background and Total balance stays in the list', () => {
    start({ layouts: { home: { order: ['summary', 'balance'] } } });
    expect(container.querySelector('.home-hero-block')).toBeNull();
    expect(container.querySelector('.home-header').className).toContain('home-hero');
    expect(container.querySelectorAll('.balance-card').length).toBe(1);
  });

  test('with no background the header is plain and nothing is pinned with it', () => {
    start({ homeHero: 'plain' });
    expect(container.querySelector('.home-hero-block')).toBeNull();
    expect(container.querySelector('.home-header').className).not.toContain('home-hero');
    expect(container.querySelectorAll('.balance-card').length).toBe(1);
  });
});
