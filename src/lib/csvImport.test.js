import { parseCsvRows, parseCsvTransactions, transactionFingerprint } from './csvImport';

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


  test('rejects malformed explicit currency instead of silently defaulting to PHP', () => {
    const result = parseCsvTransactions('Date,Description,Type,Amount,Currency\\n2026-10-01,Coffee,expense,12.50,USDT');
    expect(result.transactions).toEqual([]);
    expect(result.errors).toEqual([{ line: 2, message: 'Currency must be a three-letter code, for example PHP or USD.' }]);
  });

  test('defaults a blank optional currency to PHP', () => {
    const result = parseCsvTransactions('Date,Description,Type,Amount,Currency\\n2026-10-01,Coffee,expense,12.50,');
    expect(result.errors).toEqual([]);
    expect(result.transactions[0].currency).toBe('PHP');
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
