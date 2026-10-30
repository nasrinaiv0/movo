/*
 * Subscription tracker: a catalog of common services, renewal-date maths and spending summaries.
 * Dates are calendar days ('YYYY-MM-DD'). Monthly and yearly plans keep their original day of the month, so a plan
 * that started on the 31st renews on the last day of shorter months and returns to the 31st afterwards.
 */
export const CYCLES = [['weekly', 'Weekly'], ['monthly', 'Monthly'], ['quarterly', 'Every 3 months'], ['yearly', 'Yearly']];
export const SUB_CATEGORIES = ['Entertainment', 'Music', 'AI Tools', 'Developer', 'Productivity', 'Design', 'Cloud storage', 'Security & VPN', 'Gaming', 'Education', 'Health', 'Food & delivery', 'Shopping', 'Phone & internet', 'News', 'Other'];

/*
 * name, category, brand colour, Simple Icons slug for the official mark ('' = initials), region ('' = global, 'US', 'PH').
 * Marks are trademarks of their owners, shown only to identify each service (see BRAND_NOTICE in the UI).
 */
export const CATALOG = [
  // Video
  ['Netflix', 'Entertainment', '#e50914', 'netflix', ''], ['YouTube Premium', 'Entertainment', '#ff0000', 'youtube', ''], ['Disney+', 'Entertainment', '#113ccf', '', ''],
  ['Prime Video', 'Entertainment', '#1a98ff', '', ''], ['HBO Max', 'Entertainment', '#002be7', 'hbomax', ''], ['Apple TV+', 'Entertainment', '#111111', 'appletv', ''],
  ['Crunchyroll', 'Entertainment', '#f47521', 'crunchyroll', ''], ['Paramount+', 'Entertainment', '#0064ff', 'paramountplus', 'US'], ['Hulu', 'Entertainment', '#1ce783', '', 'US'],
  ['Peacock', 'Entertainment', '#111111', '', 'US'], ['ESPN+', 'Entertainment', '#e2231a', '', 'US'], ['YouTube TV', 'Entertainment', '#ff0000', 'youtubetv', 'US'],
  ['Sling TV', 'Entertainment', '#1c75bc', '', 'US'], ['Fubo', 'Entertainment', '#e4002b', 'fubo', 'US'], ['Starz', 'Entertainment', '#111111', 'starz', 'US'],
  ['MUBI', 'Entertainment', '#001489', 'mubi', ''], ['DAZN', 'Entertainment', '#0c161c', 'dazn', ''], ['Plex Pass', 'Entertainment', '#ebaf00', 'plex', ''],
  ['Viu', 'Entertainment', '#f5b400', '', 'PH'], ['iWantTFC', 'Entertainment', '#0033a0', '', 'PH'], ['Vivamax', 'Entertainment', '#c8102e', '', 'PH'],
  ['iQIYI', 'Entertainment', '#00be06', '', 'PH'], ['WeTV', 'Entertainment', '#ff6a00', '', 'PH'], ['Bilibili', 'Entertainment', '#00a1d6', 'bilibili', 'PH'],
  ['Cignal Play', 'Entertainment', '#e30613', '', 'PH'], ['Twitch Turbo', 'Entertainment', '#9146ff', 'twitch', ''],
  // Music and audio
  ['Spotify', 'Music', '#1db954', 'spotify', ''], ['Apple Music', 'Music', '#fa243c', 'applemusic', ''], ['YouTube Music', 'Music', '#ff0000', 'youtubemusic', ''],
  ['Tidal', 'Music', '#111111', 'tidal', ''], ['Pandora', 'Music', '#224099', 'pandora', 'US'], ['SiriusXM', 'Music', '#0000eb', '', 'US'], ['Audible', 'Music', '#f8991c', 'audible', ''],
  // AI
  ['ChatGPT Plus', 'AI Tools', '#10a37f', '', ''], ['ChatGPT Go', 'AI Tools', '#10a37f', '', ''], ['Claude', 'AI Tools', '#d97757', 'claude', ''],
  ['Gemini Pro', 'AI Tools', '#8e75b2', 'googlegemini', ''], ['Perplexity Pro', 'AI Tools', '#1fb8cd', 'perplexity', ''], ['Midjourney', 'AI Tools', '#222222', '', ''],
  ['Grammarly', 'AI Tools', '#027e6f', 'grammarly', ''],
  // Developer
  ['GitHub Copilot', 'Developer', '#24292f', 'githubcopilot', ''], ['GitHub Pro', 'Developer', '#181717', 'github', ''], ['Cursor', 'Developer', '#111111', 'cursor', ''],
  ['Vercel Pro', 'Developer', '#000000', 'vercel', ''], ['Netlify Pro', 'Developer', '#00ad9f', 'netlify', ''], ['JetBrains', 'Developer', '#000000', 'jetbrains', ''],
  ['Docker Pro', 'Developer', '#2496ed', 'docker', ''], ['Supabase Pro', 'Developer', '#3fcf8e', 'supabase', ''],
  // Productivity, design, storage
  ['Notion', 'Productivity', '#191919', 'notion', ''], ['Microsoft 365', 'Productivity', '#d83b01', '', ''], ['Slack', 'Productivity', '#4a154b', '', ''],
  ['Zoom', 'Productivity', '#0b5cff', 'zoom', ''], ['Linear', 'Productivity', '#5e6ad2', 'linear', ''], ['Evernote', 'Productivity', '#00a82d', 'evernote', ''],
  ['Todoist', 'Productivity', '#e44332', 'todoist', ''], ['LinkedIn Premium', 'Productivity', '#0a66c2', '', ''], ['QuickBooks', 'Productivity', '#2ca01c', 'quickbooks', 'US'],
  ['Mailchimp', 'Productivity', '#241c15', 'mailchimp', ''], ['Telegram Premium', 'Productivity', '#26a5e4', 'telegram', ''], ['Discord Nitro', 'Productivity', '#5865f2', 'discord', ''],
  ['X Premium', 'Productivity', '#000000', 'x', ''],
  ['Figma', 'Design', '#a259ff', 'figma', ''], ['Canva Pro', 'Design', '#00c4cc', '', ''], ['Adobe Creative Cloud', 'Design', '#da1f26', '', ''],
  ['Google One', 'Cloud storage', '#4285f4', 'googledrive', ''], ['iCloud+', 'Cloud storage', '#3693f3', 'icloud', ''], ['Dropbox', 'Cloud storage', '#0061fe', 'dropbox', ''],
  ['Box', 'Cloud storage', '#0061d5', 'box', ''], ['Proton', 'Cloud storage', '#6d4aff', 'proton', ''],
  // Security
  ['1Password', 'Security & VPN', '#3b66bc', '1password', ''], ['Bitwarden', 'Security & VPN', '#175ddc', 'bitwarden', ''], ['Dashlane', 'Security & VPN', '#0e353d', 'dashlane', ''],
  ['LastPass', 'Security & VPN', '#d32d27', 'lastpass', ''], ['NordVPN', 'Security & VPN', '#4687ff', 'nordvpn', ''], ['ExpressVPN', 'Security & VPN', '#da3940', 'expressvpn', ''],
  ['Surfshark', 'Security & VPN', '#178a9e', 'surfshark', ''], ['Proton VPN', 'Security & VPN', '#66deb1', 'protonvpn', ''], ['Ring Protect', 'Security & VPN', '#1c9ad6', 'ring', 'US'],
  // Gaming
  ['Xbox Game Pass', 'Gaming', '#107c10', '', ''], ['PlayStation Plus', 'Gaming', '#0070d1', 'playstation', ''], ['Nintendo Switch Online', 'Gaming', '#e60012', '', ''],
  ['Apple Arcade', 'Gaming', '#111111', 'applearcade', ''], ['Ubisoft+', 'Gaming', '#000000', 'ubisoft', ''], ['Google Play Pass', 'Gaming', '#414141', 'googleplay', ''],
  // Learning
  ['Duolingo Super', 'Education', '#58cc02', 'duolingo', ''], ['Coursera Plus', 'Education', '#0056d2', 'coursera', ''], ['Udemy', 'Education', '#a435f0', 'udemy', ''],
  ['Skillshare', 'Education', '#00ff84', 'skillshare', ''], ['MasterClass', 'Education', '#111111', '', 'US'], ['Medium', 'Education', '#000000', 'medium', ''], ['Patreon', 'Education', '#000000', 'patreon', ''],
  // Health
  ['Peloton', 'Health', '#181a1d', 'peloton', 'US'], ['Strava', 'Health', '#fc4c02', 'strava', ''], ['Headspace', 'Health', '#f47d31', 'headspace', ''], ['Calm', 'Health', '#4a90e2', '', ''],
  ['Planet Fitness', 'Health', '#5c2d91', '', 'US'], ['Anytime Fitness', 'Health', '#5e2d91', '', 'PH'], ['Gym membership', 'Health', '#ef6c00', '', ''],
  // Food, delivery and shopping
  ['DoorDash DashPass', 'Food & delivery', '#ff3008', 'doordash', 'US'], ['Uber One', 'Food & delivery', '#000000', 'uber', ''], ['Instacart+', 'Food & delivery', '#43b02a', 'instacart', 'US'],
  ['Grubhub+', 'Food & delivery', '#ff8000', '', 'US'], ['HelloFresh', 'Food & delivery', '#99cc33', 'hellofresh', 'US'], ['GrabUnlimited', 'Food & delivery', '#00b14f', 'grab', 'PH'],
  ['foodpanda pandapro', 'Food & delivery', '#d70f64', 'foodpanda', 'PH'],
  ['Amazon Prime', 'Shopping', '#ff9900', '', 'US'], ['Walmart+', 'Shopping', '#0071ce', '', 'US'], ['Costco membership', 'Shopping', '#e31837', '', 'US'],
  ['Shopee VIP', 'Shopping', '#ee4d2d', 'shopee', 'PH'], ['LazMall / LazPlus', 'Shopping', '#0f146d', '', 'PH'],
  // News
  ['The New York Times', 'News', '#000000', 'newyorktimes', 'US'], ['The Wall Street Journal', 'News', '#0274b6', '', 'US'], ['The Washington Post', 'News', '#111111', '', 'US'],
  ['Inquirer Plus', 'News', '#003b7b', '', 'PH'], ['Philstar+', 'News', '#c8102e', '', 'PH'],
  // Phone, internet and TV (US)
  ['Verizon', 'Phone & internet', '#cd040b', 'verizon', 'US'], ['T-Mobile', 'Phone & internet', '#e20074', '', 'US'], ['AT&T', 'Phone & internet', '#00a8e0', '', 'US'], ['Xfinity', 'Phone & internet', '#6138f5', '', 'US'],
  // Phone, internet and TV (Philippines)
  ['Globe Postpaid', 'Phone & internet', '#0056b8', '', 'PH'], ['Globe At Home', 'Phone & internet', '#0056b8', '', 'PH'], ['Smart Postpaid', 'Phone & internet', '#00a651', '', 'PH'],
  ['DITO', 'Phone & internet', '#e4002b', '', 'PH'], ['PLDT Home Fiber', 'Phone & internet', '#e4002b', '', 'PH'], ['Converge FiberX', 'Phone & internet', '#5b2c86', '', 'PH'],
  ['Sky Fiber', 'Phone & internet', '#00a3e0', '', 'PH'], ['Cignal TV', 'Phone & internet', '#e30613', '', 'PH'],
  ['Mobile plan', 'Phone & internet', '#6d4aff', '', ''], ['Home internet', 'Phone & internet', '#0b8fd8', '', ''],
].map(([name, category, color, mark, region]) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, category, color, mark, region }));

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
