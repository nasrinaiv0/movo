import { apiUrl } from './platform';

const API = apiUrl('/api/crypto');
const CACHE_TTL = 3 * 60 * 1000;
const cache = new Map();
const inflight = new Map();

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function validCoin(coin) {
  return coin && typeof coin.id === 'string' && /^[a-z0-9]+-[a-z0-9-]{1,90}$/.test(coin.id)
    && typeof coin.name === 'string' && typeof coin.symbol === 'string'
    && finite(coin.price) && typeof coin.updatedAt === 'string' && Number.isFinite(Date.parse(coin.updatedAt));
}
function normalizeMarket(payload) {
  if (!payload || !Array.isArray(payload.coins)) throw new Error('invalid_market_response');
  return payload.coins.filter(validCoin).slice(0, 100);
}
async function request(params, options = {}) {
  const query = new URLSearchParams(params);
  const key = query.toString();
  const now = Date.now();
  const cached = cache.get(key);
  if (!options.force && cached && now - cached.savedAt < CACHE_TTL) return { ...cached.value, cached: true };
  if (inflight.has(key)) return inflight.get(key);
  const task = fetch(`${API}?${key}`, { signal: options.signal })
    .then(async (response) => {
      let payload = {};
      try { payload = await response.json(); } catch { /* handled below */ }
      if (!response.ok) {\n        const error = new Error(typeof payload.message === 'string' ? payload.message : (typeof payload.error === 'string' ? payload.error : 'crypto_request_failed'));\n        error.code = typeof payload.error === 'string' ? payload.error : 'crypto_request_failed';\n        throw error;\n      }
      const result = { ...payload, cached: false };
      cache.set(key, { value: result, savedAt: Date.now() });
      return result;
    })
    .catch((error) => {
      if (cached) return { ...cached.value, cached: true, stale: true };
      throw error;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, task);
  return task;
}
export async function loadCryptoMarkets(quote = 'PHP', options = {}) {
  const payload = await request({ action: 'markets', quote: String(quote).toUpperCase(), limit: '100' }, options);
  return { ...payload, coins: normalizeMarket(payload) };
}
export async function loadCryptoCoin(id, quote = 'PHP', options = {}) {
  if (typeof id !== 'string' || !/^[a-z0-9]+-[a-z0-9-]{1,90}$/.test(id)) throw new Error('invalid_coin_id');
  const payload = await request({ action: 'coin', id, quote: String(quote).toUpperCase() }, options);
  if (!validCoin(payload.coin)) throw new Error('invalid_coin_response');
  return payload;
}
export async function loadCryptoHistory(id, quote = 'PHP', days = 7, options = {}) {
  const boundedDays = Math.max(1, Math.min(365, Number(days) || 7));
  const payload = await request({ action: 'history', id, quote: String(quote).toUpperCase(), days: String(boundedDays) }, options);
  const points = Array.isArray(payload.points) ? payload.points.filter((point) =>
    point && typeof point.date === 'string' && Number.isFinite(Date.parse(point.date)) && finite(point.price)
  ).slice(0, 370) : [];
  return { ...payload, points };
}
export function sortCryptoCoins(coins, sort = 'rank') {
  const rows = Array.isArray(coins) ? [...coins] : [];
  const getters = {
    rank: (a, b) => (a.rank || Infinity) - (b.rank || Infinity),
    price: (a, b) => b.price - a.price,
    change: (a, b) => (b.change24h ?? -Infinity) - (a.change24h ?? -Infinity),
    marketCap: (a, b) => (b.marketCap ?? -Infinity) - (a.marketCap ?? -Infinity)
  };
  return rows.sort(getters[sort] || getters.rank);
}
export function clearCryptoCache() { cache.clear(); inflight.clear(); }
export const CRYPTO_PROVIDER = 'CoinPaprika';
