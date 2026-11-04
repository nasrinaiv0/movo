'use strict';

const ALLOWED_QUOTES = new Set(['PHP','USD','EUR','GBP','JPY','AUD','CAD','SGD','CHF','CNY','HKD','NZD','KRW','INR','BTC','ETH']);
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
function normalizeTicker(row, quote) {
  const q = row && row.quotes && row.quotes[quote];
  const price = number(q && q.price);
  const updated = row && typeof row.last_updated === 'string' && Number.isFinite(Date.parse(row.last_updated))
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
module.exports = { safeQuote, safeCoinId, normalizeTicker, number };
