const { safeQuote, safeCoinId, normalizeTicker } = require('./cryptoMarket');

test('accepts only supported quote currencies', () => {
  expect(safeQuote('php')).toBe('PHP');
  expect(safeQuote('USD')).toBe('USD');
  expect(safeQuote('XXX')).toBeNull();
  expect(safeQuote('PHP&limit=100')).toBeNull();
});

test('validates provider coin identifiers', () => {
  expect(safeCoinId('btc-bitcoin')).toBe('btc-bitcoin');
  expect(safeCoinId('../btc')).toBeNull();
  expect(safeCoinId('btc-bitcoin?quotes=PHP')).toBeNull();
});

test('normalizes only complete, safe market ticker values', () => {
  const row = {
    id: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC', rank: 1,
    circulating_supply: 100, last_updated: '2026-11-04T00:00:00Z',
    quotes: { PHP: { price: 5000000, market_cap: 100000, volume_24h: 2000, percent_change_24h: -1.2 } }
  };
  expect(normalizeTicker(row, 'PHP')).toMatchObject({ id: 'btc-bitcoin', price: 5000000, change24h: -1.2 });
  expect(normalizeTicker({ ...row, quotes: { PHP: { price: -1 } } }, 'PHP')).toBeNull();
  expect(normalizeTicker({ ...row, last_updated: 'bad-date' }, 'PHP')).toBeNull();
});
