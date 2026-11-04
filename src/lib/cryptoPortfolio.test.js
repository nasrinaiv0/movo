import { normalizeCryptoHolding, summarizeCryptoHoldings, upsertCryptoHolding } from './cryptoPortfolio';

const holding = (patch = {}) => ({
  id: 'lot-1', coinId: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC',
  quantity: 0.5, averageCost: 50000, quote: 'USD', acquiredAt: '2026-01-01', ...patch
});

describe('crypto portfolio holdings', () => {
  test('validates positive quantity and optional non-negative average cost', () => {
    expect(normalizeCryptoHolding(holding()).quantity).toBe(0.5);
    expect(normalizeCryptoHolding(holding({ averageCost: null })).averageCost).toBeNull();
    expect(normalizeCryptoHolding(holding({ quantity: 0 }))).toBeNull();
    expect(normalizeCryptoHolding(holding({ quantity: Infinity }))).toBeNull();
    expect(normalizeCryptoHolding(holding({ averageCost: -1 }))).toBeNull();
    expect(normalizeCryptoHolding(holding({ coinId: '../btc' }))).toBeNull();
  });

  test('values holdings and calculates unrealized P/L in the matching quote currency', () => {
    const result = summarizeCryptoHoldings([holding()], [{ id: 'btc-bitcoin', price: 60000 }], 'USD');
    expect(result.totalValue).toBe(30000);
    expect(result.totalCost).toBe(25000);
    expect(result.profitLoss).toBe(5000);
    expect(result.rows[0].profitLoss).toBe(5000);
  });

  test('does not fabricate valuations across quote currencies or missing market prices', () => {
    const wrongQuote = summarizeCryptoHoldings([holding()], [{ id: 'btc-bitcoin', price: 60000 }], 'PHP');
    expect(wrongQuote.totalValue).toBeNull();
    expect(wrongQuote.profitLoss).toBeNull();
    const missing = summarizeCryptoHoldings([holding()], [], 'USD');
    expect(missing.totalValue).toBeNull();
  });

  test('does not claim total P/L when any lot has unknown cost basis', () => {
    const result = summarizeCryptoHoldings([holding(), holding({ id: 'lot-2', averageCost: null })], [{ id: 'btc-bitcoin', price: 60000 }], 'USD');
    expect(result.totalValue).toBe(60000);
    expect(result.totalCost).toBeNull();
    expect(result.profitLoss).toBeNull();
  });

  test('upserts a lot by id without creating duplicates', () => {
    const result = upsertCryptoHolding([holding()], holding({ quantity: 1 }));
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1);
  });
});
