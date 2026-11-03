import { evaluateCryptoAlerts, normalizeCryptoAlert } from './cryptoAlerts';

const rule = (overrides = {}) => ({
  id: 'alert-1', coinId: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC',
  direction: 'above', target: 100, quote: 'PHP', enabled: true,
  lastObservedPrice: 99, lastTriggeredAt: null, ...overrides
});

test('validates alert rules and positive thresholds', () => {
  expect(normalizeCryptoAlert(rule())).toMatchObject({ target: 100, direction: 'above' });
  expect(normalizeCryptoAlert(rule({ target: 0 }))).toBeNull();
  expect(normalizeCryptoAlert(rule({ direction: 'sideways' }))).toBeNull();
  expect(normalizeCryptoAlert(rule({ coinId: '../btc' }))).toBeNull();
});

test('fires an above alert only when price crosses upward', () => {
  const first = evaluateCryptoAlerts([rule()], [{ id: 'btc-bitcoin', price: 100 }], '2026-11-04T00:00:00Z');
  expect(first.triggered).toHaveLength(1);
  expect(first.alerts[0].lastTriggeredAt).toBe('2026-11-04T00:00:00Z');
  const steady = evaluateCryptoAlerts(first.alerts, [{ id: 'btc-bitcoin', price: 105 }]);
  expect(steady.triggered).toHaveLength(0);
  const reset = evaluateCryptoAlerts(steady.alerts, [{ id: 'btc-bitcoin', price: 90 }]);
  const recross = evaluateCryptoAlerts(reset.alerts, [{ id: 'btc-bitcoin', price: 101 }]);
  expect(recross.triggered).toHaveLength(1);
});

test('seeds first observation and respects disabled alerts', () => {
  const first = evaluateCryptoAlerts([rule({ lastObservedPrice: null })], [{ id: 'btc-bitcoin', price: 120 }]);
  expect(first.triggered).toHaveLength(0);
  expect(first.alerts[0].lastObservedPrice).toBe(120);
  const disabled = evaluateCryptoAlerts([rule({ enabled: false })], [{ id: 'btc-bitcoin', price: 120 }]);
  expect(disabled.triggered).toHaveLength(0);
});

test('fires below alerts only when price crosses downward', () => {
  const result = evaluateCryptoAlerts([rule({ direction: 'below', target: 90, lastObservedPrice: 91 })], [{ id: 'btc-bitcoin', price: 90 }]);
  expect(result.triggered).toHaveLength(1);
  expect(result.triggered[0].direction).toBe('below');
});
