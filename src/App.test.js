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
  createTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  signOut: jest.fn(),
}));
import App from './App';

global.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = jest.fn();
function clickButton(container, name) {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.getAttribute('aria-label') === name || item.textContent.trim() === name);
  if (!button) throw new Error('Button not found: ' + name);
  act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  return button;
}
const nav = (container, name) => {
  const button = Array.from(container.querySelectorAll('.bottom-nav .nav-item')).find(item => item.textContent.trim() === name);
  act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};

describe('MOVO finance frontend', () => {
  let container; let root;
  beforeEach(() => { window.localStorage.clear(); container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); act(() => root.render(<App />)); });
  afterEach(() => { act(() => root.unmount()); container.remove(); window.localStorage.clear(); });

  test('renders the home dashboard from the design: balance, summary, spending and recent activity', () => {
    expect(container.querySelector('h1').textContent).toContain('Nasrin');
    expect(container.textContent).toContain('₱128,450.00');
    expect(container.querySelector('[aria-label="Financial summary"]')).not.toBeNull();
    expect(container.textContent).toContain('₱85,000');
    expect(container.textContent).toContain('₱42,350');
    expect(container.textContent).toContain('Spending This Month');
    expect(container.textContent).toContain('Recent Transactions');
    ['Food', 'Shopping', 'Bills', 'Transportation', 'Others'].forEach(label => expect(container.textContent).toContain(label));
    expect(container.querySelectorAll('.bottom-nav .nav-item')).toHaveLength(5);
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

  test('wallet transfer actions open a transfer form rather than an expense form', () => {
    nav(container, 'Wallet');
    clickButton(container, 'Record Transfer');
    const dialog = container.querySelector('[role="dialog"][aria-label="Add transaction"]');
    expect(dialog).not.toBeNull();
    const transfer = Array.from(dialog.querySelectorAll('button')).find(item => item.textContent.trim() === 'Transfer');
    expect(transfer.getAttribute('aria-pressed')).toBe('true');
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

  test('profile, settings, appearance and notification screens are reachable', () => {
    nav(container, 'Profile');
    expect(container.querySelector('h1').textContent).toBe('Profile');
    expect(container.textContent).toContain('Data & Sync');
    clickButton(container, 'Settings');
    expect(container.querySelector('h1').textContent).toBe('Settings');
    clickButton(container, 'Back');
    clickButton(container, 'Notifications');
    expect(container.querySelector('h1').textContent).toBe('Notifications');
    expect(container.textContent).toContain('Expense Recorded');
  });

  test('Terms of Service and Privacy Policy are reachable and cross-linked', () => {
    nav(container, 'Profile');
    clickButton(container, 'Terms of Service');
    expect(container.querySelector('h1').textContent).toBe('Terms of Service');
    expect(container.textContent).toContain('Effective date: October 29, 2026');
    clickButton(container, 'Privacy Policy');
    expect(container.querySelector('h1').textContent).toBe('Privacy Policy');
    expect(container.textContent).toContain('Data Privacy Act of 2012');
    expect(container.textContent).toContain('legal name and registered address of the MOVO data controller are not yet displayed');
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

  test('search from Home opens the search sheet and shows filtered transaction results', () => {
    clickButton(container, 'Search');
    const input = container.querySelector('[aria-label="Filter transactions"]');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Netflix');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    clickButton(container, 'Show results');
    expect(container.querySelector('h1').textContent).toBe('Transactions');
    expect(container.textContent).toContain('Netflix');
    expect(container.textContent).not.toContain('Puregold');
  });

  test('unsupported notification and device-security settings are disabled', () => {
    nav(container, 'Profile');
    clickButton(container, 'Settings');
    ['Push Notifications', 'Email Notifications', 'Face ID / Touch ID', 'Local Storage', 'Auto Categorization'].forEach(label => {
      const toggle = container.querySelector('button[aria-label="' + label + '"]');
      expect(toggle).toBeTruthy();
      expect(toggle.disabled).toBe(true);
    });
    expect(container.textContent).toContain('no push delivery service is connected');
    expect(container.textContent).toContain('native biometric unlock is not connected');
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

  test('transaction search filters records', () => {
    nav(container, 'Transactions');
    clickButton(container, 'Search');
    const input = container.querySelector('[aria-label="Filter transactions"]');
    act(() => { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(input, 'Netflix'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    clickButton(container, 'Show results');
    expect(container.textContent).toContain('Netflix');
    expect(container.textContent).not.toContain('Puregold');
  });

  test('NasrinAI opens the private chat and provides a sign-in action in local/demo mode', () => {
    nav(container, 'NasrinAI');
    expect(container.querySelector('h1').textContent).toBe('NasrinAI');
    expect(container.textContent).toContain('Your account stays isolated.');
    expect(container.textContent).toContain('Sign in to securely connect your MOVO finances.');
    expect(container.querySelector('textarea#' + 'movo-ai-prompt')).toBeNull();
    clickButton(container, 'Sign in to MOVO');
    expect(container.querySelector('h2').textContent).toBe('Welcome back');
  });

  test('unsupported Plan & Usage and Help Center rows are clearly unavailable, not dead navigation buttons', () => {
    nav(container, 'Profile');
    clickButton(container, 'Settings');
    const rows = Array.from(container.querySelectorAll('.menu-row'));
    const plan = rows.find(row => row.querySelector('strong')?.textContent === 'Plan & Usage');
    const help = rows.find(row => row.querySelector('strong')?.textContent === 'Help Center');
    expect(plan).toBeTruthy();
    expect(plan.tagName).toBe('DIV');
    expect(plan.getAttribute('aria-disabled')).toBe('true');
    expect(plan.textContent).toContain('Unavailable');
    expect(plan.textContent).toContain('Billing and token usage are not connected');
    expect(help).toBeTruthy();
    expect(help.tagName).toBe('DIV');
    expect(help.textContent).toContain('Unavailable');
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
});
