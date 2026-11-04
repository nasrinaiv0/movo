import { clearCryptoCache, loadCryptoMarkets, sortCryptoCoins } from './crypto';

const coin = (overrides = {}) => ({
  id: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC', rank: 1, price: 100,
  marketCap: 1000, volume24h: 100, change24h: 2, updatedAt: '2026-11-04T00:00:00.000Z',
  ...overrides
});

afterEach(() => { clearCryptoCache(); jest.restoreAllMocks(); });

test('loads and validates normalized market data', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({
    coins: [coin(), { ...coin(), id: '../bad' }, { ...coin(), price: Infinity }]
  }) });
  const result = await loadCryptoMarkets('PHP');
  expect(result.coins).toHaveLength(1);
  expect(result.coins[0].symbol).toBe('BTC');
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('quote=PHP'), expect.any(Object));
});

test('sorts by price change and market cap without mutating input', () => {
  const rows = [coin({ id: 'eth-ethereum', change24h: -3, marketCap: 2000 }), coin({ change24h: 5 })];
  expect(sortCryptoCoins(rows, 'change').map((x) => x.change24h)).toEqual([5, -3]);
  expect(sortCryptoCoins(rows, 'marketCap')[0].marketCap).toBe(2000);
  expect(rows[0].change24h).toBe(-3);
});

test('rejects malformed provider responses', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ coins: 'not-an-array' }) });
  await expect(loadCryptoMarkets()).rejects.toThrow('invalid_market_response');
});

test('reuses a fresh cached response', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ coins: [coin()] }) });
  await loadCryptoMarkets();
  const second = await loadCryptoMarkets();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(second.cached).toBe(true);
});


test('preserves safe server guidance when the crypto API returns an actionable error', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 503,
    json: async () => ({
      error: 'crypto_provider_not_configured',
      message: 'Configure the licensed CoinPaprika API key as the server-only Vercel environment variable COINPAPRIKA_API_KEY, then redeploy.'
    })
  });
  await expect(loadCryptoMarkets('PHP')).rejects.toMatchObject({
    code: 'crypto_provider_not_configured',
    message: 'Configure the licensed CoinPaprika API key as the server-only Vercel environment variable COINPAPRIKA_API_KEY, then redeploy.'
  });
});
