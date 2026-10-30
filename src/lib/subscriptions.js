/*
 * Subscription tracker: a catalog of common services, renewal-date maths and spending summaries.
 * Dates are calendar days ('YYYY-MM-DD'). Monthly and yearly plans keep their original day of the month, so a plan
 * that started on the 31st renews on the last day of shorter months and returns to the 31st afterwards.
 */
export const CYCLES = [['weekly', 'Weekly'], ['monthly', 'Monthly'], ['quarterly', 'Every 3 months'], ['yearly', 'Yearly']];
export const SUB_CATEGORIES = ['Entertainment', 'Music', 'AI Tools', 'Developer', 'Productivity', 'Design', 'Cloud storage', 'Gaming', 'Education', 'Health', 'Phone & internet', 'News', 'Shopping', 'Other'];

/* name, category, brand colour */
export const CATALOG = [
  ['Netflix', 'Entertainment', '#e50914'], ['YouTube Premium', 'Entertainment', '#ff0033'], ['Disney+', 'Entertainment', '#113ccf'], ['Prime Video', 'Entertainment', '#1a98ff'],
  ['HBO Max', 'Entertainment', '#5b2bd8'], ['Apple TV+', 'Entertainment', '#111111'], ['Viu', 'Entertainment', '#f5b400'], ['Crunchyroll', 'Entertainment', '#f47521'],
  ['Spotify', 'Music', '#1db954'], ['Apple Music', 'Music', '#fa2d48'], ['YouTube Music', 'Music', '#ff0033'],
  ['ChatGPT Plus', 'AI Tools', '#10a37f'], ['ChatGPT Go', 'AI Tools', '#10a37f'], ['Claude', 'AI Tools', '#d97757'], ['Gemini Pro', 'AI Tools', '#4f7df3'], ['Perplexity Pro', 'AI Tools', '#20808d'], ['Midjourney', 'AI Tools', '#222222'],
  ['GitHub Copilot', 'Developer', '#24292f'], ['GitHub Pro', 'Developer', '#24292f'], ['Cursor', 'Developer', '#111111'], ['Vercel Pro', 'Developer', '#000000'], ['Netlify Pro', 'Developer', '#00ad9f'],
  ['JetBrains', 'Developer', '#fe2857'], ['Docker Pro', 'Developer', '#1d63ed'], ['Supabase Pro', 'Developer', '#3ecf8e'],
  ['Notion', 'Productivity', '#191919'], ['Microsoft 365', 'Productivity', '#d83b01'], ['Google One', 'Cloud storage', '#4285f4'], ['iCloud+', 'Cloud storage', '#3693f3'], ['Dropbox', 'Cloud storage', '#0061fe'],
  ['Slack', 'Productivity', '#4a154b'], ['Zoom', 'Productivity', '#2d8cff'], ['Linear', 'Productivity', '#5e6ad2'],
  ['Figma', 'Design', '#a259ff'], ['Canva Pro', 'Design', '#00c4cc'], ['Adobe Creative Cloud', 'Design', '#da1f26'],
  ['Xbox Game Pass', 'Gaming', '#107c10'], ['PlayStation Plus', 'Gaming', '#0070d1'], ['Nintendo Switch Online', 'Gaming', '#e60012'],
  ['Duolingo Super', 'Education', '#58cc02'], ['Coursera Plus', 'Education', '#0056d2'],
  ['Gym membership', 'Health', '#ef6c00'], ['Mobile plan', 'Phone & internet', '#6d4aff'], ['Home internet', 'Phone & internet', '#0b8fd8'],
].map(([name, category, color]) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, category, color }));

const pad = (n) => String(n).padStart(2, '0');
const parse = (day) => { const [y, m, d] = String(day).split('-').map(Number); return { y, m, d }; };
const fmt = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const valid = (day) => /^\d{4}-\d{2}-\d{2}$/.test(day || '') && !Number.isNaN(Date.parse(`${day}T00:00:00Z`));
export const toDay = (date) => { const x = new Date(date); return fmt(x.getFullYear(), x.getMonth() + 1, x.getDate()); };
export const dayDiff = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/** The n-th billing date after `start` (n = 0 is the start itself). */
export function billingDate(start, cycle, n) {
  const { y, m, d } = parse(start);
  if (cycle === 'weekly') { const t = new Date(Date.UTC(y, m - 1, d + 7 * n)); return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
  const months = cycle === 'yearly' ? 12 : cycle === 'quarterly' ? 3 : 1;
  const total = (m - 1) + months * n; const yy = y + Math.floor(total / 12); const mm = (total % 12) + 1;
  return fmt(yy, mm, Math.min(d, daysIn(yy, mm)));
}

/** First billing date on or after `from`, or '' for an invalid or inactive subscription. */
export function nextRenewal(sub, from) {
  if (!sub || sub.status === 'cancelled' || sub.status === 'paused' || !valid(sub.start)) return '';
  const fromDay = toDay(from);
  if (sub.start >= fromDay) return sub.start;
  const approxDays = { weekly: 7, monthly: 30.44, quarterly: 91.31, yearly: 365.25 }[sub.cycle] || 30.44;
  let n = Math.max(0, Math.floor(dayDiff(sub.start, fromDay) / approxDays) - 1);
  let day = billingDate(sub.start, sub.cycle, n);
  while (day < fromDay) { n += 1; day = billingDate(sub.start, sub.cycle, n); }
  return day;
}

/** Every billing date between two days, inclusive. */
export function renewalsBetween(sub, fromDay, toDayStr) {
  const out = []; let day = nextRenewal(sub, `${fromDay}T00:00:00`);
  if (!day) return out;
  let n = 0; const first = day;
  while (day && day <= toDayStr && n < 400) { out.push(day); n += 1; day = billingDate(first, sub.cycle, n); }
  return out;
}

/** Average monthly cost of a subscription in its own currency. */
export function monthlyCost(sub) {
  const amount = Number(sub.amount);
  if (!Number.isFinite(amount) || amount <= 0 || sub.status === 'cancelled' || sub.status === 'paused') return 0;
  return { weekly: amount * 52 / 12, monthly: amount, quarterly: amount / 3, yearly: amount / 12 }[sub.cycle] ?? amount;
}

/** Totals in the home currency (via `toBase`) plus what renews soon. */
export function summarize(subs, ref, toBase = (v) => v) {
  const today = toDay(ref);
  const active = subs.filter(s => s.status !== 'cancelled' && s.status !== 'paused');
  const monthly = active.reduce((s, x) => s + toBase(monthlyCost(x), x.currency), 0);
  const upcoming = active.map(s => ({ ...s, next: nextRenewal(s, ref) })).filter(s => s.next).sort((a, b) => (a.next < b.next ? -1 : a.next > b.next ? 1 : 0));
  const dueSoon = upcoming.filter(s => dayDiff(today, s.next) <= 7);
  const byCategory = {};
  active.forEach(s => { byCategory[s.category || 'Other'] = (byCategory[s.category || 'Other'] || 0) + toBase(monthlyCost(s), s.currency); });
  return {
    monthly, annual: monthly * 12, activeCount: active.length, upcoming, dueSoon,
    dueSoonTotal: dueSoon.reduce((s, x) => s + toBase(Number(x.amount) || 0, x.currency), 0),
    byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
  };
}

export const catalogFor = (name = '') => CATALOG.find(c => c.name.toLowerCase() === String(name).toLowerCase());
