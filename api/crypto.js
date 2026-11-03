'use strict';

const BASE = 'https://api-pro.coinpaprika.com/v1';
const ALLOWED_QUOTES = new Set(['PHP','USD','EUR','GBP','JPY','AUD','CAD','SGD','CHF','CNY','HKD','NZD','KRW','INR','BTC','ETH']);

function safeQuote(value) {
  const quote = String(value || 'PHP').toUpperCase();
  return ALLOWED_QUOTES.has(quote) ? quote : null;
}
function safeCoinId(value) {
  return typeof value === 'string' && /^[a-z0-9]+-[a-z0-9-]{1,90}$/.test(value) ? value : null;
}
function safeDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : null;
}
function number(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
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
function normalizeTicker(row, quote) {
  const q = row && row.quotes && row.quotes[quote];
  const price = number(q && q.price);
  const updated = typeof row.last_updated === 'string' && Number.isFinite(Date.parse(row.last_updated))
    ? new Date(row.last_updated).toISOString() : null;
  if (!row || !safeCoinId(row.id) || typeof row.name !== 'string' || typeof row.symbol !== 'string' || price === null || !updated) return null;
  return {
    id: row.id, name: row.name.slice(0, 100), symbol: row.symbol.slice(0, 20).toUpperCase(),
    rank: Number.isInteger(row.rank) && row.rank > 0 ? row.rank : null,
    price, marketCap: number(q.market_cap), volume24h: number(q.volume_24h),
    change24h: q.percent_change_24h !== null && q.percent_change_24h !== undefined && Number.isFinite(Number(q.percent_change_24h)) ? Number(q.percent_change_24h) : null,
    circulatingSupply: number(row.circulating_supply), updatedAt: updated
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Vary', 'Origin');
  if (!originAllowed(req)) return json(res, 403, { error: 'origin_not_allowed' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'method_not_allowed' });
  }
  const quote = safeQuote(req.query && req.query.quote);
  if (!quote) return json(res, 400, { error: 'invalid_quote_currency' });
  const action = String(req.query && req.query.action || 'markets');
  const coinId = safeCoinId(req.query && req.query.id);
  if (action !== 'markets' && !coinId) return json(res, 400, { error: 'invalid_coin_id' });
  if (!['markets', 'coin', 'history'].includes(action)) return json(res, 400, { error: 'invalid_action' });

  const key = process.env.COINPAPRIKA_API_KEY;
  if (!key) return json(res, 503, { error: 'crypto_provider_not_configured' });
  const base = BASE;
  const headers = { Accept: 'application/json', Authorization: key };
  let path;
  if (action === 'markets') {
    const rawLimit = Number(req.query.limit || 100);
    const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 100;
    path = `/tickers?quotes=${quote}&limit=${limit}`;
  } else if (action === 'coin') {
    path = `/tickers/${coinId}?quotes=${quote}`;
  } else {
    const days = Math.max(1, Math.min(365, Number(req.query.days) || 7));
    const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    path = `/tickers/${coinId}/historical?start=${start}&interval=1d&quote=${quote}`;
  }

  try {
    const upstream = await fetch(base + path, { headers, signal: AbortSignal.timeout(12000) });
    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : upstream.status === 404 ? 404 : 502;
      return json(res, status, { error: status === 429 ? 'crypto_provider_rate_limited' : status === 404 ? 'coin_not_found' : 'crypto_provider_unavailable' });
    }
    const payload = await upstream.json();
    const cache = 'public, s-maxage=180, stale-while-revalidate=300';
    res.setHeader('Cache-Control', cache);
    if (action === 'markets') {
      if (!Array.isArray(payload)) return json(res, 502, { error: 'invalid_provider_response' });
      const coins = payload.slice(0, 1000).map((row) => normalizeTicker(row, quote)).filter(Boolean).slice(0, 100);
      return json(res, 200, { coins, quote, provider: 'CoinPaprika', fetchedAt: new Date().toISOString(), delayed: true });
    }
    if (action === 'coin') {
      const coin = normalizeTicker(payload, quote);
      if (!coin) return json(res, 502, { error: 'invalid_provider_response' });
      return json(res, 200, { coin, quote, provider: 'CoinPaprika', fetchedAt: new Date().toISOString(), delayed: true });
    }
    if (!Array.isArray(payload)) return json(res, 502, { error: 'invalid_provider_response' });
    const points = payload.slice(0, 370).map((row) => ({
      date: typeof row.timestamp === 'string' && Number.isFinite(Date.parse(row.timestamp)) ? new Date(row.timestamp).toISOString() : null,
      price: number(row.price)
    })).filter((row) => row.date && row.price !== null);
    return json(res, 200, { points, quote, provider: 'CoinPaprika', fetchedAt: new Date().toISOString(), delayed: true });
  } catch {
    return json(res, 502, { error: 'crypto_provider_unavailable' });
  }
};

module.exports.safeQuote = safeQuote;
module.exports.safeCoinId = safeCoinId;
module.exports.normalizeTicker = normalizeTicker;
