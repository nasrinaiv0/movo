import { deleteAllCloudData, isMissingTable } from './financeRepository';
import { supabase } from './supabaseClient';
import { removeAllAccountQr } from './accountQrStorage';

jest.mock('./supabaseClient', () => ({ supabase: { rpc: jest.fn(), from: jest.fn() } }));
jest.mock('./accountQrStorage', () => ({ removeAllAccountQr: jest.fn() }));

test('a missing optional table counts as nothing to delete, other errors do not', () => {
  expect(isMissingTable({ code: 'PGRST205' })).toBe(true);
  expect(isMissingTable({ code: '42P01' })).toBe(true);
  expect(isMissingTable({ code: '42501' })).toBe(false);
  expect(isMissingTable(null)).toBe(false);
});

describe('cloud reset transaction reversals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    removeAllAccountQr.mockResolvedValue(undefined);
    supabase.rpc.mockResolvedValue({ data: 2, error: null });
    supabase.from.mockImplementation(() => ({ delete: () => ({ eq: jest.fn().mockResolvedValue({ error: null }) }) }));
  });

  test('reverses transactions before clearing accounts and never uses raw transaction deletes', async () => {
    await deleteAllCloudData('owner');
    expect(supabase.rpc).toHaveBeenCalledWith('delete_all_transactions_with_reversals', { p_expected_user_id: 'owner' });
    expect(supabase.from.mock.calls.map(([table]) => table)).toEqual([
      'budgets', 'financial_accounts', 'movo_ai_conversations', 'user_preferences',
    ]);
    expect(supabase.rpc.mock.invocationCallOrder[0]).toBeLessThan(supabase.from.mock.invocationCallOrder[0]);
  });

  test.each(['42501', 'PGRST202'])('stops after reversal failure (%s) without a raw-delete fallback', async code => {
    supabase.rpc.mockResolvedValue({ error: { code, message: 'reversal unavailable' } });
    await expect(deleteAllCloudData('owner')).rejects.toMatchObject({ code });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
