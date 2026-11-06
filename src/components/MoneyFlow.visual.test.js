import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import MoneyFlow from './MoneyFlow';

global.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
const txs = [
  { id: 'in-1', date: '2026-10-28T10:00:00+08:00', type: 'income', amount: 1234.56 },
  { id: 'out-1', date: '2026-10-28T11:00:00+08:00', type: 'expense', amount: 234.78 }
];
const props = { txs, refDate: new Date('2026-10-28T15:00:00+08:00'), show: true };
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

test('Money Flow bars render two micro-dots for empty days, not fake zero-height bars', () => {
  act(() => root.render(<MoneyFlow {...props} variant="bars" />));
  const card = host.querySelector('.flow-card-bars');
  const columns = [...card.querySelectorAll('.flow-plot.is-bars .flow-col')];
  expect(columns).toHaveLength(14);
  const empty = columns[0];
  expect(empty.querySelectorAll('.flow-zero-dot')).toHaveLength(2);
  expect(empty.querySelector('.flow-zero-dot.in').getAttribute('data-zero-value')).toBe('income');
  expect(empty.querySelector('.flow-zero-dot.out').getAttribute('data-zero-value')).toBe('expense');
  expect(empty.querySelector('.flow-value-bar')).toBeNull();
  const paid = columns[13];
  expect(paid.querySelectorAll('.flow-value-bar')).toHaveLength(2);
  expect(paid.querySelector('.flow-zero-dot')).toBeNull();
  expect(paid.querySelector('.flow-value-bar.in').getAttribute('style')).toContain('height: 100%');
  expect(paid.querySelector('.flow-value-bar.out').getAttribute('style')).toContain('height:');
});

test('selection still changes the Money Flow totals and has a keyboard-compatible button', () => {
  act(() => root.render(<MoneyFlow {...props} variant="bars" />));
  const columns = [...host.querySelectorAll('.flow-col')];
  expect(columns[13].tagName).toBe('BUTTON');
  expect(columns[13].getAttribute('aria-label')).toContain('1235');
  act(() => columns[13].click());
  expect(columns[13].classList.contains('on')).toBe(true);
  act(() => columns[13].click());
  expect(columns[13].classList.contains('on')).toBe(false);
});

test('line and net variants preserve existing graphs without the new bar-only layout', () => {
  act(() => root.render(<MoneyFlow {...props} variant="lines" />));
  expect(host.querySelector('.flow-card-bars')).toBeNull();
  expect(host.querySelector('.flow-lines')).not.toBeNull();
  expect(host.querySelector('.flow-zero-dot')).toBeNull();
  act(() => root.render(<MoneyFlow {...props} variant="net" />));
  expect(host.querySelector('.flow-card-bars')).toBeNull();
  expect(host.querySelector('.flow-net-col')).not.toBeNull();
  expect(host.querySelector('.flow-zero-dot')).toBeNull();
});
