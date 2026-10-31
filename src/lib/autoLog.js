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
export const shortcutPrompt = (origin, key) => [
  'Create an iOS Shortcuts automation for MOVO transaction logging. Do not display this prompt in MOVO; it is copied only by the Copy prompt for Shortcuts button.',
  'Apple Pay trigger: Shortcuts > Automation > + > Transaction. Select Any Card or the cards I choose, select Run Immediately, and turn Notify When Run off if iOS offers that setting.',
  'If creating a separate bank-notification automation, only use a notification trigger if this iOS version actually offers one. Otherwise explain that Shortcuts cannot trigger directly from that banking app notification on this device. Never guess missing transaction details.',
  'Use Shortcut Input fields to set Amount, Merchant, Card or Account, and transaction date/reference if available. The request body is JSON, so do not URL-encode Merchant and do not place transaction details in the URL.',
  'Add Choose from Menu with prompt text: Log [Amount] transaction at [Merchant]? Add menu options Log and Skip.',
  'Under Skip, add Stop This Shortcut. Do not send a request or open MOVO.',
  'Under Log, add Get Contents of URL (never Open URLs) and set URL to ${origin}/api/log. Set Method to POST and Request Body to JSON. Add headers Content-Type: application/json and Authorization: Bearer ${key}.',
  'In the JSON body, map amount to the Amount variable, merchant to Merchant, card to Card or Account, source to the literal applepay, occurredAt to the transaction date if provided, and reference to the transaction reference if provided. Omit optional values that are unavailable; do not enter the bracketed labels as literal values.',
  'Turn Show When Run off if the action offers it. The Choose from Menu action still asks the user to select Log or Skip. Get Contents of URL sends the request without opening Safari.',
  'MOVO must be signed in with cloud storage and this device key must be registered in Automatic logging settings before background logging can succeed. After setup, test one small real transaction and verify the success response and exactly one saved expense in MOVO.'
].join(' ');

/** Constant-time comparison so the key can't be guessed by timing. */
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
