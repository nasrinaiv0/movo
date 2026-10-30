import { convert } from './fx';

test('converts through USD and leaves same or unknown currencies unchanged', () => {
  const rates = { USD: 1, PHP: 50, EUR: 0.5 };
  expect(convert(100, 'USD', 'PHP', rates)).toBe(5000);
  expect(convert(5000, 'PHP', 'EUR', rates)).toBe(50);
  expect(convert(42, 'PHP', 'PHP', rates)).toBe(42);
  expect(convert(42, 'XYZ', 'PHP', rates)).toBe(42);
});
