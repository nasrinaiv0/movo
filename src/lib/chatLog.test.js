import { parseLogLine, parseLogMessage } from './chatLog';

const now = new Date('2026-10-30T09:00:00');

test.each([
  ['Spent 250 on Grab', { type: 'expense', amount: 250, merchant: 'Grab', category: 'Transport' }],
  ['Grab 250', { type: 'expense', amount: 250, merchant: 'Grab', category: 'Transport' }],
  ['paid ₱1,999.50 PLDT bill', { type: 'expense', amount: 1999.5, currency: 'PHP', merchant: 'PLDT', category: 'Bills' }],
  ['Add 699 for gpt subs', { type: 'expense', amount: 699, merchant: 'ChatGPT Plus', category: 'Subscriptions' }],
  ['Salary 50k', { type: 'income', amount: 50000, category: 'Income' }],
  ['received 5000 from Juan', { type: 'income', amount: 5000, merchant: 'Juan', category: 'Income' }],
  ['I just buy a bread amounting $30 I mean 30 pesos', { type: 'expense', amount: 30, currency: 'PHP', merchant: 'Bread' }],
  ['I paid 1500 for groceries at Puregold', { amount: 1500, category: 'Groceries' }],
  ['Starbucks $6.75', { amount: 6.75, currency: 'USD', merchant: 'Starbucks', category: 'Food & drinks' }],
])('logs "%s"', (text, expected) => {
  expect(parseLogLine(text, now)).toMatchObject(expected);
});

test('dates "yesterday" one day back and keeps today otherwise', () => {
  expect(parseLogLine('jollibee 389 yesterday', now).date.getDate()).toBe(29);
  expect(parseLogLine('jollibee 389', now).date.getDate()).toBe(30);
});

test.each([
  'How much did I spend on Grab?',
  'Summarize my recent spending',
  'Which categories cost me the most',
  'I think I spend about 2000 on food every week and want to cut that down a lot',
  'hello',
  'Spent 0 on nothing',
])('leaves questions and non-logs for NasrinAI: "%s"', (text) => {
  expect(parseLogMessage(text, now)).toEqual([]);
});

test('logs several lines at once, but only when every line is a log', () => {
  expect(parseLogMessage('Grab 250\nNetflix 549\nsalary 50000', now).map(e => e.merchant)).toEqual(['Grab', 'Netflix', 'Salary']);
  expect(parseLogMessage('Grab 250\nwhat did I spend?', now)).toEqual([]);
});

test('reads Filipino logs and keeps the account out of the merchant', () => {
  const [e] = parseLogMessage('Bumili ako ng saging kanina 20 pesos gamit ang savings account ko');
  expect(e).toMatchObject({ type: 'expense', amount: 20, currency: 'PHP', merchant: 'Saging', category: 'Groceries', accountHint: 'savings account' });
  const [y] = parseLogMessage('Nagbayad ng kuryente 1500 kahapon', new Date('2026-10-30T12:00:00'));
  expect(y).toMatchObject({ type: 'expense', amount: 1500, merchant: 'Kuryente', category: 'Bills' });
  expect(y.date.getDate()).toBe(29);
  expect(parseLogMessage('Sahod 25000')[0].type).toBe('income');
  expect(parseLogMessage('Magkano ang gastos ko?')).toEqual([]);
  expect(parseLogMessage('I just bought bread $30 using my BDO card')[0]).toMatchObject({ merchant: 'Bread', accountHint: 'bdo card' });
});

test('tolerates the common "ganit" typo for "gamit"', () => {
  const [e] = parseLogMessage('Bumili ako ng saging kanina 20 pesos ganit ang savings account ko');
  expect(e).toMatchObject({ amount: 20, merchant: 'Saging', accountHint: 'savings account' });
});
