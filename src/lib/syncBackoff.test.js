import { retryDelay, RETRY_BASE_MS, RETRY_MAX_MS } from './syncBackoff';

const middle = () => 0.5; // no jitter

test('waits double after each failed attempt and stops growing at five minutes', () => {
  expect([0, 1, 2, 3, 4, 5, 6, 7, 20].map(n => retryDelay(n, middle)))
    .toEqual([5000, 10000, 20000, 40000, 80000, 160000, 300000, 300000, 300000]);
  expect(retryDelay(1000, middle)).toBe(RETRY_MAX_MS);
});

test('spreads each wait by at most 20% and never goes past the cap', () => {
  expect(retryDelay(2, () => 0)).toBe(16000);
  expect(retryDelay(2, () => 0.999999)).toBe(24000);
  expect(retryDelay(8, () => 0.999999)).toBe(RETRY_MAX_MS);
  expect(retryDelay(8, () => 0)).toBe(240000);
  for (let n = 0; n < 12; n += 1) {
    for (const r of [0, 0.13, 0.5, 0.87, 0.999]) {
      const wait = retryDelay(n, () => r);
      expect(wait).toBeGreaterThanOrEqual(RETRY_BASE_MS * 0.8);
      expect(wait).toBeLessThanOrEqual(RETRY_MAX_MS);
    }
  }
});

test('bad input falls back to the first wait instead of retrying in a tight loop', () => {
  for (const bad of [-1, NaN, undefined, null, 1.5, '3']) expect(retryDelay(bad, middle)).toBe(RETRY_BASE_MS);
  expect(retryDelay(0, () => NaN)).toBe(4000);
  expect(retryDelay(0, () => 7)).toBe(6000);
});
