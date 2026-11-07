import Icon from './Icon';
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


test('page-specific wallet edit and quick action icons inherit adaptive currentColor', () => {
  const el = document.createElement('div'); const root = createRoot(el);
  act(() => root.render(<div>
    <Icon name="walletHeaderEdit" size={21} />
    <Icon name="quickActionShare" size={21} />
  </div>));
  const icons = Array.from(el.querySelectorAll('svg'));
  expect(icons).toHaveLength(2);
  icons.forEach(icon => {
    expect(icon.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(icon.outerHTML).toContain('currentColor');
    expect(icon.outerHTML).not.toMatch(/(?:#1e1e1e|#fff|#000)/i);
  });
  act(() => root.unmount());
});


test('Cashback and Scheduled headers have a back action to their Menu parent', () => {
  const fs = require('fs'); const path = require('path');
  const cashback = fs.readFileSync(path.join(__dirname, '..', 'screens', 'Cashback.js'), 'utf8');
  const scheduled = fs.readFileSync(path.join(__dirname, '..', 'screens', 'ScheduledTransactions.js'), 'utf8');
  expect(cashback).toContain("onBack={() => c.go('Menu')}");
  expect(scheduled).toContain("onBack={() => go('Menu')}");
  expect(cashback).toContain('onSearch={c.openSearch}');
  expect(scheduled).toContain("action={{icon:'plus'");
});

test('RootHeader Back retains title, utility actions and accessible callback', () => {
  const onBack = jest.fn(), onSearch = jest.fn();
  const target = document.createElement('div');
  const root = createRoot(target);
  act(() => root.render(<RootHeader title="Cashback" onBack={onBack} onSearch={onSearch} />));
  const head = target.querySelector('header.screen-header.root.has-back');
  expect(head.querySelector('.title-block h1').textContent).toBe('Cashback');
  expect(head.querySelectorAll('.header-utility-group button')).toHaveLength(1);
  const button = head.querySelector('button.back-button');
  expect(button.getAttribute('aria-label')).toBe('Back');
  act(() => button.click());
  expect(onBack).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});

test('RootHeader leaves unrelated root screens free of extra Back controls', () => {
  const target = document.createElement('div');
  const root = createRoot(target);
  act(() => root.render(<RootHeader title="Home" />));
  expect(target.querySelector('.back-button')).toBeNull();
  act(() => root.unmount());
});
