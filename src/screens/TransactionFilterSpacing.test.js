import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Chips } from '../components/ui';
import { billingCycleOptions, sortList } from './Transactions';

global.IS_REACT_ACT_ENVIRONMENT = true;
const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
const rules = [];
postcss.parse(css).walkRules(rule => rules.push(rule));
const rule = selector => rules.filter(r => r.selector === selector && r.parent?.type !== 'atrule').slice(-1)[0];
const mediaRule = (selector, media) => rules.find(r => r.selector === selector && r.parent?.params === media);
const prop = (r, key) => r?.nodes.find(n => n.type === 'decl' && n.prop === key)?.value;

test('transaction type chips and billing-cycle selector share even horizontal spacing and a 16px lower gap', () => {
  const bar = rule('.movo-app.movo-app .tx-chip-bar');
  expect(prop(bar, 'gap')).toBe('8px');
  expect(prop(bar, 'margin')).toBe('0 0 16px');
  const row = rule('.movo-app.movo-app .tx-chip-bar > .chip-row');
  expect(prop(row, 'margin')).toBe('0');
  expect(prop(row, 'padding')).toBe('0');
  expect(prop(row, 'gap')).toBe('6px');
  expect(prop(row, 'overflow')).toBe('hidden');
  const selector = rule('.movo-app.movo-app .tx-chip-bar > .tx-period-filter');
  expect(prop(selector, 'margin')).toBe('0');
  expect(prop(selector, 'width')).toBe('72px');
  const chips = rule('.movo-app.movo-app .tx-chip-bar > .chip-row > button[data-chip]');
  expect(prop(chips, 'height')).toBe('40px');
  expect(prop(chips, 'flex')).toBe('1 1 0');
});

test('sorting filters distribute evenly and leave space above list and group headers', () => {
  const wrap = rule('.movo-app.movo-app .tx-sort-bar');
  expect(prop(wrap, 'margin')).toBe('0 0 16px');
  const row = rule('.movo-app.movo-app .tx-sort-bar > .chip-row');
  expect(prop(row, 'display')).toBe('grid');
  expect(prop(row, 'grid-template-columns')).toBe('repeat(var(--tx-sort-count, 4), minmax(0, 1fr))');
  expect(prop(row, 'gap')).toBe('8px');
  expect(prop(row, 'margin')).toBe('0');
  expect(prop(row, 'padding')).toBe('0');
  const button = rule('.movo-app.movo-app .tx-sort-bar > .chip-row > button[data-chip]');
  expect(prop(button, 'width')).toBe('100%');
  expect(prop(button, 'min-width')).toBe('0');
  expect(prop(button, 'height')).toBe('40px');
  const source = fs.readFileSync(path.join(__dirname, 'Transactions.js'), 'utf8');
  expect(source).toContain('className="tx-sort-bar"');
  expect(source).toContain("'--tx-sort-count': sorts.length");
  expect(source).toContain("txFilter !== 'All'");
});

test('narrow screens retain their responsive top and sort spacing without shrinking hit targets', () => {
  const query = '(max-width: 390px)';
  const gap = mediaRule('.movo-app.movo-app .tx-chip-bar', query);
  const period = mediaRule('.movo-app.movo-app .tx-chip-bar > .tx-period-filter', query);
  const sort = mediaRule('.movo-app.movo-app .tx-sort-bar > .chip-row', query);
  expect(prop(gap, 'gap')).toBe('6px');
  expect(prop(period, 'width')).toBe('60px');
  expect(prop(period, 'height')).toBe('40px');
  expect(prop(sort, 'gap')).toBe('6px');
  expect(prop(mediaRule('.movo-app.movo-app .tx-chip-bar > .chip-row > button[data-chip]', query), 'min-height')).toBe('40px');
});

test('sort controls still change selection and keep accessible button labels', () => {
  const target = document.createElement('div');
  const root = createRoot(target);
  const choose = jest.fn();
  act(() => root.render(<div className="tx-sort-bar"><Chips
    items={['Date', 'Amount', 'From/To', 'Account']} value="Account"
    onChange={choose} label="Sort transactions"
  /></div>));
  const controls = [...target.querySelectorAll('button[data-chip]')];
  expect(controls).toHaveLength(4);
  expect(controls[3].getAttribute('aria-pressed')).toBe('true');
  expect(controls[3].textContent).toBe('Account');
  act(() => controls[0].click());
  expect(choose).toHaveBeenCalledWith('Date');
  act(() => root.unmount());
});

test('filter spacing has no effect on billing-cycle and sort calculations', () => {
  expect(billingCycleOptions(['2026-11', '2026-10'], '2026-11').map(x => x.label))
    .toEqual(['All', 'Present', 'Oct']);
  expect(sortList([
    { merchant: 'Z', accountName: 'BPI', transferToAccountName: 'Cash' },
    { merchant: 'A', accountName: 'GCash', transferToAccountName: 'Bank' }
  ], 'Account').map(x => x.merchant)).toEqual(['Z', 'A']);
});
