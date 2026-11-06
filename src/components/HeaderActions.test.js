import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RootHeader } from './ui';
global.IS_REACT_ACT_ENVIRONMENT = true;
test('groups utility actions, keeps Plus separate, and preserves click handlers and unread badge', () => {
  const el = document.createElement('div'); const root = createRoot(el);
  const onSearch = jest.fn(), onAdd = jest.fn(), onBell = jest.fn();
  act(() => root.render(<RootHeader title="Wallet" headerActions={[
    { icon: 'search', label: 'Search', onClick: onSearch },
    { icon: 'bell', label: 'Notifications', onClick: onBell, dot: true },
    { icon: 'plus', label: 'Add', onClick: onAdd },
  ]} />));
  expect(el.querySelectorAll('.header-utility-group button')).toHaveLength(2);
  expect(el.querySelector('.header-utility-group .red-dot')).not.toBeNull();
  expect(el.querySelector('.header-add-action').parentElement.className).toBe('header-actions');
  act(() => { el.querySelector('[aria-label="Search"]').click(); el.querySelector('[aria-label="Add"]').click(); el.querySelector('[aria-label="Notifications"]').click(); });
  expect(onSearch).toHaveBeenCalledTimes(1); expect(onAdd).toHaveBeenCalledTimes(1); expect(onBell).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});
