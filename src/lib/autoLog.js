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
 * the step-by-step list shown in MOVO, so the two never drift apart. Each step names the exact Shortcuts action and its
 * settings; the device key goes only in the Authorization header. MOVO's reply always carries `message` (what happened,
 * for successes and failures) and `notice` (the same text, but empty for a duplicate or an ignored non-payment), so a
 * background shortcut shows something only when it matters and never claims a save MOVO did not confirm.
 * The text is English on purpose: it is read by Shortcuts, not shown as interface text.
 *
 * Modes: notifications-automatic / notifications (bank and e-wallet app notifications, iOS 27+), automatic /
 * interactive (Apple Pay Transaction trigger), voice / voice-interactive (Siri).
 */
export const SHORTCUT_MODES = ['notifications-automatic', 'notifications', 'automatic', 'interactive', 'voice', 'voice-interactive'];

export function shortcutRecipe(origin, key, mode = `notifications-automatic`) {
  const url = `${origin}/api/log`;
  const post = (fields) => `Get Contents of URL — URL: ${url} · Method: POST · Headers: Authorization = Bearer ${key}, Content-Type = application/json · Request Body: JSON · Fields (all Text): ${fields}.`;
  const getKey = (k) => `Get Dictionary Value — Get Value for Key ${k} in Contents of URL.`;
  const showIfAny = `If — Dictionary Value has any value: Show Notification — Title: MOVO · Body: Dictionary Value. End If.`;
  const show = `Show Notification — Title: MOVO · Body: Dictionary Value.`;
  const stopOnSkip = [`Under Skip: no actions (nothing is sent).`, `End Menu.`];

  if (mode === `notifications` || mode === `notifications-automatic`) {
    const interactive = mode === `notifications`;
    const notification = `Text — Shortcut Input › Title, a new line, Shortcut Input › Subtitle, a new line, Shortcut Input › Body (the whole notification that arrived; some iPhones call Body “Message”).`;
    const send = post(`text = Text, app = the app's name typed as plain text (for example GCash), source = notification`);
    return {
      name: `MOVO Bank Notifications`,
      trigger: `Needs iOS 27 or later. Shortcuts → Automation → + → Notification → App: choose GCash, Maya or your bank app (leave the Title and Message filters empty) → Run Immediately → turn off Notify When Run → Next → New Blank Automation. Make one automation per app, with that app's name in the app field.`,
      steps: interactive ? [
        notification,
        `Choose from Menu — Prompt: Text · Options: Log and Skip.`,
        `Under Log: ${send}`,
        `Under Log: ${getKey(`message`)}`,
        `Under Log: ${show}`,
        ...stopOnSkip,
      ] : [notification, send, getKey(`notice`), showIfAny],
    };
  }

  if (mode === `voice` || mode === `voice-interactive`) {
    const interactive = mode === `voice-interactive`;
    const send = post(`text = Dictated Text, source = siri_shortcut`);
    return {
      name: `Log to MOVO`,
      trigger: `Shortcuts → + (new shortcut) → name it “Log to MOVO”. Say “Hey Siri, Log to MOVO” to run it.`,
      steps: [
        `Dictate Text — Language: the language you speak · Stop Listening: After Pause.`,
        ...(interactive ? [
          `Choose from Menu — Prompt: Dictated Text · Options: Log and Skip.`,
          `Under Log: ${send}`,
          `Under Log: ${getKey(`message`)}`,
          `Under Log: Speak Text — Dictionary Value.`,
          ...stopOnSkip,
        ] : [send, getKey(`message`), `Speak Text — Dictionary Value.`]),
      ],
    };
  }

  const date = `Format Date — Date: Current Date · Date Format: ISO 8601 · Include ISO 8601 Time: on.`;
  const payment = post(`amount = Shortcut Input › Amount, merchant = Shortcut Input › Merchant, card = Shortcut Input › Card or Pass, source = applepay, occurredAt = Formatted Date`);
  const trigger = `Shortcuts → Automation → + → Transaction → choose the Apple Pay cards to track → Run Immediately → turn off Notify When Run → Next → New Blank Automation.`;
  if (mode === `automatic`) return { name: `MOVO Apple Pay`, trigger, steps: [date, payment, getKey(`notice`), showIfAny] };
  return {
    name: `MOVO Apple Pay`,
    trigger,
    steps: [
      `Choose from Menu — Prompt: Log Shortcut Input › Amount at Shortcut Input › Merchant in MOVO? · Options: Log and Skip.`,
      `Under Log: ${date}`,
      `Under Log: ${payment}`,
      `Under Log: ${getKey(`message`)}`,
      `Under Log: ${show}`,
      ...stopOnSkip,
    ],
  };
}

const PROMPT_GOAL = {
  'notifications-automatic': `When a notification arrives from my bank or e-wallet app, send its text to MOVO in the background and show MOVO's reply only when MOVO returns a notice.`,
  notifications: `When a notification arrives from my bank or e-wallet app, show it and let me choose Log or Skip. Log sends its text to MOVO and shows MOVO's reply.`,
  automatic: `When I pay with Apple Pay, send the payment to MOVO in the background and show MOVO's reply only when MOVO returns a notice.`,
  interactive: `When I pay with Apple Pay, ask me Log or Skip. Log sends the payment to MOVO and shows MOVO's reply.`,
  voice: `Listen to one sentence about money I spent, received or moved, send it to MOVO and speak MOVO's reply.`,
  'voice-interactive': `Listen to one sentence about money, let me choose Log or Skip, and on Log send it to MOVO and speak MOVO's reply.`,
};
const PROMPT_RULES = {
  'notifications-automatic': [
    `Send every notification from this app exactly as it arrived. Do not filter, summarise, split or rewrite it, and do not pick out amounts yourself: MOVO reads payments, income and transfers and ignores one-time codes, promos and log-in alerts without storing them.`,
    `No menus, Ask for Input, Choose from List, alerts or any action that needs a tap.`,
  ],
  notifications: [
    `Send the notification text exactly as it arrived; MOVO reads it and ignores one-time codes and promos without storing them.`,
    `Only the Log / Skip menu may ask for a tap. Skip sends nothing.`,
  ],
  automatic: [`No menus, Ask for Input, Choose from List, alerts or any action that needs a tap.`, `Use the Transaction trigger's own Amount, Merchant and Card or Pass values; do not type or invent values.`],
  interactive: [`Only the Log / Skip menu may ask for a tap. Skip sends nothing.`, `Use the Transaction trigger's own Amount, Merchant and Card or Pass values; do not type or invent values.`],
  voice: [`Send the whole dictated sentence as text. Do not add amount or merchant fields: MOVO reads them from the sentence (“I spent 150 on lunch”, “I received 2,000 from work”, “I transferred 500 from BPI to GCash”) and replies with a question when it is unclear.`],
  'voice-interactive': [`Send the whole dictated sentence as text; do not add amount or merchant fields.`, `Only the Log / Skip menu may ask for a tap. Skip sends nothing.`],
};

/** The recipe as one prompt for “Describe a shortcut”. */
export const shortcutPrompt = (origin, key, mode = `notifications-automatic`) => {
  const m = SHORTCUT_MODES.includes(mode) ? mode : `notifications-automatic`;
  const r = shortcutRecipe(origin, key, m);
  const isVoice = m === `voice` || m === `voice-interactive`;
  return [
    isVoice ? `Create an iPhone shortcut named “${r.name}”. ${PROMPT_GOAL[m]}` : `Create an iPhone Shortcuts personal automation named “${r.name}”. ${PROMPT_GOAL[m]}`,
    `Setup: ${r.trigger}`,
    `Actions, in this order and nothing else:`,
    ...r.steps.map((step, i) => `${i + 1}. ${step}`),
    `Rules:`,
    ...PROMPT_RULES[m].map(rule => `- ${rule}`),
    `- Use Get Contents of URL with Method POST. Never use Open URLs, Safari or a web view.`,
    `- Put the device key only in the Authorization header, never in the URL or the body. Use the field names exactly as written, in lowercase.`,
    `- Show or speak only what MOVO replies. Never write your own “logged” or “saved” message, and never announce a save after an error or a timeout.`,
  ].join(`\n`);
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
