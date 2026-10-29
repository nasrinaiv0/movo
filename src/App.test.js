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
    clickButton(container, 'Filters and actions');
    clickButton(container, 'Add transaction');
    expect(container.querySelector('[role="dialog"][aria-label="Add transaction"]')).not.toBeNull();
    clickButton(container, 'Close Add transaction');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  test('profile, settings, appearance and notification screens are reachable', () => {
    nav(container, 'Profile');
    expect(container.querySelector('h1').textContent).toBe('Profile');
    expect(container.textContent).toContain('Data & Sync');
    expect(container.querySelector('a[href="/terms.html"]')?.textContent).toContain('Terms of Service');
    expect(container.querySelector('a[href="/privacy.html"]')?.textContent).toContain('Privacy Policy');
    clickButton(container, 'Settings');
    expect(container.querySelector('h1').textContent).toBe('Settings');
    expect(container.textContent).toContain('Terms of Service');
    expect(container.textContent).toContain('Privacy Policy');
    clickButton(container, 'Back');
    clickButton(container, 'Notifications');
    expect(container.querySelector('h1').textContent).toBe('Notifications');
    expect(container.textContent).toContain('Payment Successful');
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

  test('transaction search filters records', () => {
    nav(container, 'Transactions');
    clickButton(container, 'Search');
    const input = container.querySelector('[aria-label="Filter transactions"]');
    act(() => { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(input, 'Netflix'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    clickButton(container, 'Show results');
    expect(container.textContent).toContain('Netflix');
    expect(container.textContent).not.toContain('Puregold');
  });

  test('NasrinAI opens the private chat and blocks local/demo sessions', () => {
    nav(container, 'NasrinAI');
    expect(container.querySelector('h1').textContent).toBe('NasrinAI');
    expect(container.textContent).toContain('Your account stays isolated.');
    expect(container.textContent).toContain('Sign in to securely connect your MOVO finances.');
    expect(container.querySelector('textarea#' + 'movo-ai-prompt')).toBeNull();
  });
});
