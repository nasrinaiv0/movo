/*
 * Deterministic parser for one spoken transaction, used by the Siri Shortcut and Android assistant paths of /api/log.
 * "I bought 3 pesos of banana", "I spent 150 on lunch using my cash", "I received 2,000 pesos from work",
 * "I paid 500 for electricity yesterday", Filipino "Gumastos ako ng 80 sa tricycle".
 * It never guesses: no amount, several amounts, or no description returns { ok: false, reason } so the caller asks
 * the person to repeat or to log in the app. Accounts are only a hint; the server resolves them against the
 * signed-in person's own accounts.
 */
const INCOME = /\b(received|receive|got paid|earned|income|salary|refund(?:ed)?|deposit(?:ed)?|bonus|allowance|commission|natanggap|nakatanggap|sweldo|kinita)\b|\bgot\b.*\bfrom\b/i;
// "I transferred 500 from BPI to GCash", "moved 200 from cash to Maya", "inilipat ko ang 500 mula sa BPI papunta sa GCash".
const TRANSFER = /\b(transfer(?:red|ring)?|moved?|cash(?:ed)?[- ]?in|nag-?transfer|inilipat|lumipat|nilipat)\b/i;
const ACCOUNT_TAIL = /\s+(?:account|wallet|card)$/i;
const WHEN = /\s+(?:yesterday|today|this morning|kahapon|kanina|ngayon)\b.*$/i;
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
  const currency = (CURRENCY_WORDS.find(([re]) => re.test(text)) || [])[1] || '';
  const day = new Date(now.getTime());
  if (/\b(yesterday|kahapon)\b/i.test(text)) day.setTime(day.getTime() - 86400000);

  // Transfers move money between two of the person's own accounts: both must be named.
  if (TRANSFER.test(text)) {
    const tidy = (s) => (s || '').replace(WHEN, '').replace(/[.,!?]+$/, '').replace(/^(?:my|the|aking|ang)\s+/i, '').replace(ACCOUNT_TAIL, '').trim().slice(0, 60);
    const from = tidy((text.match(/\b(?:from|mula sa|galing sa)\s+(.+?)(?=\s+(?:to|into|papunta(?:ng)?(?:\s+sa)?|sa)\s|[.,!?]|$)/i) || [])[1]);
    const to = tidy((text.match(/\b(?:to|into|papuntang|papunta sa)\s+(.+?)$/i) || [])[1]);
    if (!from || !to) return { ok: false, reason: 'transfer_accounts_missing' };
    if (from.toLowerCase() === to.toLowerCase()) return { ok: false, reason: 'transfer_same_account' };
    return { ok: true, type: 'transfer', amount, currency, fromHint: from, toHint: to, merchant: `Transfer to ${to}`, accountHint: from, occurredAt: day.toISOString() };
  }

  const type = INCOME.test(text) ? 'income' : 'expense';

  // Account hint: "using my cash", "with BPI card", "via GCash", "gamit ang Maya", "to my BPI account" (income).
  const hintM = text.match(/\b(?:using|with|via|gamit(?: ang)?|thru|through|from my|to my)\s+(?:my\s+|the\s+)?([\p{L}\p{N}][\p{L}\p{N} .'-]{0,60}?)(?:\s+(?:account|card|wallet))?(?=\s+(?:yesterday|today|kahapon|kanina|ngayon)\b|[.,!?]|$)/iu);
  const accountHint = hintM ? hintM[1].trim() : '';

  // Description: what follows "for/on/of/at/sa/para sa", or for income what follows "from".
  const after = text.slice(amounts[0].index + amounts[0][0].length);
  const descM = (type === 'income' ? after.match(/\b(?:from|galing sa|mula sa)\s+(.+)/i) : null)
    || after.match(/\b(?:for|on|of|at|para sa|sa|ng)\s+(.+)/i)
    || text.slice(0, amounts[0].index).match(/\b(?:bought|paid for|paid|spent on|bumili ng|binili)\s+(?:a |an |some )?(.+?)\s+(?:for|worth)?\s*$/i);
  let merchant = descM ? descM[1].replace(STOP_TAIL, '').replace(/[.,!?]+$/, '').trim().slice(0, 160) : '';
  if (!merchant && type === 'income') merchant = ((text.match(/\b(salary|sweldo|bonus|allowance|commission|refund|cashback|interest|13th month)\b/i) || [])[1] || '').replace(/^./, c => c.toUpperCase());
  if (!merchant) return { ok: false, reason: 'description_missing' };

  return { ok: true, type, amount, currency, merchant, accountHint, occurredAt: day.toISOString() };
}

// Same stable ids as src/lib/categories.js (docs/TRANSACTION_CATEGORIES.md); kept small and in step with it.
// No clear signal, or signals from different categories, means Needs review instead of a guess.
const NEEDS_REVIEW = 'misc:uncategorized_expense';
const CATEGORY_WORDS = [
  ['food:food_delivery', /grab ?food|food ?panda|food ?delivery/i],
  ['food:fast_food', /jollibee|mcdo|mcdonald|kfc|chowking|greenwich|mang inasal/i],
  ['food:coffee_and_tea', /coffee|cafe|starbucks|milk ?tea|kape/i],
  ['food:groceries', /grocery|groceries|supermarket|market|palengke|puregold|bigas|rice|banana|saging/i],
  ['food:convenience_stores', /7-?eleven|sari-?sari|ministop|alfamart/i],
  ['food:restaurants', /lunch|dinner|breakfast|snack|meal|food|pagkain|ulam|merienda/i],
  ['transport:fuel_gas', /\b(gas|fuel|petron|shell|caltex)\b|gasolina/i],
  ['transport:ride_hailing', /\bgrab\b|angkas|joyride/i],
  ['transport:public_transportation', /tricycle|jeep|bus|fare|pamasahe|mrt|lrt/i],
  ['transport:taxi', /taxi/i],
  ['transport:toll_fees', /\btoll\b/i],
  ['transport:parking', /parking/i],
  ['bills:electricity', /electric|electricity|meralco|kuryente/i],
  ['bills:water', /\bwater\b|maynilad|tubig/i],
  ['bills:internet', /internet|pldt|converge|wifi/i],
  ['bills:mobile_phone', /\bload\b|globe|smart|prepaid|postpaid/i],
  ['housing:rent', /\brent\b|upa/i],
  ['health:medicine_and_pharmacy', /medicine|pharmacy|mercury|watsons|gamot/i],
  ['health:doctor_consultation', /clinic|doctor/i],
  ['health:hospital', /hospital/i],
  ['shopping:online_shopping', /shopee|lazada/i],
  ['shopping:clothing', /clothes|shoes|uniqlo/i],
];
function guessCategory(text, type) {
  if (type === 'income') return 'income';
  const hits = CATEGORY_WORDS.filter(([, re]) => re.test(text)).map(([id]) => id);
  if (!hits.length) return NEEDS_REVIEW;
  const primaries = new Set(hits.map(id => id.split(':')[0]));
  return primaries.size === 1 ? hits[0] : NEEDS_REVIEW;
}

module.exports = { parseVoice, guessCategory };
