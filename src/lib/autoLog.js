import { findReference } from './ocr';

/*
 * Payment links from phone automations, e.g. an iOS Shortcuts "Transaction" automation (Apple Pay) or an Android
 * automation reading Google Wallet / bank notifications. They open:
 *   https://movo.nasrinai.com/#log?src=applepay&k=<device key>&amount=<Amount>&merchant=<Merchant>&card=<Card>
 * A link only logs automatically when its key matches the secret generated on this device and auto-log is on;
 * anything else is shown as a prompt, so a link from a website or message can never add records by itself.
 */
const SOURCES = { applepay: 'Apple Pay', googlepay: 'Google Pay', notification: 'Notification', bank: 'Bank alert' };
const SEEN = 'movo.autolog.seen.v1';

export const newKey = () => {
  const bytes = new Uint8Array(16); window.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

export const linkTemplate = (origin, key, src = 'applepay') => `${origin}/#log?src=${src}&k=${key}&amount=AMOUNT&merchant=MERCHANT&card=CARD`;

/**
 * A plain-language prompt for the iPhone Shortcuts "Describe a shortcut" box (Apple Intelligence). It is kept in
 * English on purpose: it is read by Shortcuts, not shown as interface text. It carries the person's private link.
 */
/**
 * Builds a private iOS Shortcuts prompt. The prompt is copied only when the user selects a mode button.
 * mode="automatic" logs silently then shows a notification; mode="interactive" asks Log / Skip first.
 */
/**
 * Builds a private iOS Shortcuts prompt. mode="automatic" logs then notifies;
 * mode="interactive" asks the user to choose Log or Skip.
 */
export const shortcutPrompt = (origin, key, mode = 'interactive') => {
  const shared = [
    'Create an iOS Shortcuts automation for MOVO transaction logging.',
    'Apple Pay trigger: Shortcuts > Automation > + > Transaction. Select Any Card or the cards I choose, select Run Immediately, and turn Notify When Run off if iOS offers that setting.',
    'Only create a separate bank-notification automation if this iOS version actually offers a suitable trigger. Never guess missing transaction details.',
    'Use Shortcut Input fields for Amount, Merchant, Card or Account, and transaction date/reference if available. Send JSON; do not URL-encode Merchant or put transaction details in the URL.',
    `Send the request to ${origin}/api/log using Get Contents of URL (never Open URLs), Method POST, Request Body JSON, and headers Content-Type: application/json and Authorization: Bearer ${key}.`,
    'Map amount to Amount, merchant to Merchant, card to Card or Account, source to applepay, occurredAt to the transaction date if available, and reference to the transaction reference if available. Omit unavailable optional values.',
    'Turn Show When Run off for the network action if available. Get Contents of URL sends the request without opening Safari.',
    'MOVO must be signed in with cloud storage and this device key must be registered in Automatic logging settings. Test with one small real transaction and verify exactly one expense is saved.'
  ];
  if (mode === 'voice') return [
    'Create an iOS shortcut named “Log to MOVO” that I can run by saying “Hey Siri, Log to MOVO”.',
    'Add Dictate Text (language: the language I speak, stop listening: after pause). Do not add Choose from Menu or Ask for Input.',
    `Add Get Contents of URL to ${origin}/api/log (never Open URLs), Method POST, Request Body JSON, headers Content-Type: application/json and Authorization: Bearer ${key}.`,
    'JSON fields: text set to the Dictated Text, source set to siri_shortcut. Do not add amount or merchant; MOVO reads them from the sentence and asks again if it is unclear.',
    'Add Get Dictionary Value for key message from the response, then Speak Text with that value. If the response has no message or an error, speak “MOVO could not log that, please try again” and never claim it was logged.',
    'Example sentences: “I spent 150 pesos on lunch”, “I received 2,000 pesos from work”, “I paid 500 for electricity yesterday using my BPI card”.',
    'MOVO must be signed in with cloud storage and this device key must be registered in Automatic logging settings.'
  ].join(' ');
  if (mode === 'automatic') return [
    'Name the automation “Auto MOVO Transactions”.',
    'MOVO recognises the same purchase if a bank alert or another device also reports it, so it is never logged twice.',
    'Create a fully automatic iOS Shortcuts transaction automation for MOVO. Do not add menus, Ask for Input, confirmation dialogs, or any action requiring a tap.',
    ...shared,
    'After the POST, add Show Notification titled “MOVO · Transaction logged” with body “Logged [Amount] at [Merchant]”. Only show success after the server confirms success. On failure, show a failure notification and never claim it logged.',
    'This mode needs no manual choice after the automation trigger. Do not invent unsupported bank-app triggers or assume notification data is available.'
  ].join(' ');
  return [
    'Name the automation “Auto MOVO Transactions”.',
    'Create an iOS Shortcuts transaction automation for MOVO with an interactive Log / Skip choice before sending any transaction.',
    'MOVO recognises the same purchase if a bank alert or another device also reports it, so it is never logged twice.',
    ...shared,
    'Add Choose from Menu with prompt “Log [Amount] transaction at [Merchant]?” and exactly two options: Log and Skip.',
    'Under Skip, add Stop This Shortcut. Do not send a request or open MOVO.',
    'Under Log, send the POST request described above. Show success only after a successful response; otherwise show a failure notification.'
  ].join(' ');
};/** Constant-time comparison so the key can't be guessed by timing. */
export function sameKey(a = '', b = '') {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Parses "₱1,234.50", "PHP 99" or "1.234,50" style amounts from automations. */
export function parseAmount(raw = '') {
  let s = String(raw).replace(/[^\d.,-]/g, '');
  if (/,\d{2}$/.test(s) && !/\.\d{2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  const n = Math.abs(Number(s.replace(/,/g, '')));
  return Number.isFinite(n) && n > 0 && n < 1e9 ? Math.round(n * 100) / 100 : 0;
}

export function readLogLink(hash = '') {
  const m = /^#\/?log\?(.*)$/.exec(hash); if (!m) return null;
  const p = new URLSearchParams(m[1]);
  const amount = parseAmount(p.get('amount'));
  const merchant = (p.get('merchant') || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 160);
  if (!amount) return { invalid: true };
  const src = SOURCES[p.get('src')] ? p.get('src') : 'notification';
  const text = (p.get('text') || '').slice(0, 1000);
  const ref = ((p.get('ref') || '').replace(/[^\w-]/g, '') || findReference(text)).toUpperCase().slice(0, 40);
  const when = Date.parse(p.get('date') || '');
  return { amount, merchant: merchant || SOURCES[src], card: (p.get('card') || '').trim().slice(0, 100), src, source: SOURCES[src], key: p.get('k') || '', ref, at: Number.isFinite(when) && Math.abs(Date.now() - when) < 7 * 86400000 ? new Date(when).toISOString() : '' };
}

/** Drops repeats of the same payment that arrive within two minutes (automations can fire twice). */
export function isRepeat(entry) {
  const id = `${entry.src}|${entry.amount}|${entry.merchant.toLowerCase()}`; const now = Date.now();
  let seen = [];
  try { seen = (JSON.parse(localStorage.getItem(SEEN)) || []).filter(s => now - s.t < 120000); } catch { seen = []; }
  const repeat = seen.some(s => s.id === id);
  try { localStorage.setItem(SEEN, JSON.stringify([...seen, { id, t: now }].slice(-50))); } catch { /* ignore */ }
  return repeat;
}

const GENERIC = new Set(['account', 'card', 'wallet', 'bank', 'using', 'with', 'from', 'gamit']);
export function matchAccount(card, accounts) {
  const c = card.toLowerCase();
  const words = c.split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 4 && !GENERIC.has(w));
  return (c && accounts.find(a => c.includes(a.name.toLowerCase()) || (a.institution_name && c.includes(a.institution_name.toLowerCase())) || (a.mask && c.includes(a.mask))))
    // "my savings" finds "BPI Savings": any distinctive word of the hint names the account.
    || (words.length && accounts.find(a => `${a.name} ${a.institution_name || ''}`.toLowerCase().split(/[^\p{L}\p{N}]+/u).some(w => words.includes(w))))
    || accounts.find(a => a.account_type === 'card') || accounts[0] || null;
}
