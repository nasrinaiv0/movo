import { supabase } from './supabaseClient';
import { deleteReceivable, updateReceivable } from './obligationsRepository';

jest.mock('./supabaseClient', () => ({ supabase: { from: jest.fn() } }));

const queryBuilder = () => {
  const query = {};
  query.update = jest.fn(() => query);
  query.eq = jest.fn(() => query);
  query.neq = jest.fn(() => query);
  query.select = jest.fn(() => query);
  query.single = jest.fn(async () => ({ data: { id: 'rec-123' }, error: null }));
  supabase.from.mockReturnValue(query);
  return query;
};

beforeEach(() => jest.clearAllMocks());

test('Edit is metadata-only and account/collection/principal details cannot be overwritten', async () => {
  const query = queryBuilder();
  await updateReceivable('rec-123', {
    name: ' Emergency loan ', counterparty: ' Family ', reason: ' Advance ',
    due_date: '2026-12-04', notes: ' Note ',
    opening_amount: 99999999, outstanding_amount: 0, currency: 'USD',
    status: 'settled', account_id: 'other-account', transaction_id: 'other-tx',
  }, 'user-789');
  const patch = query.update.mock.calls[0][0];
  expect(patch).toMatchObject({
    name: 'Emergency loan', counterparty: 'Family', reason: 'Advance',
    due_date: '2026-12-04', notes: 'Note',
  });
  expect(Object.keys(patch).sort()).toEqual(['counterparty','due_date','name','notes','reason','updated_at']);
  expect(supabase.from).toHaveBeenCalledWith('financial_receivables');
  expect(query.eq).toHaveBeenCalledWith('id', 'rec-123');
  expect(query.eq).toHaveBeenCalledWith('user_id', 'user-789');
  expect(query.neq).toHaveBeenCalledWith('status', 'archived');
});

test('Delete archives the receivable with owner filtering and retains posted events', async () => {
  const query = queryBuilder();
  await deleteReceivable('rec-123', 'user-789');
  expect(query.update).toHaveBeenCalledTimes(1);
  expect(Object.keys(query.update.mock.calls[0][0]).sort()).toEqual(['status','updated_at']);
  expect(query.update.mock.calls[0][0].status).toBe('archived');
  expect(query.eq).toHaveBeenCalledWith('user_id', 'user-789');
  expect(query.neq).toHaveBeenCalledWith('status', 'archived');
  expect(query.delete).toBeUndefined();
});

test('Edit and Delete fail closed without authenticated user or record id', async () => {
  await expect(updateReceivable('', { name: 'Fund' }, 'user')).rejects.toThrow('Sign in');
  await expect(updateReceivable('rec', { name: 'Fund' }, null)).rejects.toThrow('Sign in');
  await expect(deleteReceivable('', 'user')).rejects.toThrow('Sign in');
  await expect(deleteReceivable('rec', undefined)).rejects.toThrow('Sign in');
  expect(supabase.from).not.toHaveBeenCalled();
});

test('Edit rejects malformed dates and names before writing to the database', async () => {
  for (const due_date of ['2026-02-30', '2026-13-01', 'not-date']) {
    await expect(updateReceivable('rec', { name: 'Fund', due_date }, 'user')).rejects.toThrow('valid due date');
  }
  await expect(updateReceivable('rec', { name: '', due_date: '' }, 'user')).rejects.toThrow('Name');
  expect(supabase.from).not.toHaveBeenCalled();
});

test('Account error is propagated; no false success for permission or network failures', async () => {
  const q = queryBuilder();
  q.single.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });
  await expect(deleteReceivable('rec-123', 'user-789')).rejects.toMatchObject({ message: 'permission denied' });
});
