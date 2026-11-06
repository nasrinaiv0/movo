import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Icon from '../components/Icon';

global.IS_REACT_ACT_ENVIRONMENT = true;
const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
const rules = [];
postcss.parse(css).walkRules(rule => rules.push(rule));
const latest = selector => rules.filter(r => r.selector === selector).slice(-1)[0];
const val = (rule, key) => rule?.nodes.find(n => n.type === 'decl' && n.prop === key)?.value;
const wallet = fs.readFileSync(path.join(__dirname, 'Wallet.js'), 'utf8');

test('Wallet card action strip has compact symmetric vertical padding and unchanged four-column layout', () => {
  expect(val(latest('.movo-app.movo-app .action-strip'), 'padding-block')).toBe('8px');
  expect(val(latest('.movo-app.movo-app .action-strip > button'), 'gap')).toBe('5px');
  expect(val(latest('.action-strip'), 'grid-template-columns')).toBe('repeat(4, 1fr)');
  expect(val(latest('.action-strip'), 'margin-bottom')).toBe('12px');
  expect(val(latest('.action-strip button'), 'font-size')).toBe('11px');
});

test('all four existing Wallet card actions render 26px scalable icons with unchanged click actions', () => {
  expect(wallet).toContain('<section className="card action-strip">');
  for (const [icon, label, handler] of [
    ['info', 'View Details', "setSheet({ name: 'cardDetails' })"],
    ['plus', 'Add amount', 'setAddAmount(selectedCard)'],
    ['limits', 'Limits', "c.openBudgets?.('budgets')"],
    ['more', 'More', "setSheet({ name: 'actions' })"]
  ]) {
    expect(wallet).toContain("['" + icon + "', '" + label + "'");
    expect(wallet).toContain(handler);
  }
  expect(wallet).toContain('<Icon name={icon} size={26} />');
  expect(wallet).toContain('key={label} onClick={fn}');
  expect(wallet).not.toContain('<Icon name={icon} size={20} />');
});

test('actual SVG artwork scales to 26px while retaining contrast and shape', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<div>
    {['info', 'plus', 'limits', 'more'].map(icon =>
      <button type="button" key={icon}><Icon name={icon} size={26} /></button>)}
  </div>));
  const icons = [...container.querySelectorAll('button svg')];
  expect(icons).toHaveLength(4);
  for (const svg of icons) {
    expect(svg.getAttribute('width')).toBe('26');
    expect(svg.getAttribute('height')).toBe('26');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.children.length).toBeGreaterThan(0);
  }
  act(() => root.unmount());
});

test('card buttons remain borderless with accessible minimum hit targets', () => {
  expect(css).toContain('.action-strip button, .nav-item');
  expect(css).toContain('min-height: 44px');
  const borderless = latest('.movo-app .action-strip button,\n.movo-app .action-strip button + button');
  expect(borderless).toBeDefined();
  expect(val(borderless, 'border')).toBe('0');
  const compact = latest('.movo-app.movo-app .action-strip');
  expect(val(compact, 'height')).toBeUndefined();
  expect(val(compact, 'width')).toBeUndefined();
});
