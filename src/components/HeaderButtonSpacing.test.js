import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RootHeader } from './ui';

global.IS_REACT_ACT_ENVIRONMENT = true;
const style = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
const rules = [];
postcss.parse(style).walkRules(rule => rules.push(rule));
const own = sel => rules.filter(rule => rule.selector === sel).slice(-1)[0];
const prop = (rule, name) => rule?.nodes.find(node => node.type === 'decl' && node.prop === name)?.value;

test('Home pill and shared utility capsule use zero inset and preserve 4px spacing', () => {
  const shared = '.movo-app.movo-app.movo-app .screen-header .header-utility-group,\n.movo-app.movo-app.movo-app .screen-header.home-header .home-utility-pill';
  const group = own(shared);
  expect(group).toBeDefined();
  expect(prop(group, 'padding')).toBe('0');
  expect(prop(group, 'gap')).toBe('4px');
  expect(prop(group, 'min-height')).toBe('45px');
  expect(prop(group, 'align-items')).toBe('center');
});

test('all grouped utility actions have equal 45px touch targets and centered 22px icons', () => {
  // Identify the new geometry rule by its dimensions, not unrelated icon colors.
  const found = rules.find(rule => rule.selector.includes('.header-utility-group > .round-button') &&
    rule.selector.includes('.home-utility-pill > .home-header-action') && prop(rule, 'width') === '45px');
  expect(found).toBeDefined();
  expect(prop(found, 'height')).toBe('45px');
  expect(prop(found, 'padding')).toBe('0');
  expect(prop(found, 'margin')).toBe('0');
  const icons = rules.find(rule => rule.selector.includes('.header-utility-group > .round-button > :is(') &&
    rule.selector.includes('.home-utility-pill > .home-header-action > :is('));
  expect(prop(icons, 'width')).toBe('22px');
  expect(prop(icons, 'height')).toBe('22px');
  expect(prop(icons, 'justify-self')).toBe('center');
});

test('every header control uses 0.5px padding without changing button or icon dimensions', () => {
  const rule = rules.find(item => item.selector.includes('movo-app.movo-app.movo-app.movo-app.movo-app.movo-app') &&
    item.selector.includes('.screen-header') && item.selector.includes('.sheet-header') &&
    item.selector.includes('.modal-header') && item.selector.includes('input[type="reset"]') &&
    prop(item, 'padding') === '0.5px');
  expect(rule).toBeDefined();
  expect(rule.nodes.find(node => node.prop === 'padding').important).toBe(true);
  ['width', 'height', 'min-width', 'min-height', 'gap', 'font-size'].forEach(name => {
    expect(prop(rule, name)).toBeUndefined();
  });
  const group = rules.find(item => item.selector.includes('.header-utility-group') &&
    item.selector.includes('.home-utility-pill') && prop(item, 'padding') === '0');
  expect(group).toBeDefined();
  const icons = rules.find(item => item.selector.includes('.header-utility-group > .round-button > :is('));
  expect(prop(icons, 'width')).toBe('22px');
  expect(prop(icons, 'height')).toBe('22px');
});

test('all grouped header buttons override 0.5px global header insets without altering standalone actions', () => {
  const global = rules.findIndex(rule => rule.selector.includes('movo-app.movo-app.movo-app.movo-app.movo-app.movo-app') &&
    rule.selector.includes('.sheet-header') && prop(rule, 'padding') === '0.5px');
  const override = rules.findIndex(rule => rule.selector.includes('.header-utility-group > .round-button') &&
    rule.selector.includes('.home-utility-pill > .home-header-action') &&
    rule.selector.includes('movo-app.movo-app.movo-app.movo-app.movo-app.movo-app') &&
    prop(rule, 'padding') === '0');
  expect(global).toBeGreaterThanOrEqual(0);
  expect(override).toBeGreaterThan(global);
  expect(rules[override].nodes.find(node => node.prop === 'padding')?.important).toBe(true);
  const shared = rules.find(rule => rule.selector.includes('.header-utility-group') &&
    rule.selector.includes('.home-utility-pill') && prop(rule, 'gap') === '4px' &&
    prop(rule, 'min-height') === '45px');
  expect(shared).toBeDefined();
});

test('Cashback/Scheduled Back buttons wrap their utilities only below 360px', () => {
  const rule = rules.find(item => item.parent?.type === 'atrule' &&
    item.parent.params === '(max-width: 359px)' &&
    item.selector === '.movo-app .screen-header.root.has-back');
  expect(rule).toBeDefined();
  expect(prop(rule, 'grid-template-columns')).toBe('45px minmax(0, 1fr)');
  const button = rules.find(item => item.selector === '.movo-app .screen-header.root.has-back > .back-button');
  expect(prop(button, 'width')).toBe('45px');
  expect(prop(button, 'height')).toBe('45px');
});

test('narrow Home phones move only grouped utilities to a second grid row without shrinking targets', () => {
  const rule = rules.find(rule => rule.parent?.type === 'atrule' && rule.parent.params === '(max-width: 359px)' &&
    rule.selector === '.movo-app.movo-app.movo-app .screen-header.home-header');
  expect(rule).toBeDefined();
  expect(prop(rule, 'grid-template-areas')).toBe('"avatar hello hello" "actions actions actions"');
  expect(style).toContain('width: 45px !important');
});

test('regular headers still keep creation buttons outside their utility group', () => {
  const el = document.createElement('div');
  const root = createRoot(el);
  const click = jest.fn();
  act(() => root.render(<RootHeader title="Transactions" headerActions={[
    { icon: 'search', label: 'Search', onClick: click },
    { icon: 'bell', label: 'Notifications', onClick: click },
    { icon: 'plus', label: 'Add', onClick: click },
  ]} />));
  expect(el.querySelectorAll('.header-utility-group > button')).toHaveLength(2);
  expect(el.querySelector('.header-add-action').parentNode.classList.contains('header-actions')).toBe(true);
  act(() => { el.querySelector('[aria-label="Search"]').click(); el.querySelector('[aria-label="Add"]').click(); });
  expect(click).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
});
