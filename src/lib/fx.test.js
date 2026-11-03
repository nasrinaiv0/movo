import { convert, formatCurrency, isRateStale, rateBetween, refreshRates } from './fx';

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

const originalFetch = global.fetch;
const providerPayload = () => ({
  result: 'success',
  time_last_update_unix: 1793750400,
  rates: { USD: 1, PHP: 58.2, EUR: 0.91, SGD: 1.3 },
});

afterEach(() => {
  if (originalFetch) global.fetch = originalFetch;
  else delete global.fetch;
  localStorage.clear();
});

test('fetches and caches validated provider reference rates', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => providerPayload() });
  const next = await refreshRates(null, true);
  expect(next.live).toBe(true);
  expect(next.provider).toBe('ExchangeRate-API');
  expect(next.rates.PHP).toBe(58.2);
  expect(JSON.parse(localStorage.getItem('movo.fx.v1')).rates.PHP).toBe(58.2);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('deduplicates simultaneous provider refresh requests', async () => {
  let release;
  global.fetch = jest.fn(() => new Promise(resolve => { release = () => resolve({ ok: true, json: async () => providerPayload() }); }));
  const first = refreshRates(null, true);
  const second = refreshRates(null, true);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  release();
  const [a, b] = await Promise.all([first, second]);
  expect(a).toBe(b);
});

test('rejects malformed provider payloads', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ result: 'success', rates: { USD: 1 } }) });
  await expect(refreshRates(null, true)).rejects.toThrow('rates_invalid');
});
