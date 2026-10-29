import { t } from './i18n';

/* Dates follow the device time zone; numbers, currencies and dates follow the chosen language. */
export const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila'; } catch { return 'Asia/Manila'; } })();
let LOCALE = 'en-PH';
let BASE = 'PHP';
const cache = new Map();
const cached = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
export function setFormatLocale(locale) { if (locale && locale !== LOCALE) { LOCALE = locale; cache.clear(); } }
export const getFormatLocale = () => LOCALE;
export function setBaseCurrency(code) { if (/^[A-Z]{3}$/.test(code || '')) BASE = code; }
export const baseCurrency = () => BASE;

const fractionDigits = (currency) => cached(`fd:${currency}`, () => { try { return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits; } catch { return 2; } });
export const money = (value, currency = BASE, digits = 2) => {
  const d = Math.min(digits, fractionDigits(currency));
  return cached(`m:${LOCALE}:${currency}:${d}`, () => new Intl.NumberFormat(LOCALE, { style: 'currency', currency, minimumFractionDigits: d, maximumFractionDigits: d })).format(Number(value) || 0);
};
export const currencySymbol = (currency = BASE) => cached(`sym:${LOCALE}:${currency}`, () => {
  try { return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find(p => p.type === 'currency')?.value || currency; } catch { return currency; }
});
export const number = (value, digits = 0) => cached(`n:${LOCALE}:${digits}`, () => new Intl.NumberFormat(LOCALE, { maximumFractionDigits: digits })).format(Number(value) || 0);

export const HIDDEN = '••••••';
export const shown = (show, text) => (show ? text : HIDDEN);

const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const dateFmt = (name, options) => cached(`d:${LOCALE}:${name}`, () => new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, ...options }));
export const formatDate = (date, options, name = JSON.stringify(options)) => dateFmt(name, options).format(new Date(date));

/** yyyy-mm-dd in the device time zone. */
export function dayKey(date) {
  const parts = Object.fromEntries(dayFmt.formatToParts(new Date(date)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export const monthKey = (date) => dayKey(date).slice(0, 7);
export const longDate = (date) => dateFmt('long', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
export const timeLabel = (date) => dateFmt('time', { hour: 'numeric', minute: '2-digit' }).format(new Date(date));
export const timeLabelFull = (date) => dateFmt('timeSec', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(date));
export const monthLabel = (key) => dateFmt('monthYear', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-15T12:00:00Z`));
export const monthRange = (key) => {
  const [y, m] = key.split('-').map(Number);
  const f = dateFmt('mdy', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return `${f.format(new Date(Date.UTC(y, m - 1, 1)))} – ${f.format(new Date(Date.UTC(y, m, 0)))}`;
};

/** "Today", "Yesterday" or a short date, relative to `ref`. */
export function relativeDay(date, ref = new Date()) {
  const key = dayKey(date);
  if (key === dayKey(ref)) return t('Today');
  const y = new Date(ref); y.setDate(y.getDate() - 1);
  if (key === dayKey(y)) return t('Yesterday');
  return longDate(date);
}

export const greeting = (date = new Date()) => {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(date)) % 24;
  return `${hour < 12 ? t('Good morning') : hour < 18 ? t('Good afternoon') : t('Good evening')},`;
};

export const signed = (type, amount, currency = BASE) =>
  (type === 'income' ? '+' : type === 'transfer' ? '' : '−') + money(amount, currency);

/** Smooth SVG path through points, scaled to a w×h box. */
export function smoothPath(values, w, h, pad = 6) {
  if (!values.length) return '';
  const max = Math.max(...values); const min = Math.min(...values); const span = max - min || 1;
  const pts = values.map((v, i) => [pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2), h - pad - ((v - min) / span) * (h - pad * 2)]);
  if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}L${w - pad} ${pts[0][1]}`;
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]; const cx = (x0 + x1) / 2;
    d += `C${cx.toFixed(1)} ${y0.toFixed(1)} ${cx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

export const BUCKETS = [
  { key: 'Food', color: '#4d8dff' },
  { key: 'Shopping', color: '#f7b73e' },
  { key: 'Bills', color: '#ff6b7b' },
  { key: 'Transportation', color: '#9a7bff' },
  { key: 'Others', color: '#8e98ac' },
];
export function bucketOf(category = '') {
  if (['Groceries', 'Food & drinks'].includes(category)) return 'Food';
  if (category === 'Shopping') return 'Shopping';
  if (['Bills', 'Subscriptions'].includes(category)) return 'Bills';
  if (category === 'Transport') return 'Transportation';
  return 'Others';
}

/** Tone of the category chip shown next to a transaction. */
export const chipTone = (t) => {
  if (t.type === 'transfer') return 'gray';
  if (t.type === 'income') return 'green';
  return { Groceries: 'orange', Transport: 'blue', Subscriptions: 'violet', 'Food & drinks': 'violet', Shopping: 'amber', Bills: 'red', Health: 'teal' }[t.category] || 'gray';
};
export const chipLabel = (t) => (t.type === 'transfer' ? 'Transfer' : t.category === 'Transport' ? 'Transportation' : t.category || 'Other');

/** Neutral monogram tile colours (no third-party logos are reproduced). */
const TILES = ['#1f6fff', '#12a66a', '#111827', '#e5484d', '#f08a24', '#7c5cf0', '#0e9aa7', '#c2410c'];
export function tileFor(name = '?') {
  let hash = 0; for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  const words = name.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
  return { background: TILES[hash % TILES.length], initials };
}
