import { createAccount, updateAccount, createTransaction, updateTransaction } from './financeRepository';
jest.mock('./supabaseClient', () => ({ supabase: null }));

describe('finance repository validation', () => {
  test('rejects account writes without a signed-in user', async () => {
    await expect(createAccount({ name: 'Cash', account_type: 'cash' }, null)).rejects.toThrow('signed-in user');
  });
  test('rejects invalid account names before contacting Supabase', async () => {
    await expect(createAccount({ name: '   ', account_type: 'cash' }, 'user-id')).rejects.toThrow('Account name');
  });
  test('rejects malformed account currency before contacting Supabase', async () => {
    await expect(createAccount({ name: 'Cash', account_type: 'cash', currency: 'US' }, 'user-id')).rejects.toThrow('three-letter account currency');
  });
  test('rejects non-positive transaction amounts', async () => {
    await expect(createTransaction({ amount: 0, merchant: 'Coffee', transaction_type: 'expense', account_id: 'account-id' }, 'user-id')).rejects.toThrow('greater than zero');
  });
  test('rejects malformed transaction types', async () => {
    await expect(createTransaction({ amount: 100, merchant: 'Coffee', transaction_type: 'unknown', account_id: 'account-id' }, 'user-id')).rejects.toThrow('valid transaction type');
  });
  test('requires different source and destination accounts for transfers', async () => {
    await expect(createTransaction({ amount: 100, merchant: 'Move money', transaction_type: 'transfer', account_id: 'same', transfer_to_account_id: 'same' }, 'user-id')).rejects.toThrow('two different accounts');
  });
  test('rejects writes without an authenticated identity', async () => {
    await expect(createTransaction({ amount: 100, merchant: 'Coffee', transaction_type: 'expense', account_id: 'account-id' }, '')).rejects.toThrow('signed-in user');
  });
  test('rejects malformed transaction currency codes before contacting Supabase', async () => {
    await expect(createTransaction({ amount: 10, merchant: 'Coffee', transaction_type: 'expense', account_id: 'account-id', currency: 'US' }, 'user-id')).rejects.toThrow('three-letter currency');
    await expect(updateTransaction('transaction-id', { amount: 10, merchant: 'Coffee', transaction_type: 'expense', account_id: 'account-id', currency: 'US' })).rejects.toThrow('three-letter currency');
  });

  test('rejects invalid transaction updates before contacting Supabase', async () => {
    await expect(updateTransaction('transaction-id', { amount: 0, merchant: 'Coffee', transaction_type: 'expense', account_id: 'account-id' })).rejects.toThrow('greater than zero');
  });
  test('requires a different destination when updating a transfer', async () => {
    await expect(updateTransaction('transaction-id', { amount: 100, merchant: 'Move money', transaction_type: 'transfer', account_id: 'same', transfer_to_account_id: 'same' })).rejects.toThrow('two different accounts');
  });

  test('rejects invalid account updates before contacting Supabase', async () => {
    await expect(updateAccount('account-id', { name: '   ' })).rejects.toThrow('Account name');
  });
  test('rejects unsupported account types when updating', async () => {
    await expect(updateAccount('account-id', { account_type: 'unsupported' })).rejects.toThrow('valid account type');
  });
  test('rejects malformed account currency updates before contacting Supabase', async () => {
    await expect(updateAccount('account-id', { currency: 'US' })).rejects.toThrow('three-letter account currency');
  });

});
