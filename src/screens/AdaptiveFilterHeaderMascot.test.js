import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Chips } from '../components/ui';

global.IS_REACT_ACT_ENVIRONMENT = true;
const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
const rules = [];
postcss.parse(css).walkRules(r => rules.push(r));
const rule = selector => rules.filter(r => r.selector === selector && r.parent?.type !== 'atrule').slice(-1)[0];
const prop = (r, key) => r?.nodes.find(d => d.type === 'decl' && d.prop === key)?.value;

test('all MOVO screen headers use 10px top and bottom, safe area remains separate', () => {
  const h = rule('.movo-app.movo-app.movo-app .screen > .screen-header');
  expect(prop(h, 'padding-top')).toBe('10px');
  expect(prop(h, 'padding-bottom')).toBe('10px');
  expect(prop(h, 'margin-top')).toBe('0');
  expect(prop(h, 'margin-bottom')).toBe('10px');
  expect(prop(h, 'width')).toBeUndefined();
  expect(prop(h, 'height')).toBeUndefined();
  expect(css).toContain('.screen { padding: max(18px, env(safe-area-inset-top))');
});

test('chip typography is theme-adaptive and selected text contrasts with sliding pill', () => {
  const normal = rule('.movo-app.movo-app.movo-app .chip-row > button[data-chip]:not(.selected)');
  const light = rule('.movo-app.movo-app.movo-app:not(.theme-dark) .chip-row > button[data-chip].selected');
  const dark = rule('.movo-app.movo-app.movo-app.theme-dark .chip-row > button[data-chip].selected');
  expect(prop(normal, 'color')).toBe('var(--text)');
  expect(prop(light, 'color')).toBe('#fff');
  expect(prop(dark, 'color')).toBe('#14161f');
  for (const r of [normal, light, dark]) expect(r.nodes.find(d => d.prop === 'color').important).toBe(true);
  expect(css).toContain('.theme-dark .chip-ind { background: #fff; }');
  expect(css).toContain('.chip-ind { position: absolute');
});

test('Financial Planning tabs preserve click events, accessible selected state and labels', () => {
  const onChange = jest.fn();
  const el = document.createElement('div');
  const root = createRoot(el);
  act(() => root.render(<Chips items={[
    { key: 'bills', label: 'Bills' },
    { key: 'goals', label: 'Goals & Plans' }
  ]} value="goals" onChange={onChange} label="Financial planning sections" />));
  const buttons = [...el.querySelectorAll('button[data-chip]')];
  expect(buttons).toHaveLength(2);
  expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  expect(buttons[1].classList.contains('selected')).toBe(true);
  expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
  act(() => buttons[0].click());
  expect(onChange).toHaveBeenCalledWith('bills');
  act(() => root.unmount());
});

test('Home mascot artwork subtly shrinks on scroll without shrinking its button', () => {
  const avatar = rule('.movo-app.movo-app.movo-app .screen > .screen-header.home-header > .ram-mascot');
  const stage = rule('.movo-app.movo-app.movo-app .screen > .screen-header.home-header .ram-stage');
  const scroll = rule('.movo-app.movo-app.movo-app .screen.is-scrolled > .screen-header.home-header .ram-stage');
  const photo = rule('.movo-app.movo-app.movo-app .screen.is-scrolled > .screen-header.home-header > .mascot');
  expect(prop(avatar, 'height')).toBe('68px');
  expect(prop(stage, 'width')).toBe('88px');
  expect(prop(stage, 'height')).toBe('88px');
  expect(prop(scroll, 'transform')).toBe('translateY(-50%) scale(.88)');
  expect(prop(scroll, 'width')).toBeUndefined();
  expect(prop(scroll, 'height')).toBeUndefined();
  expect(prop(photo, 'transform')).toBe('scale(.9)');
  const app = fs.readFileSync(path.join(__dirname, '..', 'App.js'), 'utf8');
  expect(app).toContain('window.scrollY > 6');
  expect(app).toContain('is-scrolled');
});

test('small phones and reduced-motion settings remain supported', () => {
  const small = rules.find(r => r.selector === '.movo-app.movo-app.movo-app .screen > .screen-header.home-header .ram-stage'
    && r.parent?.type === 'atrule' && r.parent.params === '(max-width: 359px)');
  expect(prop(small, 'width')).toBe('76px');
  expect(prop(small, 'height')).toBe('76px');
  const reduced = rules.find(r => r.selector.includes('.screen > .screen-header.home-header .ram-stage')
    && r.selector.includes('.screen > .screen-header.home-header > .mascot')
    && r.parent?.params === '(prefers-reduced-motion: reduce)');
  expect(prop(reduced, 'transition')).toBe('none');
});
