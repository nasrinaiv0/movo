import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

global.IS_REACT_ACT_ENVIRONMENT = true;
function clickButton(container, name) {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.getAttribute('aria-label') === name || item.textContent.trim().includes(name));
  if (!button) throw new Error('Button not found: ' + name);
  act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  return button;
}
describe('MOVO finance frontend', () => {
  let container; let root;
  beforeEach(() => { window.localStorage.clear(); container=document.createElement('div'); document.body.appendChild(container); root=createRoot(container); act(()=>root.render(<App/>)); });
  afterEach(() => { act(()=>root.unmount()); container.remove(); window.localStorage.clear(); });
  test('renders dashboard, financial summary, spending overview, and five-item navigation', () => {
    expect(container.querySelector('h1').textContent).toContain('Your money');
    expect(container.querySelector('[aria-label="Financial summary"]')).not.toBeNull();
    expect(container.querySelectorAll('.bottom-nav .nav-item')).toHaveLength(5);
    expect(container.textContent).toContain('Spending overview');
    expect(container.textContent).toContain('Recent transactions');
  });
  test('privacy toggle hides displayed balances', () => {
    expect(container.textContent).toContain('₱50,000.00');
    clickButton(container, 'Hide balances');
    expect(container.textContent).toContain('₱ ••••••••');
    expect(container.textContent).not.toContain('₱50,000.00');
  });
  test('opens and closes the transaction form', () => {
    clickButton(container, 'Add transaction');
    expect(container.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
    clickButton(container, 'Close transaction form');
    expect(container.querySelector('[role="dialog"][aria-modal="true"]')).toBeNull();
  });
  test('navigates to wallet, transactions, profile, and settings views', () => {
    clickButton(container, 'Wallet');
    expect(container.querySelector('h1').textContent).toBe('Wallet');
    clickButton(container, 'Transactions');
    expect(container.querySelector('h1').textContent).toBe('Transactions');
    expect(container.querySelector('[aria-label="Filter transactions"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Delete SM Supermarket"]')).not.toBeNull();
    clickButton(container, 'Profile');
    expect(container.querySelector('h1').textContent).toBe('Profile');
    clickButton(container, 'Appearance & preferences');
    expect(container.querySelector('h1').textContent).toBe('Settings');
  });
  test('search filters transaction records and can be cleared', () => {
    clickButton(container, 'Transactions');
    const input=container.querySelector('[aria-label="Filter transactions"]');
    act(()=>{ const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(input,'Netflix'); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); });
    expect(container.textContent).toContain('Netflix');
    expect(container.textContent).not.toContain('SM Supermarket');
  });
});
