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
window.scrollTo = jest.fn();
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
  beforeEach(() => { window.localStorage.clear(); seedLocalRecords(); container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); act(() => root.render(<App />)); });
  afterEach(() => { act(() => root.unmount()); container.remove(); window.localStorage.clear(); });

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
    clickButton(container, 'Bank Accounts');
    expect(container.textContent).toContain('RCBC');
    clickButton(container, 'E-Wallets');
    expect(container.textContent).toContain('GCash');
    clickButton(container, 'Cards');
    expect(container.textContent).toContain('Available Balance');
    clickButton(container, 'Switch card');
    expect(container.querySelector('[role="dialog"]').textContent).toContain('Your Cards');
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

  test('opens a transaction, then deletes it after confirmation', () => {
    window.confirm = jest.fn(() => true);
    nav(container, 'Transactions');
    clickButton(container, 'See All');
    clickButton(container, 'SM Supermarket, −₱1,250.00');
    expect(container.querySelector('[role="dialog"]').textContent).toContain('SM Supermarket');
    clickButton(container, 'Delete SM Supermarket');
    expect(container.textContent).not.toContain('SM Supermarket, ');
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
    expect(container.textContent).toContain('Effective date: October 29, 2026');
    expect(container.textContent).toContain('Custom card-sticker artwork is cropped in your browser');
    clickButton(container, 'Privacy Policy');
    expect(container.querySelector('h1').textContent).toBe('Privacy Policy');
    expect(container.textContent).toContain('Effective date: October 30, 2026');
    expect(container.textContent).toContain('end-to-end upstream context boundary has not yet been independently verified in the deployed integration');
    expect(container.textContent).toContain('formal legal identity and registered address have not yet been published');
    expect(container.textContent).toContain('Data Privacy Act of 2012');
    expect(container.textContent).toContain('legal name and registered address of the MOVO data controller are not yet displayed');
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
    expect(container.querySelector('[aria-label="Transaction details"], .sheet').textContent).toContain('Netflix');
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
    expect(container.querySelector('h2').textContent).toBe('Welcome back');
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
    expect(saved.filter(t => t.note === 'Logged from NasrinAI chat').map(t => [t.merchant, t.amount, t.category])).toEqual([['Grab', 250, 'Transport'], ['ChatGPT Plus', 699, 'Subscriptions']]);
    await act(async () => { Array.from(rows[0].querySelectorAll('.link-button')).find(b => b.textContent === 'Undo').click(); });
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
    expect(sheet.textContent).toContain('Free · this device only');
    expect(sheet.textContent).toMatch(/Transactions\d+/);
    expect(sheet.textContent).toContain('no paid plan or billing');
    clickButton(container, 'Close Plan & Usage');
    const helpRow = Array.from(container.querySelectorAll('.menu-row')).find(row => row.querySelector('strong')?.textContent === 'Help Center');
    act(() => helpRow.click());
    expect(container.querySelector('h1').textContent).toBe('Help Center');
    expect(container.textContent).toContain('does not move money between banks');
    clickButton(container, 'Privacy Policy');
    expect(container.querySelector('h1').textContent).toBe('Privacy Policy');
  });

  test('sheets receive keyboard focus, trap Tab, and close on Escape', () => {
    nav(container, 'Wallet');
    clickButton(container, 'Cards');
    const trigger = Array.from(container.querySelectorAll('button')).find(item => item.getAttribute('aria-label') === 'Switch card' || item.textContent.trim() === 'Switch card');
    expect(trigger).toBeTruthy();
    act(() => { trigger.focus(); trigger.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
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

  test('creates, edits and archives a local-only account across reloads', () => {
    window.confirm = jest.fn(() => true);
    nav(container, 'Wallet');
    clickButton(container, 'Add Card');
    const name = container.querySelector('#acct-name');
    setInputValue(name, 'My Test Card');
    clickButton(container, 'Add account');
    expect(window.localStorage.getItem('movo.local.accounts.v1')).toContain('My Test Card');
    clickButton(container, 'Cards');
    clickButton(container, 'Switch card');
    const targetCard = Array.from(container.querySelectorAll('.sheet-card')).find(button => button.textContent.includes('My Test Card'));
    expect(targetCard).toBeTruthy();
    act(() => targetCard.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    clickButton(container, 'View Details');
    clickButton(container, 'Edit account');
    setInputValue(container.querySelector('#acct-name'), 'Updated Test Card');
    clickButton(container, 'Save changes');
    expect(container.textContent).toContain('Updated Test Card');
    expect(window.localStorage.getItem('movo.local.accounts.v1')).toContain('Updated Test Card');
    act(() => root.unmount());
    root = createRoot(container);
    act(() => root.render(<App />));
    nav(container, 'Wallet');
    clickButton(container, 'Cards');
    expect(container.textContent).toContain('Updated Test Card');
    clickButton(container, 'Switch card');
    const updatedCard = Array.from(container.querySelectorAll('.sheet-card')).find(button => button.textContent.includes('Updated Test Card'));
    expect(updatedCard).toBeTruthy();
    act(() => updatedCard.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    clickButton(container, 'View Details');
    clickButton(container, 'Archive account');
    expect(JSON.parse(window.localStorage.getItem('movo.local.accounts.v1')).find(account => account.name === 'Updated Test Card').is_archived).toBe(true);
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
      expect(container.textContent).toContain('Browser storage is still unavailable or full.');
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
    expect(Array.from(container.querySelectorAll('button')).some(button => button.textContent.includes('Import 0 transaction(s)') && button.disabled)).toBe(true);
  });

  test('Menu opens Profile, Subscriptions, Plans and Limits, and a subscription can be added', () => {
    nav(container, 'Menu');
    expect(container.querySelector('h1').textContent).toBe('Menu');
    const tiles = Array.from(container.querySelectorAll('.menu-tile strong')).map(n => n.textContent);
    expect(tiles).toEqual(['Profile', 'Subscriptions', 'Plans', 'Financial planning', 'Limits']);
    act(() => container.querySelectorAll('.menu-tile')[1].click());
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
    act(() => container.querySelectorAll('.menu-tile')[3].click());
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
});
