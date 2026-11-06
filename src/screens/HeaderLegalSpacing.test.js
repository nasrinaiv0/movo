import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { LegalSupplement } from './Legal';

global.IS_REACT_ACT_ENVIRONMENT = true;
const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
const rules = [];
postcss.parse(css).walkRules(rule => rules.push(rule));
const ruleFor = sel => rules.find(rule => rule.selector === sel);
const declaration = (rule, property) => rule?.nodes.find(node => node.type === 'decl' && node.prop === property)?.value;

test('root Home, Wallet, Transactions and Menu header rows have 10px vertical spacing', () => {
  const selector = '.movo-app.movo-app .screen > .screen-header';
  const row = ruleFor(selector);
  expect(declaration(row, 'padding-block')).toBe('10px');
  expect(declaration(row, 'margin-bottom')).toBe('10px');
  expect(declaration(row, 'align-items')).toBe('center');
  expect(declaration(ruleFor(selector + '.root'), 'padding-top')).toBe('10px');
  const home = ruleFor(selector + '.home-header');
  expect(declaration(home, 'padding-block')).toBe('10px');
  expect(declaration(home, 'margin-bottom')).toBe('10px');
  expect(declaration(home, 'min-height')).toBe('0');
  expect(css).toContain('.screen { padding: max(18px, env(safe-area-inset-top))');
  expect(css).toContain('width: 45px !important');
});

test('legal pages use a consistent gap across original and supplemental policy sections', () => {
  const page = ruleFor('.movo-app.movo-app .legal-page');
  const nested = ruleFor('.movo-app.movo-app .legal-page > [data-legal-supplement]');
  expect(declaration(page, 'gap')).toBe('14px');
  expect(declaration(nested, 'display')).toBe('grid');
  expect(declaration(nested, 'gap')).toBe('14px');
  expect(declaration(ruleFor('.movo-app.movo-app .legal-page :is(.legal-intro, .legal-section, .legal-contact)'), 'padding')).toBe('16px');
  expect(declaration(ruleFor('.movo-app.movo-app .legal-page :is(.legal-section, .legal-contact) p'), 'line-height')).toBe('1.65');
  expect(declaration(ruleFor('.movo-app.movo-app .screen:has(> .legal-page)'), 'padding-bottom')).toContain('safe-area-inset-bottom');
});

test('both Terms and Privacy supplemental sections preserve headings and document structure', () => {
  for (const kind of ['terms', 'privacy']) {
    const el = document.createElement('div');
    const root = createRoot(el);
    act(() => root.render(<LegalSupplement kind={kind} />));
    const wrapper = el.querySelector('[data-legal-supplement="' + kind + '"]');
    expect(wrapper).not.toBeNull();
    const sections = wrapper.querySelectorAll(':scope > section.legal-section');
    expect(sections.length).toBeGreaterThan(1);
    sections.forEach(section => {
      expect(section.querySelector('h2')).not.toBeNull();
      expect(section.querySelectorAll('p').length).toBeGreaterThan(0);
    });
    act(() => root.unmount());
  }
});
