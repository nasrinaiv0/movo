import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import LoyaltySheet from './LoyaltySheet';

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('./Icon', () => ({ __esModule: true, default: () => null }));
jest.mock('./ui', () => {
  const React = require('react');
  return { Sheet: ({ children, title }) => React.createElement('div', { role: 'dialog', 'aria-label': title }, children) };
});

async function setup(type = 'membership', existing) {
  const node = document.createElement('div');
  document.body.appendChild(node);
  const root = createRoot(node);
  const onSave = jest.fn();
  const onRemove = jest.fn();
  await act(async () => root.render(<LoyaltySheet key={existing?.id || type} existing={existing} initialType={type} onSave={onSave} onRemove={onRemove} onClose={jest.fn()} />));
  return { node, root, onSave, onRemove, async cleanup() { await act(async () => root.unmount()); node.remove(); } };
}

test('loyalty membership editor lists providers, shows points and never financial balance', async () => {
  const ui = await setup();
  expect(ui.node.querySelector('option[value="Petron"]')).not.toBeNull();
  expect(ui.node.querySelector('option[value="Seaoil"]')).not.toBeNull();
  expect(ui.node.querySelector('option[value="Starbucks"]')).not.toBeNull();
  expect(ui.node.querySelector('option[value="Tim Hortons"]')).not.toBeNull();
  expect(ui.node.querySelector('input[aria-label="Rewards balance"]')).not.toBeNull();
  expect(ui.node.textContent).toContain('never increase your wallet balance');
  expect(ui.node.querySelector('input[placeholder*="Starting balance"]')).toBeNull();
  await ui.cleanup();
});

test('token editor retains token units and saving never emits a financial account', async () => {
  const ui = await setup('tokens', { id: 'loyal-1', type: 'tokens', name: 'Starbucks', points: '14', pointsUnit: 'stamps', memberNumber: '123456' });
  expect(ui.node.querySelector('select[aria-label="Unit"]').value).toBe('stamps');
  await act(async () => ui.node.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(ui.onSave).toHaveBeenCalledWith(expect.objectContaining({ type: 'tokens', name: 'Starbucks', points: '14', pointsUnit: 'stamps' }));
  await ui.cleanup();
});

test('other merchant option reveals editable custom provider name', async () => {
  const ui = await setup();
  const select = ui.node.querySelector('select[aria-label="Brand / provider"]');
  await act(async () => {
    select.value = 'Other';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(ui.node.querySelector('input[aria-label="Custom provider name"]')).not.toBeNull();
  expect(ui.node.querySelector('select[aria-label="Brand / provider"]').value).toBe('Other');
  await ui.cleanup();
});

test('Other card type exposes required editable type and provider', async () => {
  const ui = await setup('other');
  const type = ui.node.querySelector('input[aria-label="Custom card type"]');
  expect(type.required).toBe(true);
  expect(type.placeholder).toContain('Enter card type if not listed');
  expect(ui.node.querySelector('option[value="rewards"]')).not.toBeNull();
  expect(ui.node.querySelector('option[value="loyalty"]')).not.toBeNull();
  await act(async () => { type.value = 'Employee benefits'; type.dispatchEvent(new Event('input', { bubbles: true })); });
  await ui.cleanup();
});
