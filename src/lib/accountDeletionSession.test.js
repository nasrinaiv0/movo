import { deleteMyAccount } from './financeRepository';
import { supabase } from './supabaseClient';

jest.mock('./supabaseClient', () => ({ supabase: { auth: { getSession: jest.fn() } } }));

const originalFetch = global.fetch;

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

test('an account switch after opening the confirmation never sends a deletion request', async () => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'different-user' }, access_token: 'different-token' } } });
  await expect(deleteMyAccount('confirmed-user')).rejects.toThrow('account_changed');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('sends the token only when it belongs to the confirmed account', async () => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'confirmed-user' }, access_token: 'confirmed-token' } } });
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ deleted: true }) });
  await expect(deleteMyAccount('confirmed-user')).resolves.toBe(true);
  expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/account\/delete$/), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer confirmed-token' },
    body: JSON.stringify({ confirm: 'DELETE' }),
  });
});
