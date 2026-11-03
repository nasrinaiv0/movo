/*
 * Reference FX rates for MOVO conversions and the exchange-rate screen.
 * The upstream free endpoint is a reference-rate feed, not a tick-by-tick executable quote.
 * Only currency codes are requested; no transaction, account, or personal financial data is sent.
 */
export const CURRENCIES = ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'INR', 'SGD', 'HKD', 'TWD', 'AUD', 'NZD', 'CAD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'MAD', 'ILS', 'MYR', 'IDR', 'THB', 'VND', 'PKR', 'BDT', 'MXN', 'BRL', 'ARS', 'ZAR', 'NGN'];
const FALLBACK = { USD: 1, PHP: 58, EUR: 0.92, GBP: 0.78, JPY: 150, CNY: 7.2, KRW: 1380, INR: 84, SGD: 1.34, HKD: 7.8, TWD: 32, AUD: 1.52, NZD: 1.66, CAD: 1.37, CHF: 0.88, SEK: 10.6, NOK: 10.8, DKK: 6.9, PLN: 3.95, TRY: 34, AED: 3.6725, SAR: 3.75, QAR: 3.64, KWD: 0.307, BHD: 0.376, OMR: 0.385, EGP: 48.5, MAD: 9.9, ILS: 3.7, MYR: 4.5, IDR: 15800, THB: 35, VND: 25000, PKR: 280, BDT: 118, MXN: 18.5, BRL: 5.5, ARS: 950, ZAR: 18, NGN: 1500 };
const KEY = 'movo.fx.v1';
const HISTORY_KEY = 'movo.fx.history.v1';
const HISTORY_AGE = 12 * 3600 * 1000;
const HISTORY_DAYS = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365 };
const historyRequests = new Map();
const MAX_AGE = 6 * 3600 * 1000;
let pendingRefresh = null;
let failureCount = 0;
let lastFailureAt = 0;

export function loadRates() {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY));
    if (cached?.rates?.USD === 1) return { ...cached, rates: { ...FALLBACK, ...cached.rates }, live: cached.live === true };
  } catch { /* ignore unavailable or malformed browser storage */ }
  return { rates: FALLBACK, at: 0, fetched: 0, live: false, provider: 'Indicative estimate' };
}

/** Fetches the provider's latest USD reference rates. force=true is for explicit user refresh. */
export async function refreshRates(current, force = false) {
  if (pendingRefresh) return pendingRefresh;
  if (!force && current?.live && Date.now() - Number(current.fetched || 0) < MAX_AGE) return null;
  const backoff = Math.min(30 * 60 * 1000, 15 * 1000 * (2 ** Math.min(failureCount, 7)));
  if (!force && lastFailureAt && Date.now() - lastFailureAt < backoff) return null;
  pendingRefresh = (async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', { credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!res.ok) throw new Error('rates_unavailable');
      const body = await res.json();
      if (body?.result !== 'success' || Number(body?.rates?.USD) !== 1 || !Number.isFinite(Number(body?.time_last_update_unix))) throw new Error('rates_invalid');
      const rates = {};
      CURRENCIES.forEach(code => {
        const value = Number(body.rates[code]);
        if (Number.isFinite(value) && value > 0) rates[code] = value;
      });
      if (!rates.PHP || !rates.EUR) throw new Error('rates_incomplete');
      const next = { rates: { ...FALLBACK, ...rates }, at: Number(body.time_last_update_unix) * 1000, fetched: Date.now(), live: true, provider: 'ExchangeRate-API' };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* cache is optional */ }
      failureCount = 0; lastFailureAt = 0;
      return next;
    } catch (error) {
      failureCount += 1; lastFailureAt = Date.now();
      throw error;
    } finally { pendingRefresh = null; }
  })();
  return pendingRefresh;
}

/** Converts between currencies through USD; unknown currencies remain unchanged rather than being guessed. */
export function convert(amount, from, to, rates = FALLBACK) {
  const n = Number(amount);
  if (!Number.isFinite(n) || !from || !to) return 0;
  if (from === to) return Math.round(n * 100000000) / 100000000;
  const a = Number(rates[from]); const b = Number(rates[to]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return n;
  return Math.round((n / a) * b * 100) / 100;
}

export function currencyName(code, locale = 'en') {
  try { return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) || code; } catch { return code; }
}

export function formatCurrency(value, code, locale = 'en-PH') {
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: code === 'JPY' || code === 'KRW' ? 0 : 2 }).format(Number(value) || 0); }
  catch { return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(value) || 0)} ${code}`; }
}

export function rateBetween(from, to, rates) {
  if (!rates || !Number.isFinite(Number(rates[from])) || !Number.isFinite(Number(rates[to])) || Number(rates[from]) <= 0) return null;
  return Number(rates[to]) / Number(rates[from]);
}

export function isRateStale(data, now = Date.now()) {
  return !data?.live || !Number.isFinite(Number(data.at)) || now - Number(data.at) > 36 * 3600 * 1000;
}


/**
 * Fetches an observed daily reference-rate series from Frankfurter.
 * Frankfurter is a separate central-bank reference-data source from the latest-rate feed above.
 * The cache key contains only a currency pair and range; no personal financial data is sent.
 */
export async function fetchRateHistory(from, to, range = '1M', now = Date.now()) {
  if (!CURRENCIES.includes(from) || !CURRENCIES.includes(to) || from === to || !HISTORY_DAYS[range]) throw new Error('history_pair_invalid');
  const end = new Date(now).toISOString().slice(0, 10);
  const start = new Date(now - HISTORY_DAYS[range] * 86400000).toISOString().slice(0, 10);
  const cacheKey = `${from}:${to}:${range}:${end}`;
  try {
    const cache = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    const hit = cache[cacheKey];
    if (hit?.points?.length && Date.now() - Number(hit.fetchedAt || 0) < HISTORY_AGE) return hit;
  } catch { /* cache is optional */ }
  if (historyRequests.has(cacheKey)) return historyRequests.get(cacheKey);
  const request = (async () => {
    const url = `https://api.frankfurter.dev/v2/rates?from=${start}&to=${end}&base=${encodeURIComponent(from)}&quotes=${encodeURIComponent(to)}`;
    const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('history_unavailable');
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length > 400) throw new Error('history_invalid');
    const byDate = new Map();
    rows.forEach(row => {
      const rate = Number(row?.rate);
      const dateMs = Date.parse(`${row?.date}T00:00:00Z`);
      if (row?.base !== from || row?.quote !== to || !/^\\d{4}-\\d{2}-\\d{2}$/.test(row?.date || '') || !Number.isFinite(dateMs) || dateMs < Date.parse(`${start}T00:00:00Z`) || dateMs > Date.parse(`${end}T23:59:59Z`) || !Number.isFinite(rate) || rate <= 0) return;
      byDate.set(row.date, { date: row.date, rate });
    });
    const points = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    if (!points.length) throw new Error('history_empty');
    const result = { from, to, range, start, end, provider: 'Frankfurter', fetchedAt: Date.now(), points };
    try {
      const cache = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
      cache[cacheKey] = result;
      const keys = Object.keys(cache);
      if (keys.length > 30) keys.slice(0, keys.length - 30).forEach(key => delete cache[key]);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(cache));
    } catch { /* cache is optional */ }
    return result;
  })();
  historyRequests.set(cacheKey, request);
  try { return await request; } finally { historyRequests.delete(cacheKey); }
}
