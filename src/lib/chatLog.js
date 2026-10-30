import { guessCategory } from './ocr';
import { wordsToNumbers } from './numberWords';
import { CATALOG } from './subscriptions';

/*
 * Reads "log a transaction" messages typed in the NasrinAI chat, entirely on this device:
 *   "Spent 250 on Grab", "Grab 250", "Paid ₱1,999 PLDT bill yesterday", "Salary 50k", "Add 699 for ChatGPT".
 * Several lines can be logged at once. Questions ("how much did I spend on Grab?") are never treated as logs,
 * and nothing here is sent to NasrinAI.
 */
const QUESTION = /\?|^(how|what|why|which|when|where|who|show|summari[sz]e|compare|list|tell|explain|can|could|should|is|are|do|does|did|magkano|ano|bakit|ilan|saan|paano|kailan|sino)\b/i;
// English and Filipino ("Bumili ako ng saging 20 pesos", "Nagbayad ng kuryente 1500").
const EXPENSE_VERB = /^(spent|spend|paid|pay|bought|buy|buys|purchase|purchased|log|add|record|expense|gastos|bayad|got|bumili|binili|nagbayad|binayaran|gumastos|nagastos|ginastos|pinambili|nagload|nag-load)\b/i;
const INCOME_WORD = /\b(salary|sahod|sweldo|suweldo|income|earned|received|got paid|paid me|bonus|refund|cashback|commission|allowance|sold|freelance|dividend|interest|kinita|natanggap|nakatanggap|binenta|naibenta)\b/i;
// "…using my savings account", "…gamit ang savings account ko" names the account and is not part of the merchant.
const ACCOUNT_PHRASE = /[,\s]+(?:using|via|with|charged to|paid with|on my|(?:gamit|ganit|gamet)(?:\s+ang)?)\s+(?:my\s+|the\s+|ang\s+|aking\s+)?([\p{L}\p{N}'& -]{2,40}?)(?:\s+ko)?\s*$/iu;
const SPENT_VERB = /\b(paid|pay|spent|bought|bumili|binili|nagbayad|gumastos|nagastos)\b/i;
const AMOUNT = /(?:(?:php|usd|eur|gbp|jpy|sgd|aud|cad)\s?|[₱$€£¥]\s?)?(\d{1,3}(?:[,\s]\d{3})+|\d+)(?:\.(\d{1,2}))?\s?(k\b)?(?:\s?(php|usd|eur|gbp|jpy|sgd|aud|cad|pesos?|piso|dollars?)\b)?/i;
const CODES = { '₱': 'PHP', $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', peso: 'PHP', pesos: 'PHP', piso: 'PHP', dollar: 'USD', dollars: 'USD' };
const FILLER = /\b(i|my|me|just|amounting|amount|costing|cost|total|a lot of|some|today|yesterday|last night|this morning|tonight|spent|spend|paid|pay|bought|buy|purchased|log|add|record|an?|the|expense|for|on|at|to|from|in|via|using|with|worth|of|sub|subs|subscription|bill|pesos?|piso|dollars?|php|usd|eur|gbp|jpy|sgd|aud|cad|gastos|bayad|got|received|earned|ako|ng|nang|ang|ko|sa|kanina|kahapon|kagabi|ngayon|para|mga|si|na|lang|po|isang|bumili|binili|nagbayad|binayaran|gumastos|nagastos|ginastos|pinambili|gamit|ganit)\b/gi;

const currencyOf = (line, match) => {
  const sym = line.slice(Math.max(0, match.index - 1), match.index + 1).match(/[₱$€£¥]/)?.[0] || (match[0].match(/[₱$€£¥]/) || [])[0];
  const code = (match[0].match(/\b(php|usd|eur|gbp|jpy|sgd|aud|cad)\b/i) || [])[1] || match[4];
  if (code) return CODES[code.toLowerCase()] || code.toUpperCase();
  return sym ? CODES[sym] : '';
};

const titleCase = (s) => s.replace(/\s+/g, ' ').trim().split(' ').map(w => (w.length > 3 || /^[a-z]+$/.test(w) ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

/** Matches "gpt" → "ChatGPT Plus" style shorthand against the subscription catalog. */
function knownService(words) {
  const text = words.toLowerCase();
  if (!text) return null;
  const alias = [[/\b(chat ?gpt|gpt|openai)\b/, 'ChatGPT Plus'], [/\byt\b|\byoutube\b/, 'YouTube Premium'], [/\bclaude\b/, 'Claude'], [/\bicloud\b/, 'iCloud+']];
  const hit = alias.find(([re]) => re.test(text));
  if (hit) return CATALOG.find(c => c.name === hit[1]);
  return CATALOG.find(c => text.includes(c.name.toLowerCase().replace(/\+$/, '')) && c.name.length > 2) || null;
}

/** One line → a draft record, or null when the line is not a request to log something. */
export function parseLogLine(raw, now = new Date()) {
  // "I just bought…", "we paid…" read the same as "bought…"; "…$30 I mean 30 pesos" keeps the corrected amount.
  let line = wordsToNumbers(String(raw || '').trim()).replace(/^(i|we|i've|i have|we've)\s+(just\s+|already\s+)?/i, '');
  const fix = line.match(/^(.*?)(?:,?\s*\bi mean\b|,?\s*\bsorry\b|,?\s*\bactually\b)\s+(.*)$/i);
  if (fix && AMOUNT.test(fix[2])) line = `${fix[1].replace(AMOUNT, '').trim()} ${fix[2]}`.trim();
  if (!line || line.length > 160 || QUESTION.test(line)) return null;
  let accountHint = '';
  const acct = line.match(ACCOUNT_PHRASE);
  if (acct && !AMOUNT.test(acct[1])) { accountHint = acct[1].toLowerCase().trim(); line = line.slice(0, acct.index).trim(); }
  const match = line.match(AMOUNT);
  if (!match) return null;
  const whole = match[1].replace(/[,\s]/g, '');
  let amount = Number(`${whole}${match[2] ? `.${match[2]}` : ''}`);
  if (match[3]) amount *= 1000;
  if (!(amount > 0) || amount >= 1e9) return null;
  const rest = `${line.slice(0, match.index)} ${line.slice(match.index + match[0].length)}`;
  const words = rest.replace(/[^\p{L}\p{N}&'.+\- ]/gu, ' ').replace(/\s+/g, ' ').trim();
  const explicit = EXPENSE_VERB.test(line) || INCOME_WORD.test(line);
  // Without a verb, only short "Grab 250" style lines count, so free-form sentences go to NasrinAI instead.
  if (!explicit && (words.split(' ').length > 4 || !/\p{L}{2}/u.test(words))) return null;
  const income = INCOME_WORD.test(line) && !SPENT_VERB.test(line.replace(/paid me|got paid/i, ''));
  const service = knownService(words);
  let merchant = service ? service.name : titleCase(words.replace(FILLER, ' ').replace(/\s+/g, ' ').trim());
  if (!merchant) merchant = income ? (line.match(INCOME_WORD)?.[0] ? titleCase(line.match(INCOME_WORD)[0]) : 'Income') : 'Expense';
  const day = new Date(now);
  if (/\b(yesterday|last night|kahapon|kagabi)\b/i.test(line)) day.setDate(day.getDate() - 1);
  return {
    type: income ? 'income' : 'expense',
    amount: Math.round(amount * 100) / 100,
    currency: currencyOf(line, match),
    merchant: merchant.slice(0, 60),
    category: income ? 'Income' : service ? 'Subscriptions' : guessCategory(`${merchant} ${line}`),
    date: day,
    accountHint: accountHint || words.toLowerCase(),
  };
}

/** Every loggable line in a message; returns [] when the message should go to NasrinAI as a question instead. */
export function parseLogMessage(text, now = new Date()) {
  const lines = String(text || '').split(/\n|;/).map(l => l.trim()).filter(Boolean).slice(0, 20);
  const parsed = lines.map(l => parseLogLine(l, now));
  return parsed.every(Boolean) ? parsed : [];
}
