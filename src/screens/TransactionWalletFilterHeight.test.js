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
const rule = selector => rules.filter(r => r.selector === selector && r.parent?.type !== 'atrule').slice(-1)[0];
const prop = (r, name) => r?.nodes.find(node => node.type === 'decl' && node.prop === name)?.value;

describe('40px Wallet / Transactions filter heights', () => {
  test.each([
    ['Transactions type chips', '.movo-app.movo-app .tx-chip-bar > .chip-row > button[data-chip]'],
    ['Transactions billing-cycle selector', '.movo-app.movo-app .tx-chip-bar > .tx-period-filter'],
    ['Transactions sort chips', '.movo-app.movo-app .tx-sort-bar > .chip-row > button[data-chip]'],
    ['Wallet account type chips', '.movo-app.movo-app .wallet-chip-bar > .chip-row > button[data-chip]'],
    ['Wallet quick filter action', '.movo-app .wallet-chip-bar > .round-button'],
    ['Wallet sort options', '.movo-app .wallet-sort-row > .wallet-sort-option'],
    ['Wallet layout options', '.movo-app .wallet-view-control > button'],
  ])('%s has exactly 40px height and minimum height', (name, selector) => {
    const found = rule(selector);
    expect(found).toBeTruthy();
    expect(prop(found, 'height')).toBe('40px');
    expect(prop(found, 'min-height')).toBe('40px');
  });

  test('narrow Transactions type and cycle controls stay 40px without changing widths', () => {
    const compact = rules.filter(r => r.selector === '.movo-app.movo-app .tx-chip-bar > .tx-period-filter' && r.parent?.params === '(max-width: 390px)')[0];
    expect(prop(compact, 'height')).toBe('40px');
    expect(prop(compact, 'width')).toBe('60px');
    const chips = rules.filter(r => r.selector === '.movo-app.movo-app .tx-chip-bar > .chip-row > button[data-chip]' && r.parent?.params === '(max-width: 390px)')[0];
    expect(prop(chips, 'height')).toBe('40px');
  });

  test('existing selected-pill shadow removal and scroller mask behavior remain intact', () => {
    const sortRow = rule('.movo-app.movo-app .tx-sort-bar > .chip-row');
    expect(prop(sortRow, 'mask-image')).toBe('none');
    expect(prop(sortRow, '-webkit-mask-image')).toBe('none');
    const indicator = rule('.movo-app.movo-app .tx-sort-bar > .chip-row > .chip-ind');
    expect(prop(indicator, 'box-shadow')).toBe('none');
    expect(css).toContain('.chip-row, .card-scroller, .tx-chips');
  });

  test('Wallet selection still emits the chosen filter while keeping its accessible label', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const setFilter = jest.fn();
    act(() => root.render(
      <div className="chip-bar wallet-chip-bar">
        <Chips label="Filter wallet accounts" items={['All', 'Cards', 'Banks', 'E-Wallets', 'Others']} value="All" onChange={setFilter} />
      </div>
    ));
    const buttons = [...host.querySelectorAll('button[data-chip]')];
    expect(buttons).toHaveLength(5);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[role="group"]').getAttribute('aria-label')).toBe('Filter wallet accounts');
    act(() => buttons[2].click());
    expect(setFilter).toHaveBeenCalledWith('Banks');
    act(() => root.unmount());
    host.remove();
  });
});
