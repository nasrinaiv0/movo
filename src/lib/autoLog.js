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

/*
 * iPhone Shortcuts setup. One recipe drives both the prompt copied for “Describe a shortcut” (Apple Intelligence) and
 * the step-by-step list shown in MOVO, so the two never drift apart. It names the exact Shortcuts actions and fields,
 * keeps the device key in the Authorization header only, and shows MOVO's own reply (`message`), which the server
 * always sends for successes and failures, so the shortcut never claims a payment was logged when it was not.
 * The text is English on purpose: it is read by Shortcuts, not shown as interface text.
 */
export function shortcutRecipe(origin, key, mode = `interactive`) {
  const url = `${origin}/api/log`;
  const post = (fields) => `Get Contents of URL — URL: ${url} · Method POST · Headers: Authorization: Bearer ${key} and Content-Type: application/json · Request Body JSON with Text fields ${fields}.`;
  const date = `Format Date — Date: Current Date · Date Format: ISO 8601 · Include ISO 8601 Time: on.`;
  const payment = post(`amount = Shortcut Input › Amount, merchant = Shortcut Input › Merchant, card = Shortcut Input › Card or Pass, source = applepay, occurredAt = Formatted Date`);
  const reply = `Get Dictionary Value — Get Value for Key message in Contents of URL.`;
  const trigger = `Shortcuts → Automation → + → Transaction → choose the Apple Pay cards to track → Run Immediately → turn off Notify When Run → Next → New Blank Automation.`;
  if (mode === `voice`) return {
    name: `Log to MOVO`,
    trigger: `Shortcuts → + (new shortcut) → rename it “Log to MOVO” (Siri runs it when you say “Hey Siri, Log to MOVO”).`,
    steps: [
      `Dictate Text — Language: the language you speak · Stop Listening: After Pause.`,
      post(`text = Dictated Text, source = siri_shortcut`),
      reply,
      `Speak Text — Dictionary Value.`,
    ],
  };
  if (mode === `automatic`) return {
    name: `Auto MOVO Transactions`,
    trigger,
    steps: [date, payment, reply, `Show Notification — Title: MOVO · Body: Dictionary Value.`],
  };
  return {
    name: `Auto MOVO Transactions`,
    trigger,
    steps: [
      `Choose from Menu — Prompt: Log Shortcut Input › Amount at Shortcut Input › Merchant in MOVO? · Options: Log and Skip.`,
      `Under Log: ${date}`,
      `Under Log: ${payment}`,
      `Under Log: ${reply}`,
      `Under Log: Show Notification — Title: MOVO · Body: Dictionary Value.`,
      `Under Skip: Stop This Shortcut (no request is sent).`,
      `End Menu.`,
    ],
  };
}

/** The recipe as one prompt for “Describe a shortcut”. */
export const shortcutPrompt = (origin, key, mode = 'interactive') => {
  const r = shortcutRecipe(origin, key, mode);
  return [
    mode === 'voice' ? `Create an iOS shortcut named “${r.name}”.` : `Create an iOS Shortcuts personal automation named “${r.name}” for MOVO transaction logging.`,
    `Setup: ${r.trigger}`,
    'Add exactly these actions, in this order, and nothing else:',
    ...r.steps.map((step, i) => `${i + 1}. ${step}`),
    'Rules: use Get Contents of URL and never Open URLs, Safari or a web view. Put the device key only in the Authorization header, never in the URL. Use the field names exactly as written, in lowercase.',
    mode === 'automatic' ? 'Do not add menus, Ask for Input, Choose from List, alerts or any action that needs a tap.' : mode === 'interactive' ? 'Only the Log and Skip menu may ask for a tap; under Skip, stop without sending anything.' : 'Do not add amount or merchant fields: MOVO reads them from the sentence and replies with a question when it is unclear.',
    'Always show or speak MOVO’s reply (the message value) as it is: never claim it was logged unless MOVO says so.',
    'MOVO recognises the same purchase if a bank alert or another device also reports it, so it is never logged twice.',
  ].join('\n');
};

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
