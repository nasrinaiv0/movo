const handler = require('./crypto');

function response() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    end(body) { this.body = body; return this; }
  };
}
function request(query = {}) { return { method: 'GET', query, headers: {} }; }
const originalKey = process.env.COINPAPRIKA_API_KEY;
const originalNodeEnv = process.env.NODE_ENV;
afterEach(() => {
  if (originalKey === undefined) delete process.env.COINPAPRIKA_API_KEY;
  else process.env.COINPAPRIKA_API_KEY = originalKey;
  process.env.NODE_ENV = originalNodeEnv;
  jest.restoreAllMocks();
});

test('returns actionable configuration guidance when the licensed provider key is absent', async () => {
  delete process.env.COINPAPRIKA_API_KEY;
  process.env.NODE_ENV = 'production';
  global.fetch = jest.fn();
  const res = response();
  await handler(request({ action: 'markets', quote: 'PHP' }), res);
  expect(res.statusCode).toBe(503);
  expect(JSON.parse(res.body)).toEqual({
    error: 'crypto_provider_not_configured',
    message: 'Configure the licensed CoinPaprika API key as the server-only Vercel environment variable COINPAPRIKA_API_KEY, then redeploy.'
  });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('uses the paid CoinPaprika REST host and keeps the key in the server request', async () => {
  process.env.NODE_ENV = 'production';
  process.env.COINPAPRIKA_API_KEY = 'test-server-secret';
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [{
      id: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC', rank: 1,
      last_updated: '2026-11-04T00:00:00Z',
      quotes: { PHP: { price: 5000000, market_cap: 1, volume_24h: 2, percent_change_24h: 1 } }
    }]
  });
  const res = response();
  await handler(request({ action: 'markets', quote: 'PHP', limit: '1' }), res);
  expect(global.fetch).toHaveBeenCalledWith(
    'https://api-pro.coinpaprika.com/v1/tickers?quotes=PHP&limit=1',
    expect.objectContaining({ headers: { Accept: 'application/json', Authorization: 'test-server-secret' } })
  );
  expect(res.statusCode).toBe(200);
  expect(JSON.parse(res.body).coins[0]).toMatchObject({ id: 'btc-bitcoin', price: 5000000 });
  expect(res.body).not.toContain('test-server-secret');
});

test('maps provider rate limits to a retryable response', async () => {
  process.env.COINPAPRIKA_API_KEY = 'test-server-secret';
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
  const res = response();
  await handler(request({ action: 'markets', quote: 'PHP' }), res);
  expect(res.statusCode).toBe(429);
  expect(JSON.parse(res.body).error).toBe('crypto_provider_rate_limited');
});

test('rejects invalid actions before contacting the provider', async () => {
  process.env.COINPAPRIKA_API_KEY = 'test-server-secret';
  global.fetch = jest.fn();
  const res = response();
  await handler(request({ action: 'unsupported', quote: 'PHP' }), res);
  expect(res.statusCode).toBe(400);
  expect(global.fetch).not.toHaveBeenCalled();
});
