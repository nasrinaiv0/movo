import { FONT_SIZES, enableFontScaling, fontScaleOf, fontStyleOf, loadFontStyle, scaleRules, scaledFontSize } from './fontPrefs';

const rule = (selectorText, fontSize, priority = '') => {
  const props = { 'font-size': fontSize }; const prio = { 'font-size': priority };
  return { selectorText, style: { get fontSize() { return props['font-size']; }, getPropertyValue: (k) => props[k], getPropertyPriority: (k) => prio[k], setProperty: (k, v, p) => { props[k] = v; prio[k] = p; } } };
};

test('pixel sizes follow --font-scale; other units are left alone', () => {
  expect(scaledFontSize('14px', '.tx-main strong')).toBe('calc(14px * var(--font-scale, 1))');
  expect(scaledFontSize('12.5px', '.x')).toBe('calc(12.5px * var(--font-scale, 1))');
  expect(scaledFontSize('1.2em', '.x')).toBeNull();
  expect(scaledFontSize('', '.x')).toBeNull();
  expect(scaledFontSize('calc(14px * var(--font-scale, 1))', '.x')).toBeNull(); // already scaled
});

test('form fields never shrink below 16px, so iOS does not zoom in on focus', () => {
  expect(scaledFontSize('16px', '.flow-custom input[type="date"]')).toBe('max(16px, calc(16px * var(--font-scale, 1)))');
  expect(scaledFontSize('16px', '.movo-ai-prompt-input')).toBe('max(16px, calc(16px * var(--font-scale, 1)))');
  expect(scaledFontSize('13px', 'input.search')).toBe('calc(13px * var(--font-scale, 1))');
});

test('rewrites nested rules, keeps !important, and runs once per stylesheet', () => {
  const a = rule('.a', '14px'); const b = rule('.b', '20px', 'important'); const c = rule('.c', '');
  const media = { cssRules: [b] };
  expect(scaleRules([a, media, c])).toBe(2);
  expect(a.style.fontSize).toBe('calc(14px * var(--font-scale, 1))');
  expect(b.style.getPropertyPriority('font-size')).toBe('important');
  const sheet = { cssRules: [rule('.d', '10px')] };
  const cross = { get cssRules() { throw new Error('SecurityError'); } };
  const doc = { styleSheets: [sheet, cross] };
  expect(enableFontScaling(doc)).toBe(1);
  expect(enableFontScaling(doc)).toBe(0);
});

test('sizes and styles fall back to the defaults', () => {
  expect(FONT_SIZES.map(s => s.scale)).toEqual([0.9, 1, 1.1, 1.2, 1.3]);
  expect(fontScaleOf('largest')).toBe(1.3);
  expect(fontScaleOf('nope')).toBe(1);
  expect(fontStyleOf('nope').key).toBe('default');
});

test('Google-hosted fonts load once and only when chosen', () => {
  loadFontStyle('default');
  expect(document.querySelectorAll('link[id^="movo-font-"]')).toHaveLength(0);
  loadFontStyle('rounded'); loadFontStyle('rounded');
  const links = document.querySelectorAll('link#movo-font-rounded');
  expect(links).toHaveLength(1);
  expect(links[0].href).toContain('fonts.googleapis.com/css2?family=Nunito');
});
