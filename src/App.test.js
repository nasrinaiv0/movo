import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

// Keep UI tests deterministic even if deployment has Supabase environment variables.
jest.mock('./lib/supabaseClient', () => ({ supabase: null, supabaseConfigured: false }));
jest.mock('./lib/financeRepository', () => ({
  getCurrentSession: jest.fn().mockResolvedValue(null),
  listAccounts: jest.fn().mockResolvedValue([]),
  listTransactions: jest.fn().mockResolvedValue([]),
  createAccount: jest.fn(),
  createTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  signOut: jest.fn()
}));
import App from './App';

global.IS_REACT_ACT_ENVIRONMENT = true;
function clickButton(container, name) {
  const button = Array.from(container.querySelectorAll('button')).find(item =>
    item.getAttribute('aria-label') === name || item.textContent.trim().includes(name)
  );
  if (!button) throw new Error('Button not found: ' + name);
  act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  return button;
}
describe('MOVO reference-screen frontend', () => {
  let container;
  let root;
  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<App />));
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.localStorage.clear();
  });

  test('renders the dashboard with sample data and five-item navigation', () => {
    expect(container.querySelector('h1').textContent).toContain('Your money, in motion');
    expect(container.querySelector('[aria-label="Financial summary"]')).not.toBeNull();
    expect(container.querySelectorAll('.bottom-nav .nav-item')).toHaveLength(5);
    expect(container.textContent).toContain('Recent transactions');
    expect(container.textContent).toContain('SM Supermarket');
    expect(container.textContent).toContain('Netflix');
  });

  test('privacy toggle hides and restores the displayed balance', () => {
    const toggle = container.querySelector('[aria-label="Hide balances"]');
    expect(toggle).not.toBeNull();
    expect(container.textContent).toContain('₱45,982.00');
    clickButton(container, 'Hide balances');
    expect(container.textContent).toContain('₱ ••••••••');
    expect(container.textContent).not.toContain('₱45,982.00');
    clickButton(container, 'Show balances');
    expect(container.textContent).toContain('₱45,982.00');
  });

  test('opens and closes the transaction form', () => {
    clickButton(container, 'Add transaction');
    expect(container.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
    clickButton(container, 'Close transaction form');
    expect(container.querySelector('[role="dialog"][aria-modal="true"]')).toBeNull();
  });

  test('navigates between wallet, transactions, profile and settings', () => {
    clickButton(container, 'Wallet');
    expect(container.querySelector('h1').textContent).toBe('Wallet');
    expect(container.querySelector('[aria-label="Filter wallet accounts"]')).not.toBeNull();

    clickButton(container, 'Transactions');
    expect(container.querySelector('h1').textContent).toBe('Transactions');
    expect(container.querySelector('[aria-label="Filter transactions"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Delete SM Supermarket"]')).not.toBeNull();

    clickButton(container, 'Profile');
    expect(container.querySelector('h1').textContent).toBe('Profile');
    clickButton(container, 'Appearance & preferences');
    expect(container.querySelector('h1').textContent).toBe('Settings');
    expect(container.textContent).toContain('Privacy & Security');
  });

  test('search filters transaction records', () => {
    clickButton(container, 'Transactions');
    const input = container.querySelector('[aria-label="Filter transactions"]');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Netflix');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.textContent).toContain('Netflix');
    expect(container.textContent).not.toContain('SM Supermarket');
  });

  test('settings include theme, notifications and privacy controls', () => {
    clickButton(container, 'Settings');
    expect(container.querySelector('h1').textContent).toBe('Settings');
    expect(container.textContent).toContain('Theme');
    expect(container.textContent).toContain('Push Notifications');
    expect(container.textContent).toContain('Face ID / Touch ID');
    expect(container.textContent).toContain('Cloud Sync');
  });

  test('notifications screen supports category filters and mark-all-read', () => {
    clickButton(container, 'Appearance settings');
    expect(container.querySelector('h1').textContent).toBe('Notifications');
    clickButton(container, 'Unread');
    clickButton(container, 'Mark all as read');
    expect(container.textContent).toContain('Payment Successful');
  });
});
