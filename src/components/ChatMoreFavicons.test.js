import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Icon from './Icon';
import BrandLogo from './BrandLogo';

global.IS_REACT_ACT_ENVIRONMENT = true;
const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
const rules = [];
postcss.parse(css).walkRules(rule => rules.push(rule));
const ruleWith = (needle, declaration = '') => rules.find(r => r.selector.includes(needle) &&
  (!declaration || r.nodes.some(n => n.type === 'decl' && n.prop === declaration)));
const prop = (rule, name) => rule?.nodes.find(n => n.type === 'decl' && n.prop === name)?.value;

test('chat progress is accessible, borderless and has no green disk behind the adaptive logo', () => {
  const loading = ruleWith('.movo-ai-thinking', 'background');
  const noCard = rules.find(r => r.selector === '.movo-app.movo-app.movo-app .movo-ai-thinking');
  expect(prop(noCard, 'background')).toBe('transparent');
  expect(prop(noCard, 'border')).toBe('0');
  expect(prop(noCard, 'box-shadow')).toBe('none');
  const avatar = rules.find(r => r.selector === '.movo-app.movo-app.movo-app .movo-ai-thinking-orb');
  expect(prop(avatar, 'background')).toBe('transparent');
  expect(prop(avatar, 'color')).toContain('--accent-ink');
  expect(css).toContain('.movo-ai-thinking::after');
  const chat = fs.readFileSync(path.join(__dirname, 'NasrinAIChat.js'), 'utf8');
  expect(chat).toContain('className="movo-ai-thinking" role="status"');
  expect(chat).toContain('NasrinMark size={22} state={phase}');
  expect(loading).toBeDefined();
});

test('More uses exactly three solid adaptive dots with no outlined rings', () => {
  const el = document.createElement('div');
  const root = createRoot(el);
  act(() => root.render(<Icon name="more" size={24} />));
  const svg = el.querySelector('svg');
  const circles = [...svg.querySelectorAll('circle')];
  expect(circles).toHaveLength(3);
  circles.forEach(circle => {
    expect(circle.getAttribute('fill')).toBe('currentColor');
    expect(circle.getAttribute('stroke')).toBe('none');
    expect(Number(circle.getAttribute('r'))).toBeGreaterThan(2);
  });
  act(() => root.unmount());
});

test('Google S2 logo images have zero CSS padding and fill their original frame', () => {
  const image = rules.find(r => r.selector === '.movo-app.movo-app img[src*="google.com/s2/favicons"]');
  expect(prop(image, 'padding')).toBe('0');
  expect(prop(image, 'object-fit')).toBe('contain');
  const frame = ruleWith('.wallet-brand-mark-image[src*="google.com/s2/favicons"]', 'width');
  expect(prop(frame, 'width')).toBe('100%');
  expect(prop(frame, 'height')).toBe('100%');
  const catalog = ruleWith('.catalog-row .sub-icon.has-logo:has(> img[src*="google.com/s2/favicons"])', 'padding');
  expect(prop(catalog, 'padding')).toBe('0');
});

test('real fetched Google favicons stay functional with fallback and no extra wrapper', () => {
  const el = document.createElement('div');
  const root = createRoot(el);
  act(() => root.render(<BrandLogo src="https://www.google.com/s2/favicons?domain=instagram.com&sz=128" size={42} className="scheduled-brand-logo" />));
  const img = el.querySelector('img');
  expect(img).not.toBeNull();
  expect(img.getAttribute('src')).toContain('google.com/s2/favicons');
  expect(img.getAttribute('width')).toBe('42');
  act(() => img.dispatchEvent(new Event('error')));
  expect(el.querySelector('.brand-fallback')).not.toBeNull();
  act(() => root.unmount());
});
