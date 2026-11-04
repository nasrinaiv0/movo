'use strict';

const COINBEACON = 'https://api.coinbeacon.io';
const BINANCE = 'https://data-api.binance.vision';
const ALLOWED_QUOTES = new Set(['PHP','USD','EUR','GBP','JPY','AUD','CAD','SGD','CHF','CNY','HKD','NZD','KRW','INR','BTC','ETH']);
const FIAT_QUOTES = new Set([...ALLOWED_QUOTES].filter((q) => !['BTC','ETH'].includes(q)));

function safeQuote(value) {
  const quote = String(value || 'PHP').toUpperCase();
  return ALLOWED_QUOTES.has(quote) ? quote : null;
}
function safeCoinId(value) {
  return typeof value === 'string' && /^[a-z0-9]+-[a-z0-9-]{1,90}$/.test(value) ? value : null;
}
function number(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function signedNumber(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  const allowed = String(process.env.MOVO_ALLOWED_ORIGINS || 'https://movo.nasrinai.com,https://movo-lime.vercel.app')
    .split(',').map((v) => v.trim()).filter(Boolean);
  if (process.env.NODE_ENV !== 'production') allowed.push('http://localhost:3000');
  return allowed.includes(parsed.origin);
}
function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.end(JSON.stringify(body));
}
async function providerFetch(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('crypto_upstream_' + response.status);
  return response.json();
}
async function quoteRate(quote, coins) {
  if (quote === 'USD') return 1;
  if (quote === 'BTC' || quote === 'ETH') {
    const ticker = quote;
    const row = coins.find((coin) => String(coin.symbol).toUpperCase() === ticker);
    const usdPrice = number(row && row.price);
    if (!usdPrice) throw new Error('crypto_quote_unavailable');
    return 1 / usdPrice;
  }
  const rates = await providerFetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=' + encodeURIComponent(quote));
  const rate = number(rates && rates.rates && rates.rates[quote]);
  if (!rate) throw new Error('crypto_fx_unavailable');
  return rate;
}
function normalizeCoin(row, quote, rate) {
  const usdPrice = number(row.price);
  const updated = typeof row.lastUpdated === 'string' && Number.isFinite(Date.parse(row.lastUpdated))
    ? new Date(row.lastUpdated).toISOString()
    : typeof row.last_updated === 'string' && Number.isFinite(Date.parse(row.last_updated))
      ? new Date(row.last_updated).toISOString() : new Date().toISOString();
  const base = String(row.base || row.symbol || '').toUpperCase();
  const name = typeof row.name === 'string' ? row.name : base;
  if (!/^[A-Z0-9]{1,20}$/.test(base) || !name || usdPrice === null) return null;
  return {
    id: base.toLowerCase() + '-' + (slug(name) || base.toLowerCase()),
    base, name: name.slice(0, 100), symbol: base.slice(0, 20),
    rank: Number.isInteger(row.rank) && row.rank > 0 ? row.rank : null,
    price: usdPrice * rate,
    marketCap: number(row.marketCap) === null ? null : number(row.marketCap) * rate,
    volume24h: number(row.volume24h) === null ? null : number(row.volume24h) * rate,
    change24h: signedNumber(row.percentChange24h),
    circulatingSupply: number(row.circulatingSupply),
    updatedAt: updated
  };
}
async function coinBeaconMarkets(key, quote) {
  const payload = await providerFetch(COINBEACON + '/public/market-cap?limit=150', { 'X-API-Key': key, Accept: 'application/json' });
  if (!Array.isArray(payload.coins)) throw new Error('invalid_provider_response');
  const rate = await quoteRate(quote, payload.coins);
  return payload.coins.map((row) => normalizeCoin(row, quote, rate)).filter(Boolean).slice(0, 100);
}
async function binanceMarkets(quote) {
  const rows = await providerFetch(BINANCE + '/api/v3/ticker/24hr');
  if (!Array.isArray(rows)) throw new Error('invalid_binance_response');
  const selected = rows.filter((row) => typeof row.symbol === 'string' && row.symbol.endsWith('USDT') && row.symbol.length > 4)
    .sort((a, b) => Number(b.quoteVolume || 0) - Number(a.quoteVolume || 0)).slice(0, 100);
  const rate = quote === 'USD' ? 1 : quoteRate(quote, selected.map((row) => ({ symbol: row.symbol.replace(/USDT$/, ''), price: 1 }))).catch(() => null);
  const resolvedRate = await rate;
  if (!resolvedRate) throw new Error('crypto_fx_unavailable');
  return selected.map((row, index) => {
    const symbol = row.symbol.slice(0, -4);
    const price = number(row.lastPrice);
    if (!/^[A-Z0-9]{1,20}$/.test(symbol) || price === null) return null;
    return {
      id: symbol.toLowerCase() + '-' + symbol.toLowerCase(), base: symbol, name: symbol, symbol,
      rank: index + 1, price: price * resolvedRate, marketCap: null,
      volume24h: number(row.quoteVolume) === null ? null : number(row.quoteVolume) * resolvedRate,
      change24h: signedNumber(row.priceChangePercent), circulatingSupply: null,
      updatedAt: new Date().toISOString()
    };
  }).filter(Boolean);
}
module.exports = async function handler(req, res) {
  res.setHeader('Vary', 'Origin');
  if (!originAllowed(req)) return json(res, 403, { error: 'origin_not_allowed' });
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { error: 'method_not_allowed' }); }
  const quote = safeQuote(req.query && req.query.quote);
  if (!quote) return json(res, 400, { error: 'invalid_quote_currency' });
  const action = String(req.query && req.query.action || 'markets');
  const id = safeCoinId(req.query && req.query.id);
  if (!['markets', 'coin', 'history'].includes(action)) return json(res, 400, { error: 'invalid_action' });
  if (action !== 'markets' && !id) return json(res, 400, { error: 'invalid_coin_id' });
  const key = process.env.COINBEACON_API_KEY;
  if (!key) return json(res, 503, { error: 'crypto_provider_not_configured', message: 'Add COINBEACON_API_KEY as a server-only Vercel environment variable, then redeploy.' });
  try {
    if (action === 'markets' || action === 'coin') {
      let coins, provider = 'CoinBeacon';
      try { coins = await coinBeaconMarkets(key, quote); }
      catch (error) {
        coins = await binanceMarkets(quote);
        provider = 'Binance public market data';
      }
      if (action === 'coin') {
        const base = id.split('-')[0].toUpperCase();
        const coin = coins.find((row) => row.base === base || row.id === id);
        if (!coin) return json(res, 404, { error: 'coin_not_found' });
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
        return json(res, 200, { coin, quote, provider, fetchedAt: new Date().toISOString(), delayed: true });
      }
      res.setHeader('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=300');
      return json(res, 200, { coins, quote, provider, fetchedAt: new Date().toISOString(), delayed: true });
    }
    const base = id.split('-')[0].toUpperCase();
    if (!/^[A-Z0-9]{1,20}$/.test(base)) return json(res, 400, { error: 'invalid_coin_id' });
    const days = Math.max(1, Math.min(365, Number(req.query.days) || 7));
    const limit = Math.min(1000, Math.max(1, days));
    let bars, provider = 'CoinBeacon';
    try {
      const payload = await providerFetch(COINBEACON + '/public/ohlcv/binance/' + encodeURIComponent(base + 'USDT') + '/1d?limit=' + limit, { 'X-API-Key': key, Accept: 'application/json' });
      bars = Array.isArray(payload.bars) ? payload.bars : [];
    } catch (error) {
      const payload = await providerFetch(BINANCE + '/api/v3/klines?symbol=' + encodeURIComponent(base + 'USDT') + '&interval=1d&limit=' + limit);
      bars = Array.isArray(payload) ? payload.map((row) => ({ openTime: row[0], close: row[4] })) : [];
      provider = 'Binance public market data';
    }
    let rate = 1;
    if (quote !== 'USD') {
      if (quote === 'BTC' || quote === 'ETH') {
        const reference = await binanceMarkets('USD');
        const q = reference.find((row) => row.symbol === quote);
        if (!q || !q.price) throw new Error('crypto_quote_unavailable');
        rate = 1 / q.price;
      } else {
        const fx = await providerFetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=' + encodeURIComponent(quote));
        rate = number(fx && fx.rates && fx.rates[quote]);
        if (!rate) throw new Error('crypto_fx_unavailable');
      }
    }
    const points = bars.map((bar) => ({
      date: Number.isFinite(Number(bar.openTime)) ? new Date(Number(bar.openTime)).toISOString() : null,
      price: number(bar.close) === null ? null : number(bar.close) * rate
    })).filter((point) => point.date && point.price !== null);
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
    return json(res, 200, { points, quote, provider, fetchedAt: new Date().toISOString(), delayed: true });
  } catch (error) {
    const message = error && error.message === 'crypto_fx_unavailable' ? 'The exchange rate for the selected display currency is temporarily unavailable.' : 'Crypto market data is temporarily unavailable.';
    return json(res, 502, { error: 'crypto_provider_unavailable', message });
  }
};
module.exports.safeQuote = safeQuote;
module.exports.safeCoinId = safeCoinId;
module.exports.normalizeCoin = normalizeCoin;
