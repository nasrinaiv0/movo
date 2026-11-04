const handler = require('./crypto');

function response() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    end(body) { this.body = body; return this; }
  };
}
function request(query = {}) { return { method: 'GET', query, headers: {} }; }
function ok(payload) { return { ok: true, json: async () => payload }; }
const originalKey = process.env.COINBEACON_API_KEY;
const originalNodeEnv = process.env.NODE_ENV;
afterEach(() => {
  if (originalKey === undefined) delete process.env.COINBEACON_API_KEY;
  else process.env.COINBEACON_API_KEY = originalKey;
  process.env.NODE_ENV = originalNodeEnv;
  jest.restoreAllMocks();
});

test('requires a server-side CoinBeacon key and never calls upstream without it', async () => {
  delete process.env.COINBEACON_API_KEY;
  process.env.NODE_ENV = 'production';
  global.fetch = jest.fn();
  const res = response();
  await handler(request({ action: 'markets', quote: 'PHP' }), res);
  expect(res.statusCode).toBe(503);
  expect(JSON.parse(res.body).error).toBe('crypto_provider_not_configured');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('loads CoinBeacon market-cap data, converts USD prices to PHP and keeps key server-side', async () => {
  process.env.COINBEACON_API_KEY = 'test-server-secret';
  global.fetch = jest.fn()
    .mockResolvedValueOnce(ok({ coins: [{
      base: 'BTC', name: 'Bitcoin', symbol: 'BTC', price: 60000, marketCap: 1000000,
      volume24h: 10000, percentChange24h: -2.5, circulatingSupply: 19, rank: 1,
      lastUpdated: '2026-11-04T00:00:00.000Z'
    }] }))
    .mockResolvedValueOnce(ok({ rates: { PHP: 58 } }));
  const res = response();
  await handler(request({ action: 'markets', quote: 'PHP' }), res);
  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.body);
  expect(body.provider).toBe('CoinBeacon');
  expect(body.coins[0]).toMatchObject({ id: 'btc-bitcoin', price: 3480000, marketCap: 58000000, change24h: -2.5 });
  expect(global.fetch.mock.calls[0][0]).toBe('https://api.coinbeacon.io/public/market-cap?limit=150');
  expect(global.fetch.mock.calls[0][1].headers).toMatchObject({ 'X-API-Key': 'test-server-secret' });
  expect(res.body).not.toContain('test-server-secret');
});

test('falls back to Binance public tickers when CoinBeacon is unavailable', async () => {
  process.env.COINBEACON_API_KEY = 'test-server-secret';
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce(ok([{ symbol: 'BTCUSDT', lastPrice: '60000', quoteVolume: '900000', priceChangePercent: '-1.25' }]))
    .mockResolvedValueOnce(ok({ rates: { PHP: 58 } }));
  const res = response();
  await handler(request({ action: 'markets', quote: 'PHP' }), res);
  const body = JSON.parse(res.body);
  expect(res.statusCode).toBe(200);
  expect(body.provider).toBe('Binance public market data');
  expect(body.coins[0]).toMatchObject({ symbol: 'BTC', price: 3480000, change24h: -1.25 });
});

test('loads daily candles from CoinBeacon and converts their USD-equivalent USDT prices to PHP', async () => {
  process.env.COINBEACON_API_KEY = 'test-server-secret';
  global.fetch = jest.fn()
    .mockResolvedValueOnce(ok({ bars: [{ openTime: 1791072000000, close: 60000 }] }))
    .mockResolvedValueOnce(ok({ rates: { PHP: 58 } }));
  const res = response();
  await handler(request({ action: 'history', id: 'btc-bitcoin', quote: 'PHP', days: '7' }), res);
  const body = JSON.parse(res.body);
  expect(res.statusCode).toBe(200);
  expect(body.points[0].price).toBe(3480000);
  expect(body.provider).toBe('CoinBeacon');
  expect(global.fetch.mock.calls[0][0]).toContain('/public/ohlcv/binance/BTCUSDT/1d?limit=7');
});

test('rejects invalid actions and quote currencies before provider calls', async () => {
  process.env.COINBEACON_API_KEY = 'test-server-secret';
  global.fetch = jest.fn();
  const invalidAction = response();
  await handler(request({ action: 'unsupported', quote: 'PHP' }), invalidAction);
  expect(invalidAction.statusCode).toBe(400);
  const invalidQuote = response();
  await handler(request({ action: 'markets', quote: 'FAKE' }), invalidQuote);
  expect(invalidQuote.statusCode).toBe(400);
  expect(global.fetch).not.toHaveBeenCalled();
});
