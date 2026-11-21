import { parseImportFile, parseJsonData, parseCsvData, planImport } from './dataImport';
import { transactionFingerprint } from './csvImport';

const plan = (parsed, existing = {}) => planImport(parsed, { accounts: [], transactions: [], ...existing }, { base: 'PHP', batchId: 'b1', fingerprint: transactionFingerprint });

describe('MOVO file import', () => {
  test('reads a JSON backup with accounts, cards, balances, transactions, subscriptions, budgets and goals', () => {
    const r = parseJsonData(JSON.stringify({
      accounts: [{ name: 'BPI Savings', type: 'savings', balance: '12,500.50', currency: 'php' }],
      cards: [{ name: 'Visa Gold', last4: '4242', balance: -3200 }],
      transactions: [{ date: '2026-10-02', description: 'Grab', amount: -250, account: 'Visa Gold' }, { date: '2026-10-01', description: 'Salary', amount: 50000 }],
      subscriptions: [{ name: 'Netflix', price: 549, frequency: 'Monthly', next_billing_date: '2026-11-05' }],
      budgets: [{ category: 'Food', limit: 8000 }],
      goals: [{ name: 'Trip', target: 30000, saved: 5000, deadline: '2027-03-01' }],
    }));
    expect(r.errors).toEqual([]);
    expect(r.accounts).toEqual([
      expect.objectContaining({ name: 'BPI Savings', account_type: 'bank', opening_balance: 12500.5, currency: 'PHP' }),
      expect.objectContaining({ name: 'Visa Gold', account_type: 'card', mask: '4242', opening_balance: -3200 }),
    ]);
    expect(r.transactions.map(t => [t.merchant, t.transaction_type, t.amount])).toEqual([['Grab', 'expense', 250], ['Salary', 'income', 50000]]);
    expect(r.subscriptions[0]).toEqual(expect.objectContaining({ name: 'Netflix', amount: 549, cycle: 'monthly', start: '2026-11-05' }));
    expect(r.budgets[0]).toEqual({ category: 'Food', monthly_limit: 8000 });
    expect(r.plans[0]).toEqual({ name: 'Trip', target: 30000, saved: 5000, due: '2027-03-01' });
  });

  test('detects CSV kinds from their columns and rejects unknown files', () => {
    expect(parseCsvData('Date,Description,Amount,Type\n2026-10-01,Coffee,120,expense').transactions).toHaveLength(1);
    expect(parseCsvData('Name,Type,Balance\nGCash,e-wallet,900').accounts[0]).toEqual(expect.objectContaining({ name: 'GCash', account_type: 'e_wallet', opening_balance: 900 }));
    expect(parseCsvData('Name,Amount,Cycle\nSpotify,149,monthly').subscriptions[0].name).toBe('Spotify');
    expect(parseCsvData('foo,bar\n1,2').errors).toHaveLength(1);
    expect(parseImportFile('x.json', '{not json').errors).toEqual(['This JSON file could not be read.']);
  });

  test('ignores unsafe or invalid values', () => {
    const r = parseJsonData(JSON.stringify({ transactions: [{ date: 'nope', description: 'X', amount: 1 }, { date: '2026-10-01', description: '<b>Hi</b>', amount: 'Infinity' }, { __proto__: { amount: 5 } }] }));
    expect(r.transactions).toEqual([]);
    expect(r.errors).toHaveLength(1);
  });

  test('never overwrites existing data and skips duplicates on re-import', () => {
    const parsed = parseJsonData(JSON.stringify({ accounts: [{ name: 'Cash', balance: 100 }, { name: 'Wallet', balance: 5 }], transactions: [{ date: '2026-10-01', description: 'Coffee', amount: -120, account: 'Wallet' }], subscriptions: [{ name: 'Netflix', amount: 549 }] }));
    const first = plan(parsed, { accounts: [{ id: 'a1', name: 'cash' }], subscriptions: [{ name: 'netflix' }] });
    expect(first.accounts.map(a => a.name)).toEqual(['Wallet']);
    expect(first.subscriptions).toEqual([]);
    expect(first.transactions[0]).toEqual(expect.objectContaining({ account_id: first.accounts[0].id, source: 'File Import', import_batch: 'b1' }));
    const again = plan(parsed, { accounts: [{ id: 'a1', name: 'Cash' }, ...first.accounts], transactions: first.transactions, subscriptions: [{ name: 'Netflix' }] });
    expect(again.accounts).toEqual([]);
    expect(again.transactions).toEqual([]);
    expect(again.skipped.duplicates).toBe(4);
  });

  test('a transfer without a matching destination account is reported, not guessed', () => {
    const parsed = parseJsonData(JSON.stringify({ transactions: [{ date: '2026-10-01', description: 'Move', amount: 100, type: 'transfer', to_account: 'Nowhere' }] }));
    expect(plan(parsed).skipped.conflicts).toBe(1);
  });
});


test('imports normalized loans, receivables and recurring bills from JSON', () => {
  const parsed = parseJsonData(JSON.stringify({
    loans: [{ name: 'Car loan', outstanding_principal: '125000', currency: 'PHP', interest_rate: '8.5', due_date: '2027-06-01', lender: 'ABC Bank' }],
    receivables: [{ name: 'Alex', amount_owed: '2500', currency: 'PHP', reason: 'Shared rent', due_date: '2026-12-01' }],
    bills: [{ name: 'Electricity', amount: '3200', category: 'Utilities', frequency: 'Monthly', first_due_date: '2026-11-20', reminder_days: [5, 2, 0] }],
  }));
  expect(parsed.errors).toEqual([]);
  expect(parsed.loans[0]).toMatchObject({ name: 'Car loan', principal_amount: 125000, interest_rate: 8.5, lender: 'ABC Bank' });
  expect(parsed.receivables[0]).toMatchObject({ name: 'Alex', opening_amount: 2500, reason: 'Shared rent' });
  expect(parsed.bills[0]).toMatchObject({ name: 'Electricity', amount: 3200, frequency: 'monthly', first_due_date: '2026-11-20', reminder_days: [5, 2, 0] });
});

test('detects CSV files for loans, receivables and bills', () => {
  expect(parseCsvData('Name,Principal Amount,Interest Rate\nCar loan,125000,8.5').loans[0]).toMatchObject({ name: 'Car loan', principal_amount: 125000 });
  expect(parseCsvData('Name,Amount Owed,Counterparty\nAlex,2500,Alex').receivables[0]).toMatchObject({ name: 'Alex', opening_amount: 2500 });
  expect(parseCsvData('Name,Amount,Frequency,First Due Date\nElectricity,3200,monthly,2026-11-20').bills[0]).toMatchObject({ name: 'Electricity', amount: 3200, first_due_date: '2026-11-20' });
});

test('deduplicates imported obligations by name and counterparty', () => {
  const parsed = parseJsonData(JSON.stringify({
    loans: [{ name: 'Car loan', principal: 125000 }],
    receivables: [{ name: 'Alex', amount_owed: 2500, counterparty: 'Alex' }],
    bills: [{ name: 'Electricity', amount: 3200, first_due_date: '2026-11-20' }],
  }));
  const result = planImport(parsed, {
    accounts: [], transactions: [], loans: [{ name: 'car loan' }],
    receivables: [{ name: 'Alex', counterparty: 'Alex' }], bills: [{ name: 'electricity' }],
  }, { base: 'PHP', batchId: 'b2', fingerprint: transactionFingerprint });
  expect(result.loans).toEqual([]);
  expect(result.receivables).toEqual([]);
  expect(result.bills).toEqual([]);
  expect(result.skipped.duplicates).toBe(3);
});

test('file imports use canonical symmetric cent rounding and reject unsafe cent amounts', () => {
  const parsed = parseJsonData(JSON.stringify({
    accounts: [{ name: 'Rounded', balance: -1.005 }, { name: 'Unsafe', balance: 1e16 }, { name: 'Invalid', balance: 'oops' }, { name: 'Empty' }],
    transactions: [1.005, -1.005, 1e16].map(amount => ({ date: '2026-11-21', description: 'Rounding', amount })),
  }));
  expect(parsed.accounts.map(a => [a.name, a.opening_balance])).toEqual([['Rounded', -1.01], ['Empty', 0]]);
  expect(parsed.transactions.map(t => t.amount)).toEqual([1.01, 1.01]);
  expect(parsed.skipped).toBe(3);
});

test('invalid calendar dates are skipped rather than moved to another day or defaulted', () => {
  const parsed = parseJsonData(JSON.stringify({
    transactions: [{ date: '2026-02-30', description: 'Impossible', amount: 1 }, { date: '2024-02-29', description: 'Leap day', amount: 1 }],
    subscriptions: [{ name: 'Wrong renewal', amount: 1, next_billing_date: '2026-02-30' }],
    plans: [{ name: 'Wrong deadline', target: 10, deadline: '2026-02-30' }],
    loans: [{ name: 'Wrong due date', principal: 10, due_date: '2026-02-30' }],
    receivables: [{ name: 'Wrong due date', amount_owed: 10, due_date: '2026-02-30' }],
    bills: [{ name: 'Wrong due date', amount: 10, first_due_date: '2026-02-30' }],
  }));
  expect(parsed.transactions.map(t => t.merchant)).toEqual(['Leap day']);
  for (const key of ['subscriptions', 'plans', 'loans', 'receivables', 'bills']) expect(parsed[key]).toEqual([]);
  expect(parsed.skipped).toBe(6);
});

test('a named import account must match exactly one account before routing money', () => {
  const parsed = parseJsonData(JSON.stringify({ transactions: [
    { date: '2026-11-21', description: 'Ambiguous', amount: -1, account: 'Travel Card' },
    { date: '2026-11-21', description: 'Missing', amount: -1, account: 'Unknown' },
    { date: '2026-11-21', description: 'Unique', amount: -1, account: 'cAsH' },
    { date: '2026-11-21', description: 'Ambiguous destination', amount: 1, type: 'transfer', account: 'Cash', to_account: 'Travel Card' },
  ] }));
  const result = plan(parsed, { accounts: [{ id: 'a', name: 'Travel Card' }, { id: 'b', name: ' Travel   Card ' }, { id: 'c', name: 'Cash' }] });
  expect(result.transactions.map(t => [t.merchant, t.account_id])).toEqual([['Unique', 'c']]);
  expect(result.skipped.conflicts).toBe(3);
});
