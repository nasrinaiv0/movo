/*
 * Currency conversion for totals across accounts in different currencies.
 * Live reference rates (USD base) come from open.er-api.com, refreshed at most every 12 hours and cached on the
 * device; only currency codes are requested, never any financial data. Offline, approximate built-in rates are used.
 */
export const CURRENCIES = ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'INR', 'SGD', 'HKD', 'TWD', 'AUD', 'NZD', 'CAD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'MAD', 'ILS', 'MYR', 'IDR', 'THB', 'VND', 'PKR', 'BDT', 'MXN', 'BRL', 'ARS', 'ZAR', 'NGN'];

// Approximate units per 1 USD, used only until live rates load.
const FALLBACK = { USD: 1, PHP: 58, EUR: 0.92, GBP: 0.78, JPY: 150, CNY: 7.2, KRW: 1380, INR: 84, SGD: 1.34, HKD: 7.8, TWD: 32, AUD: 1.52, NZD: 1.66, CAD: 1.37, CHF: 0.88, SEK: 10.6, NOK: 10.8, DKK: 6.9, PLN: 3.95, TRY: 34, AED: 3.6725, SAR: 3.75, QAR: 3.64, KWD: 0.307, BHD: 0.376, OMR: 0.385, EGP: 48.5, MAD: 9.9, ILS: 3.7, MYR: 4.5, IDR: 15800, THB: 35, VND: 25000, PKR: 280, BDT: 118, MXN: 18.5, BRL: 5.5, ARS: 950, ZAR: 18, NGN: 1500 };
const KEY = 'movo.fx.v1';
const MAX_AGE = 12 * 3600 * 1000;

export function loadRates() {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY));
    if (cached?.rates?.USD === 1) return { ...cached, rates: { ...FALLBACK, ...cached.rates } };
  } catch { /* ignore */ }
  return { rates: FALLBACK, at: 0, live: false };
}

export async function refreshRates(current) {
  if (current?.live && Date.now() - current.fetched < MAX_AGE) return null;
  const res = await fetch('https://open.er-api.com/v6/latest/USD', { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error('rates_unavailable');
  const body = await res.json();
  if (body?.result !== 'success' || body?.rates?.USD !== 1) throw new Error('rates_invalid');
  const rates = {};
  CURRENCIES.forEach(c => { const r = Number(body.rates[c]); if (Number.isFinite(r) && r > 0) rates[c] = r; });
  const next = { rates: { ...FALLBACK, ...rates }, at: (Number(body.time_last_update_unix) || Date.now() / 1000) * 1000, fetched: Date.now(), live: true };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

/** Converts between currencies through USD; unknown codes are left unconverted. */
export function convert(amount, from, to, rates = FALLBACK) {
  const n = Number(amount) || 0;
  if (!from || !to || from === to) return n;
  const a = rates[from]; const b = rates[to];
  if (!a || !b) return n;
  return Math.round((n / a) * b * 100) / 100;
}

export function currencyName(code, locale = 'en') {
  try { return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) || code; } catch { return code; }
}
