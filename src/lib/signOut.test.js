import { signOut } from './financeRepository';
import { supabase } from './supabaseClient';

jest.mock('./supabaseClient', () => ({
  supabase: { auth: { signOut: jest.fn(), getSession: jest.fn() } },
}));
const offline = () => Object.assign(new TypeError('Failed to fetch'), { name: 'AuthRetryableFetchError' });

beforeEach(() => { supabase.auth.signOut.mockReset(); supabase.auth.getSession.mockReset(); });

test('online: the server ends the session', async () => {
  supabase.auth.signOut.mockResolvedValue({ error: null });
  await expect(signOut()).resolves.toEqual({ localOnly: false });
  expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  expect(supabase.auth.signOut).toHaveBeenCalledWith(undefined);
});

test('offline: the session is still removed from this device', async () => {
  supabase.auth.signOut.mockResolvedValueOnce({ error: offline() }).mockResolvedValueOnce({ error: offline() });
  supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  await expect(signOut()).resolves.toEqual({ localOnly: true });
  expect(supabase.auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
});

test('a thrown error is handled the same way', async () => {
  supabase.auth.signOut.mockRejectedValueOnce(offline()).mockResolvedValueOnce({ error: null });
  supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  await expect(signOut()).resolves.toEqual({ localOnly: true });
});

test('never reports success while this device is still signed in', async () => {
  supabase.auth.signOut.mockResolvedValue({ error: offline() });
  supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'still-here' } }, error: null });
  await expect(signOut()).rejects.toThrow('Failed to fetch');
  supabase.auth.getSession.mockRejectedValue(new Error('storage unavailable'));
  await expect(signOut()).rejects.toThrow('Failed to fetch');
});
