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
