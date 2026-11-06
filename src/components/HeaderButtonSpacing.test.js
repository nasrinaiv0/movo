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

test('Home pill and shared utility capsule have identical 5px insets and 4px spacing', () => {
  const shared = '.movo-app.movo-app.movo-app .screen-header .header-utility-group,\n.movo-app.movo-app.movo-app .screen-header.home-header .home-utility-pill';
  const group = own(shared);
  expect(group).toBeDefined();
  expect(prop(group, 'padding')).toBe('5px');
  expect(prop(group, 'gap')).toBe('4px');
  expect(prop(group, 'min-height')).toBe('57px');
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
