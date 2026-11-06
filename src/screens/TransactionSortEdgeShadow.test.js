import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Chips } from '../components/ui';

global.IS_REACT_ACT_ENVIRONMENT = true;
const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
const rules = [];
postcss.parse(css).walkRules(rule => rules.push(rule));
const rootRule = selector => rules.filter(r => r.selector === selector && r.parent?.type !== 'atrule').slice(-1)[0];
const decl = (rule, name) => rule?.nodes.find(node => node.type === 'decl' && node.prop === name)?.value;

test('Transactions sort filters disable left/right gradient mask and indicator shadows only', () => {
  const row = rootRule('.movo-app.movo-app .tx-sort-bar > .chip-row');
  expect(decl(row, '-webkit-mask-image')).toBe('none');
  expect(decl(row, 'mask-image')).toBe('none');
  expect(decl(row, 'overflow')).toBe('visible');
  expect(decl(row, 'display')).toBe('grid');
  expect(decl(row, 'grid-template-columns')).toBe('repeat(var(--tx-sort-count, 4), minmax(0, 1fr))');
  const indicator = rootRule('.movo-app.movo-app .tx-sort-bar > .chip-row > .chip-ind');
  expect(decl(indicator, 'box-shadow')).toBe('none');
  const buttons = rootRule('.movo-app.movo-app .tx-sort-bar > .chip-row > button[data-chip]');
  expect(decl(buttons, 'height')).toBe('44px');
  // Shared horizontal scrollers keep their edge fades; the override is local.
  expect(css).toMatch(/\.chip-row, \.card-scroller, \.tx-chips\s*\{[^}]*mask-image: linear-gradient/);
});

test('Transactions sort buttons retain real selection actions and accessibility labels', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const onChange = jest.fn();
  act(() => root.render(<Chips label="Sort transactions" items={['Date', 'Amount', 'Account']} value="Date" onChange={onChange}/>));
  const buttons = [...host.querySelectorAll('button[data-chip]')];
  expect(buttons).toHaveLength(3);
  expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
  expect(host.querySelector('[role="group"]').getAttribute('aria-label')).toBe('Sort transactions');
  act(() => buttons[1].click());
  expect(onChange).toHaveBeenCalledWith('Amount');
  act(() => root.unmount());
  host.remove();
});
