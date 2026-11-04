'use strict';

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

module.exports = { safeQuote, safeCoinId, normalizeTicker };
