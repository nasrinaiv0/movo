import fs from 'fs';
import path from 'path';
import postcss from 'postcss';

const style = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
const rules = [];
postcss.parse(style).walkRules(rule => rules.push(rule));
const prop = (rule, name) => rule?.nodes.find(node => node.type === 'decl' && node.prop === name)?.value;
const last = sel => rules.filter(rule => rule.selector === sel).slice(-1)[0];

test('the wallet arrow on the Home balance box is never taken out of its absolute position', () => {
  const positioned = rules.filter(rule => rule.selector.includes('.balance-go') && prop(rule, 'position') !== undefined);
  expect(positioned.length).toBeGreaterThan(0);
  // A later `position: relative` (added for hit areas) once dropped the arrow onto the trend chip at the left.
  positioned.forEach(rule => expect(`${rule.selector} { position: ${prop(rule, 'position')} }`).toMatch(/position: absolute \}$/));
});

test('the arrow sits at the bottom right of the balance box, mirrored for right-to-left languages', () => {
  const box = last('.movo-app .balance-card.notched .balance-go');
  expect(prop(box, 'top')).toBe('auto');
  expect(prop(box, 'bottom')).toBe('var(--box-pad)');
  expect(prop(box, 'right')).toBe('var(--box-pad)');
  expect(prop(box, 'left')).toBeUndefined();
  const rtl = last('.movo-app[dir="rtl"] .balance-card.notched .balance-go');
  expect(prop(rtl, 'right')).toBe('auto');
  expect(prop(rtl, 'left')).toBe('var(--box-pad)');
  // No other rule moves it sideways for left-to-right text after the balance-box rule.
  const after = rules.slice(rules.indexOf(box) + 1).filter(rule => rule.selector.includes('.balance-go') && !rule.selector.includes('::before') && !rule.selector.includes('[dir="rtl"]'));
  after.forEach(rule => { expect(prop(rule, 'left')).toBeUndefined(); expect(prop(rule, 'right')).toBeUndefined(); expect(prop(rule, 'inset')).toBeUndefined(); });
});

test('the arrow keeps a centred 44px hit area', () => {
  const shifted = rules.filter(rule => /\.balance-go::before/.test(rule.selector) && !rule.selector.includes(':is('));
  expect(shifted).toHaveLength(0);
  const hit = rules.filter(rule => rule.selector.includes('.balance-go') && rule.selector.includes('::before')).slice(-1)[0];
  expect(prop(hit, 'width')).toBe('max(100%, 44px)');
  expect(prop(hit, 'height')).toBe('max(100%, 44px)');
  expect(prop(hit, 'transform')).toBe('translate(-50%, -50%)');
});

test('the Total Balance label and its eye button stop short of the month pill cut into the box', () => {
  const label = last('.movo-app.movo-app .balance-card.notched .balance-label');
  // --notch-w is the measured width of the cut (NotchedBox); the label may use what is left of the first row.
  expect(prop(label, 'max-width')).toBe('calc(100% - var(--notch-w, 0px) + var(--box-pad) - 4px)');
  expect(prop(label, 'min-width')).toBe('0');
  const text = last('.movo-app .balance-card.notched .balance-label-text');
  expect(prop(text, 'overflow')).toBe('hidden');
  expect(prop(text, 'text-overflow')).toBe('ellipsis');
  expect(prop(text, 'white-space')).toBe('nowrap');
  // The eye never shrinks: the text gives way first.
  expect(prop(last('.movo-app .balance-card.notched .balance-label .plain-icon'), 'flex')).toBe('none');
  // Right-to-left: the pill stays at the physical top-right, so the label moves to the other end of the row.
  expect(prop(last('.movo-app[dir="rtl"] .balance-card.notched .balance-label'), 'align-self')).toBe('flex-end');
});

test('larger text sizes show the short month in the pill', () => {
  expect(prop(last('.movo-app .home-period-filter.in-notch.short .home-period-current .period-long'), 'display')).toBe('none');
  expect(prop(last('.movo-app .home-period-filter.in-notch.short .home-period-current .period-short'), 'display')).toBe('inline');
});
