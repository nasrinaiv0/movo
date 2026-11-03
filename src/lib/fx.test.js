import { convert, formatCurrency, isRateStale, rateBetween } from './fx';

const rates = { USD: 1, PHP: 50, EUR: 0.5, JPY: 150 };

test('converts through USD and leaves unknown currencies unchanged', () => {
  expect(convert(100, 'USD', 'PHP', rates)).toBe(5000);
  expect(convert(5000, 'PHP', 'EUR', rates)).toBe(50);
  expect(convert(42, 'PHP', 'PHP', rates)).toBe(42);
  expect(convert(42, 'XYZ', 'PHP', rates)).toBe(42);
});

test('handles invalid numeric input safely', () => {
  expect(convert('not-a-number', 'USD', 'PHP', rates)).toBe(0);
  expect(convert(Infinity, 'USD', 'PHP', rates)).toBe(0);
});

test('calculates direct and inverse pair rates', () => {
  expect(rateBetween('USD', 'PHP', rates)).toBe(50);
  expect(rateBetween('PHP', 'USD', rates)).toBe(1 / 50);
  expect(rateBetween('XYZ', 'PHP', rates)).toBeNull();
});

test('formats currencies using a locale-aware formatter', () => {
  expect(formatCurrency(50, 'PHP', 'en-PH')).toContain('50');
  expect(formatCurrency(100, 'JPY', 'en-PH')).toContain('100');
});

test('marks fallback and old provider data as stale', () => {
  expect(isRateStale({ live: false, at: 0 })).toBe(true);
  expect(isRateStale({ live: true, at: 1000 }, 1000 + 37 * 3600 * 1000)).toBe(true);
  expect(isRateStale({ live: true, at: 1000 }, 1000 + 60 * 60 * 1000)).toBe(false);
});
