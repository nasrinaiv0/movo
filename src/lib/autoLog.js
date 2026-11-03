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
  if (mode === `voice` || mode === `voice-interactive`) {
    const interactive = mode === `voice-interactive`;
    return {
    name: `Log to MOVO`,
    trigger: `Shortcuts → + (new shortcut) → rename it “Log to MOVO” (Siri runs it when you say “Hey Siri, Log to MOVO”).`,
    steps: [
      `Dictate Text — Language: the language you speak · Stop Listening: After Pause.`,
      ...(interactive ? [
        `Choose from Menu — Prompt: Review this dictated transaction before sending to MOVO? Show Dictated Text · Options: Log and Skip.`,
        `Under Log: ${post(`text = Dictated Text, source = siri_shortcut`)}`,
        `Under Log: ${reply}`,
        `Under Log: Speak Text — Dictionary Value.`,
        `Under Skip: Stop This Shortcut (no request is sent).`,
        `End Menu.`,
      ] : [post(`text = Dictated Text, source = siri_shortcut`), reply, `Speak Text — Dictionary Value.`]),
    ],
  };
  }
  if (mode === `notifications` || mode === `notifications-automatic`) {
    const interactive = mode === `notifications`;
    return {
    name: `MOVO Bank Notifications`,
    trigger: `Shortcuts → Automation → + → Notification → choose the app (GCash, Maya or your bank app) → Run Immediately → turn off Notify When Run → Next → New Blank Automation. Make one automation like this for each bank or e-wallet app.`,
    steps: [
      `Text — Shortcut Input › Title, a new line, then Shortcut Input › Body (the notification that arrived).`,
      ...(interactive ? [
        `Choose from Menu — Prompt: Review this bank notification before sending it to MOVO? Show the original title and body · Options: Log and Skip.`,
        `Under Log: ${post(`text = Text, app = selected app name, source = notification`)}`,
        `Under Log: Get Dictionary Value — Get Value for Key success; show message only when true, otherwise show MOVO's failure message.`,
        `Under Skip: Stop This Shortcut (no request is sent).`,
        `End Menu.`,
      ] : [
        post(`text = Text, app = selected app name, source = notification`),
        `Get Dictionary Value — Get Value for Key success in Contents of URL.`,
        `If — Dictionary Value is true: Get Dictionary Value — Get Value for Key message in Contents of URL, then Show Notification — Title: MOVO · Body: Dictionary Value. End If.`,
      ]),
    ],
  };
  }
  if (mode === `messages`) return {
    name: `MOVO Bank Texts`,
    trigger: `Shortcuts → Automation → + → Message → Message Contains: Ref (bank and e-wallet payment texts include a reference number) → Run Immediately → turn off Notify When Run → Next → New Blank Automation. Optional: make a second automation with Email → Subject Contains: payment, and use Shortcut Input › Body instead of Content.`,
    steps: [
      post(`text = Shortcut Input › Content, app = Shortcut Input › Sender, source = bank`),
      reply,
      `Show Notification — Title: MOVO · Body: Dictionary Value.`,
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
    (mode === 'voice' || mode === 'voice-interactive') ? `Create an iOS shortcut named “${r.name}”.` : `Create an iOS Shortcuts personal automation named “${r.name}” for MOVO transaction logging.`,
    `Setup: ${r.trigger}`,
    'Add exactly these actions, in this order, and nothing else:',
    ...r.steps.map((step, i) => `${i + 1}. ${step}`),
    'Rules: use Get Contents of URL and never Open URLs, Safari or a web view. Put the device key only in the Authorization header, never in the URL. Use the field names exactly as written, in lowercase.',
    mode === 'notifications' ? 'Show the original notification title and body and require Log or Skip before sending. Skip sends no request. Send original text unchanged; server-side MOVO classification rejects OTPs, promotions and non-financial alerts.' :
    mode === 'notifications-automatic' ? 'Run without menus. Send original notification text unchanged. Server-side MOVO classification rejects OTPs, promotions and non-financial alerts. Show success only after MOVO confirms persistence; retain eligible failures for review.' :
    mode === 'messages' ? 'Send the whole message text as it is: do not split it, add menus or ask for input. MOVO reads income, payments and transfers from it, and ignores one-time codes and promos without storing them.' :
    (mode === 'automatic' || mode === 'notifications-automatic') ? 'Do not add menus, Ask for Input, Choose from List, alerts or any action that needs a tap.' : (mode === 'interactive' || mode === 'voice-interactive' || mode === 'notifications') ? 'Only the Log and Skip menu may ask for a tap; under Skip, stop without sending anything.' : 'Do not add amount or merchant fields: MOVO reads them from the sentence and replies with a question when it is unclear. It understands expenses (“I spent 150 on lunch”), income (“I received 2,000 from work”) and transfers between your own accounts (“I transferred 500 from BPI to GCash”).',
    'Check the API success value before showing or speaking the reply. Never announce a save after a timeout, non-2xx response, missing success value or failed request.',
    'Never send OTPs, verification codes, promotional messages, login alerts, balance-only notices or unrelated notifications to the financial ledger.',
    'Do not invent missing merchant, amount, account, date or currency values. Ambiguous entries must be clarified or left for While You Were Away review.',
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
  const c = String(card || '').toLowerCase();
  const words = c.split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 4 && !GENERIC.has(w));
  // Account names follow the bank ("BPI" card and "BPI" savings), so among several matches the bank account wins.
  const prefer = (list) => list.find(a => a.account_type === 'bank') || list[0];
  const byMask = c ? accounts.filter(a => a.mask && c.includes(a.mask)) : [];
  if (byMask.length) return byMask[0];
  const byName = c ? accounts.filter(a => (a.name && c.includes(a.name.toLowerCase())) || (a.institution_name && c.includes(a.institution_name.toLowerCase()))) : [];
  if (byName.length) return prefer(byName);
  // "my savings" finds "BPI Savings": any distinctive word of the hint names the account.
  const byWord = words.length ? accounts.filter(a => `${a.name || ''} ${a.institution_name || ''}`.toLowerCase().split(/[^\p{L}\p{N}]+/u).some(w => words.includes(w))) : [];
  if (byWord.length) return prefer(byWord);
  // No hint matched: a bank account, else a card, else the first account.
  return accounts.find(a => a.account_type === 'bank') || accounts.find(a => a.account_type === 'card') || accounts[0] || null;
}
