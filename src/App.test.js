import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

global.IS_REACT_ACT_ENVIRONMENT = true;

function clickButton(container, name) {
  const button = Array.from(container.querySelectorAll('button')).find((item) => item.getAttribute('aria-label') === name || item.textContent.trim().includes(name));
  if (!button) throw new Error(`Button not found: ${name}`);
  act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  return button;
}

describe('MOVO Phase 1 Home', () => {
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

  test('renders the Home dashboard and five-item navigation', () => {
    expect(container.querySelector('h1').textContent).toContain('Good morning');
    expect(container.querySelector('[aria-label="Financial summary"]')).not.toBeNull();
    expect(container.querySelectorAll('.bottom-nav .nav-item')).toHaveLength(5);
    expect(container.textContent).toContain('Spending overview');
    expect(container.textContent).toContain('Recent transactions');
  });

  test('hides financial amounts when the privacy toggle is activated', () => {
    expect(container.textContent).toContain('₱50,000.00');
    clickButton(container, 'Hide balances');
    expect(container.textContent).toContain('₱ ••••••••');
    expect(container.textContent).not.toContain('₱50,000.00');
  });

  test('opens the transaction form and applies a saved theme preference', () => {
    clickButton(container, 'Add a record');
    expect(container.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
    clickButton(container, 'Close transaction form');
    clickButton(container, 'Settings and appearance');
    clickButton(container, 'Switch to dark mode');
    expect(container.querySelector('.movo-app').classList.contains('theme-dark')).toBe(true);
    expect(window.localStorage.getItem('movo.phase1.theme.v1')).toBe('true');
  });

  test('shows the transaction view and exposes delete controls for records', () => {
    clickButton(container, 'Transactions');
    expect(container.textContent).toContain('searchable here');
    expect(container.querySelectorAll('.panel-transaction')).toHaveLength(4);
    expect(container.querySelector('[aria-label="Delete SM Supermarket"]')).not.toBeNull();
  });
});
