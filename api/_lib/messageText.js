/*
 * Reads one bank or e-wallet payment message (SMS, email, or an Android notification) into a transaction.
 *   "You have paid P5.13 via GCash to PYMY Connect IQ on 10-04-26 03:01:06 AM. Ref. No. 342984713. ..."
 *   "You have received PHP 1,500.00 of GCash from JUAN D. on 10-04-26 ... Ref. No. 9012..."
 *   "You have sent PHP 500.00 to MARIA S. 0917xxxx on ... Ref No. 77...."
 *   "You have successfully cashed in PHP 2,000.00 from BPI ..."
 * It never guesses: a one-time code, a promo, a balance notice or a message without a clear direction and amount
 * returns { ok: false, reason } and is not stored. Accounts are only a hint (the institution and masked digits);
 * the server matches them against the person's own accounts.
 */

// One-time codes, log-in alerts and promos are never transactions (and must never be stored).
// Payment messages often end with "Never share your MPIN or OTP", so a code is only assumed when one is actually given.
const ONE_TIME_CODE = /\b(?:otp|one[- ]time (?:pin|password|code)|verification code|authentication code|security code)\b[^.]{0,40}?\b\d{4,8}\b|\b\d{4,8}\b[^.]{0,30}\b(?:is your|as your) (?:otp|code|one[- ]time)/i;
// Push notifications add offers ("Get ₱50 cashback when you pay bills") that name an amount but move no money.
const NOT_A_PAYMENT = /\b(new (?:device )?log[- ]?in|logged in to|signed in to|promo code|voucher code|raffle|win up to|chance to win|limited[- ](?:time )?offer|get (?:up to )?(?:₱|php|p)\s?\d[\d,.]*\s+(?:cashback|off|discount|rebate)|when you (?:pay|shop|cash in|top up|buy|send)|statement is ready|minimum (?:amount )?due)\b/i;

const INSTITUTIONS = [
  ['GCash', /\bg-?cash\b/i], ['Maya', /\b(pay)?maya\b/i], ['GoTyme Bank', /\bgo ?tyme\b/i], ['SeaBank', /\bsea ?bank\b/i],
  ['ShopeePay', /\bshopee ?pay\b/i], ['GrabPay', /\bgrab ?pay\b/i], ['Coins.ph', /\bcoins(\.ph)?\b/i],
  ['BPI', /\bbpi\b/i], ['BDO', /\bbdo\b/i], ['UnionBank', /\bunion ?bank\b|\bubp\b/i], ['Metrobank', /\bmetro ?bank\b/i],
  ['Security Bank', /\bsecurity ?bank\b/i], ['RCBC', /\brcbc\b/i], ['Landbank', /\bland ?bank\b/i], ['PNB', /\bpnb\b/i],
  ['China Bank', /\bchina ?bank\b/i], ['EastWest', /\beast ?west\b/i], ['CIMB', /\bcimb\b/i], ['Tonik', /\btonik\b/i],
  ['Wise', /\bwise\b/i], ['PayPal', /\bpaypal\b/i],
];

// Order matters: income and transfers are recognised before the generic "paid / sent / purchase" expense words.
const INCOME = /\b(you(?:'ve| have)? received|received(?=\s?(?:php|p|₱)\s?\d)|has sent you|sent you|credited to your|was credited|has been credited|deposit(?:ed)? to your|refund(?:ed)?|cashback|natanggap)\b/i;
const TRANSFER_IN = /\b(cash(?:ed)?[- ]?in|cash in from|top[- ]?up(?:ped)? (?:your|from)|transferred to your|fund transfer to your)\b/i;
const TRANSFER_OUT = /\b(cash(?:ed)?[- ]?out|withdr[ae]w(?:al|n)?|transferred(?=\s(?:php|p|₱)\s?\d|\sfrom your)|fund transfer from your|to your (?:own )?(?:bpi|bdo|gcash|maya|bank|savings|account)|(?:you(?:'ve| have)? )?sent(?=\s(?:php|p|₱)\s?\d)|send money|instapay|pesonet|ipinadala)\b/i;
const EXPENSE = /\b(you(?:'ve| have)? paid|paid|payment (?:of|to|for)|purchase(?:d)?|spent|debited|charged|bought|binayaran|was used (?:for|at|to pay)|transaction of)\b/i;

const MONEY = /(?:₱|\bphp\.?|\bp(?=\s?\d))\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)|\b(\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})\s?(?:php|pesos?)\b/gi;
const NOT_THE_AMOUNT = /(bal(?:ance)?|avail(?:able)?|limit|fee|charge of|points?)\W{0,3}(?:\w+\W{0,3}){0,3}$/i;

function amounts(text) {
  return [...text.matchAll(MONEY)].map(m => ({ value: Number((m[1] || m[2]).replace(/,/g, '')), index: m.index, before: text.slice(Math.max(0, m.index - 30), m.index) }))
    .filter(a => a.value > 0 && a.value < 1e9);
}

/** "10-04-26 03:01:06 AM", "10/04/2026 3:01 PM", "Oct 4, 2026 3:01 PM", "2026-10-04 15:01". Philippine time unless stated. */
function readDate(text, now, offset) {
  const pad = (n) => String(n).padStart(2, '0');
  const toIso = (y, mo, d, h = 12, mi = 0, s = 0, ap = '') => {
    let hour = Number(h);
    if (/pm/i.test(ap) && hour < 12) hour += 12;
    if (/am/i.test(ap) && hour === 12) hour = 0;
    const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);
    const iso = `${year}-${pad(mo)}-${pad(d)}T${pad(hour)}:${pad(mi)}:${pad(s)}${offset}`;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? new Date(t).toISOString() : '';
  };
  const time = '(?:,?\\s*(?:at\\s+)?(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s*([ap]\\.?m\\.?)?)?';
  let m = text.match(new RegExp(`\\b(\\d{4})-(\\d{1,2})-(\\d{1,2})${time}`, 'i'));
  if (m) return toIso(m[1], m[2], m[3], m[4] ?? 12, m[5] ?? 0, m[6] ?? 0, m[7] || '');
  m = text.match(new RegExp(`\\b(\\d{1,2})[-/](\\d{1,2})[-/](\\d{2,4})${time}`, 'i'));
  if (m) return toIso(m[3], m[1], m[2], m[4] ?? 12, m[5] ?? 0, m[6] ?? 0, m[7] || ''); // Philippine messages use MM-DD-YY
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  m = text.match(new RegExp(`\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})${time}`, 'i'));
  if (m) return toIso(m[3], MONTHS.indexOf(m[1].toLowerCase()) + 1, m[2], m[4] ?? 12, m[5] ?? 0, m[6] ?? 0, m[7] || '');
  return now.toISOString();
}

const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').replace(/^[\s:,-]+|[\s.,:;-]+$/g, '').slice(0, max);

/**
 * @param {string} input message text
 * @param {{ app?: string, now?: Date, offset?: string }} options app = the sender or app name (e.g. "GCash")
 */
function parseMessage(input, { app = '', now = new Date(), offset = '+08:00' } = {}) {
  const text = String(input || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);
  if (!text) return { ok: false, reason: 'empty' };
  if (ONE_TIME_CODE.test(text) || NOT_A_PAYMENT.test(text)) return { ok: false, reason: 'not_a_transaction' };

  let type = ''; let transfer = false;
  if (INCOME.test(text)) type = 'income';
  else if (TRANSFER_IN.test(text)) { type = 'income'; transfer = true; }
  else if (TRANSFER_OUT.test(text)) { type = 'expense'; transfer = true; }
  else if (EXPENSE.test(text)) type = 'expense';
  if (!type) return { ok: false, reason: 'not_a_transaction' };

  const found = amounts(text).filter(a => !NOT_THE_AMOUNT.test(a.before));
  if (!found.length) return { ok: false, reason: 'amount_missing' };
  const amount = Math.round(found[0].value * 100) / 100;

  const institution = (INSTITUTIONS.find(([, re]) => re.test(app)) || INSTITUTIONS.find(([, re]) => re.test(text)) || [])[0] || clean(app, 60);
  const last4 = (text.match(/(?:ending(?: in)?|acct\.?|account|card)\s*(?:no\.?\s*)?(?:x+|\*+|•+)?\s*(\d{4})\b/i) || text.match(/(?:x{2,}|\*{2,}|•{2,})(\d{4})\b/i) || [])[1] || '';

  // Counterparty: "to NAME on|at|via|.", or for money in "from NAME".
  const stop = '(?=\\s+(?:on|at|via|using|with|thru|through|for)\\s|\\s+\\d{1,2}[-/]\\d{1,2}[-/]\\d{2,4}|[.,;]\\s|\\.?\\s*ref|$)';
  // Money out prefers "at <store>", then "to <payee>", then "for <what>"; money in reads "from <sender>".
  const words = type === 'income' ? ['from'] : ['at', 'to', 'for'];
  const party = words.map(w => text.match(new RegExp(`\\b${w}\\s+(?!a |an |the |your )(.{2,80}?)${stop.replace('(?:on|', type === 'income' ? '(?:on|to|' : '(?:on|')}`, 'i'))).find(Boolean);
  let merchant = party ? clean(party[1].replace(/\b0?9\d{2}\s?\d{3}\s?\d{4}\b|\b\+?63\d{10}\b/g, '').replace(/\b(your|the)\b\s*/i, ''), 160) : '';
  if (!merchant || /^(php|p|₱)?\s?[\d.,]+$/i.test(merchant)) merchant = transfer ? `${institution || 'Account'} transfer` : `${institution || 'Bank'} ${type === 'income' ? 'credit' : 'payment'}`;

  const reference = clean((text.match(/\bref(?:erence)?\.?\s*(?:no\.?|number|#|id)?\s*[:#.]?\s*([A-Z0-9][A-Z0-9-]{4,40})/i) || [])[1], 120);
  const currency = /\$|\busd\b/i.test(text) && !/php|₱/i.test(text) ? 'USD' : 'PHP';
  return {
    ok: true, type, transfer, amount, currency, merchant, reference,
    accountHint: [institution, last4].filter(Boolean).join(' '),
    occurredAt: readDate(text, now, offset),
    text,
  };
}

module.exports = { parseMessage };
