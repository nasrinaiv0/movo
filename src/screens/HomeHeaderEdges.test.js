import fs from 'fs';
import path from 'path';
import postcss from 'postcss';

const style = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
const rules = [];
postcss.parse(style).walkRules(rule => rules.push(rule));
const prop = (rule, name) => rule?.nodes.find(node => node.type === 'decl' && node.prop === name)?.value;
const lastWith = (part, name) => rules.filter(rule => rule.selector.includes(part) && prop(rule, name) !== undefined).slice(-1)[0];

test('the pinned Home header reaches both screen edges while Total balance keeps the page side space', () => {
  const hero = lastWith('.home-hero-block)', 'margin-left');
  expect(prop(hero, 'margin-left')).toBe('calc(-1 * var(--hero-bleed))');
  expect(prop(hero, 'margin-right')).toBe('calc(-1 * var(--hero-bleed))');
  const block = lastWith('.screen > .home-hero-block', 'padding-left');
  expect(prop(block, 'padding-left')).toBe('var(--hero-bleed)');
  expect(prop(block, 'padding-right')).toBe('var(--hero-bleed)');
  expect(prop(rules.find(rule => rule.selector === '.movo-app'  && prop(rule, '--hero-bleed')), '--hero-bleed')).toBe('18px');
});

test('the ram stands on Total balance instead of floating, at full size even after scrolling', () => {
  const stage = rules.filter(rule => rule.selector.includes('> .ram-mascot .ram-stage') && prop(rule, 'top') !== undefined).slice(-1)[0];
  expect(prop(stage, 'top')).toBe('auto');
  expect(prop(stage, 'bottom')).toBe('calc(-12px - var(--ram-size) * .067)');
  expect(prop(stage, 'transform')).toBe('none');
});

test('Pro and Pro+ headers glow in their badge colours: gold and platinum', () => {
  expect(prop(lastWith('.hero-tier-pro', '--hero-edge'), '--hero-edge')).toBe('#f4c76a');
  expect(prop(lastWith('.hero-tier-plus', '--hero-edge'), '--hero-edge')).toBe('#c9d4ee');
  expect(prop(lastWith('.hero-edge', 'pointer-events'), 'pointer-events')).toBe('none');
});
