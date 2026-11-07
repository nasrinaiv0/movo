import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Settings from './Settings';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('Settings toggle controls balance-after display only and defaults to on', () => {
  const rootEl = document.createElement('div');
  document.body.appendChild(rootEl);
  const root = createRoot(rootEl);
  const setPref = jest.fn();
  const c = { prefs: { theme: 'system', showBalanceAfterTransaction: true }, setPref,
    query: '', setQuery: jest.fn(), go: jest.fn(), cloudMode: false };
  act(() => root.render(<Settings c={c} />));
  const row = [...rootEl.querySelectorAll('.menu-row')]
    .find(node => node.textContent.includes('Show balance after each transaction'));
  expect(row).toBeTruthy();
  expect(row.querySelector('[role="switch"]').getAttribute('aria-checked')).toBe('true');
  act(() => row.querySelector('[role="switch"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(setPref).toHaveBeenCalledWith('showBalanceAfterTransaction', false);
  expect(setPref).not.toHaveBeenCalledWith('autoLog', expect.anything());
  act(() => root.unmount());
  rootEl.remove();
});
