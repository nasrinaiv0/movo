export const TZ = 'Asia/Manila';

export const money = (value, currency = 'PHP', digits = 2) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value) || 0);

export const HIDDEN = '₱ ••••••';
export const shown = (show, text) => (show ? text : HIDDEN);

const fmt = (options) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...options });
const dayFmt = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' });
const longDay = fmt({ month: 'short', day: 'numeric', year: 'numeric' });
const monthYear = fmt({ month: 'short', year: 'numeric' });
const timeFmt = fmt({ hour: 'numeric', minute: '2-digit' });

/** yyyy-mm-dd in the app time zone. */
export function dayKey(date) {
  const parts = Object.fromEntries(dayFmt.formatToParts(new Date(date)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export const monthKey = (date) => dayKey(date).slice(0, 7);
export const longDate = (date) => longDay.format(new Date(date));
export const timeLabel = (date) => timeFmt.format(new Date(date));
const timeSecFmt = fmt({ hour: 'numeric', minute: '2-digit', second: '2-digit' });
export const timeLabelFull = (date) => timeSecFmt.format(new Date(date));
export const monthLabel = (key) => monthYear.format(new Date(`${key}-15T12:00:00+08:00`));
export const monthRange = (key) => {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const name = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
  return `${name} 1, ${y} - ${name} ${last}, ${y}`;
};

/** "Today", "Yesterday" or "Oct 26, 2026", relative to `ref`. */
export function relativeDay(date, ref = new Date()) {
  const key = dayKey(date);
  const today = dayKey(ref);
  if (key === today) return 'Today';
  const y = new Date(ref); y.setDate(y.getDate() - 1);
  if (key === dayKey(y)) return 'Yesterday';
  return longDate(date);
}

export const greeting = (date = new Date()) => {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(date)) % 24;
  return hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';
};

export const signed = (type, amount, currency = 'PHP') =>
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
