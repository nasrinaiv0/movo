/*
 * Deterministic parser for one spoken transaction, used by the Siri Shortcut and Android assistant paths of /api/log.
 * "I bought 3 pesos of banana", "I spent 150 on lunch using my cash", "I received 2,000 pesos from work",
 * "I paid 500 for electricity yesterday", Filipino "Gumastos ako ng 80 sa tricycle".
 * It never guesses: no amount, several amounts, or no description returns { ok: false, reason } so the caller asks
 * the person to repeat or to log in the app. Accounts are only a hint; the server resolves them against the
 * signed-in person's own accounts.
 */
const INCOME = /\b(received|receive|got paid|earned|income|salary|refund(?:ed)?|deposit(?:ed)?|natanggap|sweldo|kinita)\b/i;
const AMOUNT = /(?:₱|php|p(?=\s?\d)|\$|usd)?\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?![\d-])\s*(pesos?|piso|php|dollars?|usd|bucks)?/gi;
const CURRENCY_WORDS = [[/\b(pesos?|piso|php)\b|₱/i, 'PHP'], [/\b(dollars?|usd|bucks)\b|\$/i, 'USD']];
const STOP_TAIL = /\s+(?:using|with|via|gamit|thru|through|from my|to my|yesterday|today|this morning|kahapon|kanina|ngayon)\b.*$/i;

function parseVoice(input, now = new Date()) {
  const text = String(input || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (!text) return { ok: false, reason: 'empty' };
  const amounts = [...text.matchAll(AMOUNT)].filter(m => Number(m[1].replace(/,/g, '')) > 0);
  if (!amounts.length) return { ok: false, reason: 'amount_missing' };
  if (amounts.length > 1) return { ok: false, reason: 'multiple_amounts' };
  const amount = Math.round(Number(amounts[0][1].replace(/,/g, '')) * 100) / 100;
  if (!(amount > 0 && amount < 1e9)) return { ok: false, reason: 'amount_invalid' };
  const type = INCOME.test(text) ? 'income' : 'expense';
  const currency = (CURRENCY_WORDS.find(([re]) => re.test(text)) || [])[1] || '';

  // Account hint: "using my cash", "with BPI card", "via GCash", "gamit ang Maya", "to my BPI account" (income).
  const hintM = text.match(/\b(?:using|with|via|gamit(?: ang)?|thru|through|from my|to my)\s+(?:my\s+|the\s+)?([\p{L}\p{N}][\p{L}\p{N} .'-]{0,60}?)(?:\s+(?:account|card|wallet))?(?=\s+(?:yesterday|today|kahapon|kanina|ngayon)\b|[.,!?]|$)/iu);
  const accountHint = hintM ? hintM[1].trim() : '';

  // Description: what follows "for/on/of/at/sa/para sa", or for income what follows "from".
  const after = text.slice(amounts[0].index + amounts[0][0].length);
  const descM = (type === 'income' ? after.match(/\b(?:from|galing sa|mula sa)\s+(.+)/i) : null)
    || after.match(/\b(?:for|on|of|at|para sa|sa|ng)\s+(.+)/i)
    || text.slice(0, amounts[0].index).match(/\b(?:bought|paid for|paid|spent on|bumili ng|binili)\s+(?:a |an |some )?(.+?)\s+(?:for|worth)?\s*$/i);
  const merchant = descM ? descM[1].replace(STOP_TAIL, '').replace(/[.,!?]+$/, '').trim().slice(0, 160) : '';
  if (!merchant) return { ok: false, reason: 'description_missing' };

  const day = new Date(now.getTime());
  if (/\b(yesterday|kahapon)\b/i.test(text)) day.setTime(day.getTime() - 86400000);
  return { ok: true, type, amount, currency, merchant, accountHint, occurredAt: day.toISOString() };
}

const CATEGORY_WORDS = [
  ['Food & drinks', /banana|lunch|dinner|breakfast|snack|coffee|cafe|meal|food|jollibee|mcdo|mcdonald|kfc|starbucks|milk ?tea|pagkain|ulam|kape|merienda/i],
  ['Groceries', /grocery|groceries|supermarket|market|palengke|puregold|7-?eleven|sari-?sari|bigas|rice/i],
  ['Transport', /tricycle|jeep|taxi|grab|angkas|bus|fare|pamasahe|gas|fuel|petron|shell|toll|parking|mrt|lrt/i],
  ['Bills', /electric|electricity|meralco|water|maynilad|internet|pldt|globe|smart|converge|load|bill|rent|kuryente|tubig/i],
  ['Health', /medicine|pharmacy|mercury|watsons|clinic|doctor|hospital|gamot/i],
  ['Shopping', /shopee|lazada|clothes|shoes|mall|uniqlo/i],
  ['Income', /salary|sweldo|work|freelance|client|payment received|refund/i],
];
const guessCategory = (text, type) => (type === 'income' ? 'Income' : ((CATEGORY_WORDS.find(([, re]) => re.test(text)) || ['Other'])[0]));

module.exports = { parseVoice, guessCategory };
