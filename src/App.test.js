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
}));
import App from './App';

global.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = jest.fn();
function clickButton(container, name) {
  const parts = name.split(', ');
  const merchant = parts[0];
  const amount = parts.length > 1 ? parts.slice(1).join(', ') : '';
  const button = Array.from(container.querySelectorAll('button')).find(item => (
    item.getAttribute('aria-label') === name
    || item.textContent.trim() === name
    || (name === 'Edit profile' && item.classList.contains('profile-card') && item.getAttribute('aria-label')?.includes('Edit profile'))
    || (item.classList.contains('tx-row')
      && amount
      && item.textContent.includes(merchant)
      && item.textContent.includes(amount))
  ));
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

describe('MOVO finance frontend', () => {
  let container; let root;
  beforeEach(() => { window.localStorage.clear(); container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); act(() => root.render(<App />)); });
  afterEach(() => { act(() => root.unmount()); container.remove(); window.localStorage.clear(); });

  test('renders the home dashboard from the design: balance, summary, spending and recent activity', () => {
    expect(container.querySelector('h1').textContent).toContain('Demo');
    expect(container.textContent).toContain('₱128,450.00');
    expect(container.querySelector('[aria-label="Financial summary"]')).not.toBeNull();
    expect(container.textContent).toContain('₱85,000');
    expect(container.textContent).toContain('₱42,350');
    expect(container.textContent).toContain('Spending This Month');
    expect(container.textContent).toContain('Recent Transactions');
    ['Food', 'Shopping', 'Bills', 'Transportation', 'Others'].forEach(label => expect(container.textContent).toContain(label));
    expect(container.querySelectorAll('.bottom-nav .nav-item')).toHaveLength(5);
  });

  test('labels unauthenticated financial examples and uses a generic demo identity', () => {
    const notice = container.querySelector('[aria-label="Sample data notice"]');
    expect(notice).not.toBeNull();
    expect(notice.textContent).toContain('fictional');
    expect(notice.textContent).toContain('not linked to a bank');
    expect(container.querySelector('h1').textContent).toContain('Demo');
    expect(container.textContent).not.toContain('nasrin@nasrinai.com');
    expect(container.textContent).not.toContain('Nasrin Abubakar');
  });

  test('sample-data notice sign-in action opens the consent-aware sign-in screen', () => {
    clickButton(container, 'Sign in');
    expect(container.querySelector('form')).not.toBeNull();
    expect(container.textContent).toContain('Terms of Service');
    expect(container.textContent).toContain('Privacy Policy');
    expect(container.querySelector('[aria-label="Sample data notice"]')).toBeNull();
  });

  test('privacy toggle hides displayed balances', () => {
    expect(container.textContent).toContain('₱1,250.00');
    clickButton(container, 'Hide balances');
    expect(container.textContent).toContain('₱ ••••••');
    expect(container.textContent).not.toContain('₱1,250.00');
    expect(container.textContent).not.toContain('₱128,450.00');
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

  test('card issuer actions are disabled with a visible, accessible explanation', () => {
    nav(container, 'Wallet');
    clickButton(container, 'Cards');
    const blockCard = Array.from(container.querySelectorAll('button')).find(button => button.textContent.includes('Block Card'));
    const limits = Array.from(container.querySelectorAll('button')).find(button => button.textContent.includes('Limits'));
    expect(blockCard).toBeTruthy();
    expect(limits).toBeTruthy();
    expect(blockCard.disabled).toBe(true);
    expect(limits.disabled).toBe(true);
    expect(blockCard.getAttribute('aria-describedby')).toBe('card-control-limitations');
    expect(limits.getAttribute('aria-describedby')).toBe('card-control-limitations');
    expect(container.querySelector('#card-control-limitations').textContent).toContain('cannot block an actual card or change issuer limits');
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
    expect(container.querySelector('[role="dialog"]').textContent).toContain('transfer');
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
    nav(container, 'Profile');
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
    nav(container, 'Profile');
    clickButton(container, 'Edit profile');
    setInputValue(container.querySelector('input[aria-label="Full Name"]'), '   ');
    clickButton(container, 'Save');
    expect(container.querySelector('#movo-profile-form')).not.toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toContain('Enter your name');
    expect(container.querySelector('h1').textContent).toBe('Profile');
  });

  test('profile, settings, appearance and notification screens are reachable', () => {
    nav(container, 'Profile');
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
    nav(container, 'Profile');
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
    nav(container, 'Profile');
    clickButton(container, 'Settings');
    const privacyRow = Array.from(container.querySelectorAll('button.menu-row')).find(item => item.querySelector('strong')?.textContent === 'Privacy & Data');
    expect(privacyRow).toBeTruthy();
    const before = JSON.parse(window.localStorage.getItem('movo.preferences.v3')).showBalance;
    act(() => privacyRow.click());
    expect(container.querySelector('h1').textContent).toBe('Privacy Policy');
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).showBalance).toBe(before);
  });

  test('theme choices update the app theme and persist preferences', () => {
    nav(container, 'Profile');
    clickButton(container, 'Dark');
    expect(container.querySelector('.movo-app, .theme-dark')).not.toBeNull();
    expect(container.firstChild.className).toContain('theme-dark');
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).theme).toBe('dark');
    clickButton(container, 'purple accent');
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

  test('unsupported notification and device-security settings are disabled', () => {
    nav(container, 'Profile');
    clickButton(container, 'Settings');
    ['Push Notifications', 'Email Notifications', 'Face ID / Touch ID', 'Local Storage', 'Auto Categorization'].forEach(label => {
      const toggle = container.querySelector('button[aria-label="' + label + '"]');
      expect(toggle).toBeTruthy();
      expect(toggle.disabled).toBe(true);
      expect(toggle.getAttribute('aria-checked')).toBe('false');
      const descriptionId = toggle.getAttribute('aria-describedby');
      expect(descriptionId).toBeTruthy();
      expect(container.querySelector('#' + descriptionId)?.textContent.trim()).not.toBe('');
    });
    expect(container.textContent).toContain('no push delivery service is connected');
    expect(container.textContent).toContain('native biometric unlock is not connected');
  });

  test('unavailable notification delivery controls display off and disabled', () => {
    nav(container, 'Profile');
    const notificationSettings = Array.from(container.querySelectorAll('button.menu-row')).find(button => button.querySelector('strong')?.textContent === 'Notifications');
    expect(notificationSettings).toBeTruthy();
    act(() => notificationSettings.click());
    expect(container.textContent).toContain('Notification Channels');
    ['Push Notifications', 'Email Notifications'].forEach(label => {
      const toggle = container.querySelector('button[aria-label="' + label + '"]');
      expect(toggle).toBeTruthy();
      expect(toggle.disabled).toBe(true);
      expect(toggle.getAttribute('aria-checked')).toBe('false');
      const descriptionId = toggle.getAttribute('aria-describedby');
      expect(descriptionId).toBeTruthy();
      expect(container.querySelector('#' + descriptionId)?.textContent.trim()).not.toBe('');
    });
    expect(container.textContent).toContain('Push delivery is not available in this web build.');
    expect(container.textContent).toContain('Email delivery is not connected yet.');
  });

  test('unavailable notification categories explain that only demo events exist', () => {
    nav(container, 'Profile');
    clickButton(container, 'Settings');
    const clearRow = Array.from(container.querySelectorAll('.menu-row')).find(row => row.querySelector('strong')?.textContent === 'Clear Local Data');
    expect(clearRow).toBeTruthy();
    act(() => clearRow.click());
    clickButton(container, 'Clear data');
    nav(container, 'Profile');
    const notificationSettings = Array.from(container.querySelectorAll('button.menu-row')).find(button => button.querySelector('strong')?.textContent === 'Notifications');
    expect(notificationSettings).toBeTruthy();
    act(() => notificationSettings.click());
    ['Account & Security', 'NasrinAI Updates', 'Promotions', 'Reports'].forEach(label => {
      const toggle = container.querySelector('button[aria-label="' + label + '"]');
      expect(toggle).toBeTruthy();
      expect(toggle.disabled).toBe(true);
      const descriptionId = toggle.getAttribute('aria-describedby');
      expect(descriptionId).toBeTruthy();
      expect(container.querySelector('#' + descriptionId)?.textContent.trim()).toMatch(/not connected|sample|demo/i);
      expect(toggle.title).toMatch(/sample\/demo/i);
      expect(toggle.title).not.toContain('delivery method');
    });
  });

  test('Clear Local Data resets preferences and removes local/demo records and sticker artwork without affecting cloud records', () => {
    window.localStorage.setItem('movo.customStickers.v1', JSON.stringify([{ id: 'custom-test', name: 'Test', src: 'data:image/jpeg;base64,AA==', ink: 'light', custom: true }]));
    nav(container, 'Profile');
    clickButton(container, 'Settings');
    const clearRow = Array.from(container.querySelectorAll('.menu-row')).find(row => row.querySelector('strong')?.textContent === 'Clear Local Data');
    expect(clearRow).toBeTruthy();
    act(() => clearRow.click());
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Resets browser preferences to defaults');
    expect(dialog.textContent).toContain('custom sticker artwork');
    expect(dialog.textContent).toContain('Cloud records are not affected');
    clickButton(container, 'Clear data');
    expect(JSON.parse(window.localStorage.getItem('movo.preferences.v3')).theme).toBe('system');
    expect(window.localStorage.getItem('movo.customStickers.v1')).toBeNull();
    nav(container, 'Home');
    expect(container.textContent).not.toContain('SM Supermarket');
  });

  test('turning off in-app alerts hides the notification feed', () => {
    nav(container, 'Profile');
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
    nav(container, 'Profile');
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

  test('NasrinAI opens the private chat and provides a sign-in action in local/demo mode', () => {
    nav(container, 'NasrinAI');
    expect(container.querySelector('h1').textContent).toBe('NasrinAI');
    expect(container.textContent).toContain('Important privacy limitation.');
    expect(container.textContent).toContain('upstream context boundary has not yet been independently verified end to end');
    expect(container.textContent).not.toContain('Your account stays isolated.');
    expect(container.textContent).toContain('Sign in to securely connect your MOVO finances.');
    expect(container.querySelector('textarea#' + 'movo-ai-prompt')).toBeNull();
    clickButton(container, 'Sign in to MOVO');
    expect(container.querySelector('h2').textContent).toBe('Welcome back');
  });

  test('unsupported Plan & Usage is clearly unavailable while Help Center opens useful guidance', () => {
    nav(container, 'Profile');
    clickButton(container, 'Settings');
    const rows = Array.from(container.querySelectorAll('.menu-row'));
    const plan = rows.find(row => row.querySelector('strong')?.textContent === 'Plan & Usage');
    expect(plan).toBeTruthy();
    expect(plan.tagName).toBe('DIV');
    expect(plan.getAttribute('aria-disabled')).toBe('true');
    expect(plan.textContent).toContain('Unavailable');
    expect(plan.textContent).toContain('Billing and token usage are not connected');
    const helpRow = Array.from(container.querySelectorAll('.menu-row')).find(row => row.querySelector('strong')?.textContent === 'Help Center');
    expect(helpRow).toBeTruthy();
    act(() => helpRow.click());
    expect(container.querySelector('h1').textContent).toBe('Help Center');
    expect(container.textContent).toContain('does not move money between banks');
    expect(container.textContent).toContain('persist across reloads in the same browser profile');
    expect(container.textContent).toContain('NasrinAI');
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
    const name = container.querySelector('input[placeholder="e.g. Everyday account"]');
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
    setInputValue(container.querySelector('input[placeholder="e.g. Everyday account"]'), 'Updated Test Card');
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
    const description = container.querySelector('input[placeholder="e.g. Grocery shopping"]');
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
      setInputValue(container.querySelector('input[placeholder="e.g. Grocery shopping"]'), 'Storage warning regression');
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
});
