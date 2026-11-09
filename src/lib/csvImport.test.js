import { parseCsvRows, parseCsvTransactions, transactionFingerprint, findUniqueCsvAccount } from './csvImport';

describe('CSV transaction import parser', () => {
  test('parses quoted commas, escaped quotes and line breaks', () => {
    expect(parseCsvRows('Date,Description,Type,Amount\n2026-10-01,"Cafe, ""Hello""",expense,12.50')).toEqual([
      ['Date', 'Description', 'Type', 'Amount'],
      ['2026-10-01', 'Cafe, "Hello"', 'expense', '12.50'],
    ]);
  });

  test('normalizes valid transactions and currency', () => {
    const result = parseCsvTransactions('Date,Description,Type,Amount,Currency,Category,Account\n2026-10-01,"Cafe, Inc.",expense,"₱1,250.50",PHP,Food,Cash');
    expect(result.errors).toEqual([]);
    expect(result.transactions[0]).toMatchObject({
      merchant: 'Cafe, Inc.', amount: 1250.5, transaction_type: 'expense', currency: 'PHP',
      category: 'Food', account_name: 'Cash', source: 'csv_import',
    });
  });

  test('returns helpful errors for missing columns and invalid rows', () => {
    expect(parseCsvTransactions('Description,Amount\nCoffee,100').errors[0].message).toContain('Missing required columns');
    const result = parseCsvTransactions('Date,Description,Type,Amount\nno-date,Coffee,expense,0');
    expect(result.transactions).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });

  test('rejects unclosed quoted fields', () => {
    expect(() => parseCsvRows('Date,Description\n2026-10-01,"not closed')).toThrow('unclosed quoted field');
  });

  test('fingerprints equivalent records consistently', () => {
    expect(transactionFingerprint({ account_id: 'a', transaction_type: 'expense', amount: 10, merchant: 'Coffee  Shop', occurred_at: '2026-10-01T12:00:00Z' }))
      .toBe(transactionFingerprint({ account_id: 'a', type: 'expense', amount: 10, merchant: 'coffee shop', date: '2026-10-01T08:00:00Z' }));
  });
});


describe('CSV account disambiguation', () => {
  const accounts = [
    { id:'one', name:'Cash' },
    { id:'two', name:'Travel Card' },
    { id:'three', name:'  Travel   Card  ' },
  ];
  test('selects an account only when its name is unique', () => {
    expect(findUniqueCsvAccount(accounts,'cAsH')).toEqual({ account: accounts[0], ambiguous: false });
  });
  test('rejects multiple matching accounts even with varied spaces and casing', () => {
    expect(findUniqueCsvAccount(accounts,'travel card')).toEqual({ account:null, ambiguous:true });
  });
  test('does not treat an absent CSV account label as an ambiguous match', () => {
    expect(findUniqueCsvAccount(accounts,'')).toEqual({ account:null, ambiguous:false });
    expect(findUniqueCsvAccount(accounts,'Other')).toEqual({ account:null, ambiguous:false });
  });
});

test('a MOVO CSV export reads back with transfers, notes, references and stable category ids', async () => {
  const { buildCsv } = await import('./csvExport');
  const csv = buildCsv([['Date', 'Description', 'Category', 'Category ID', 'Type', 'Amount', 'Currency', 'Account', 'To Account', 'Note', 'Payment Reference'],
    ['2026-10-02T09:15:00.000Z', 'Salary', 'Income · Salary', 'income:salary', 'income', 50000, 'PHP', 'BPI', '', 'October', 'PAY-1'],
    ['2026-10-03T10:00:00.000Z', 'Move to savings', 'Transfer', '', 'transfer', 2000, 'PHP', 'BPI', 'GoTyme', '', '']]);
  const { transactions, errors } = parseCsvTransactions(csv);
  expect(errors).toEqual([]);
  expect(transactions[0]).toEqual(expect.objectContaining({ category: 'income:salary', note: 'October', payment_reference: 'PAY-1', occurred_at: '2026-10-02T09:15:00.000Z' }));
  expect(transactions[1]).toEqual(expect.objectContaining({ transaction_type: 'transfer', account_name: 'BPI', to_account_name: 'GoTyme' }));
});
