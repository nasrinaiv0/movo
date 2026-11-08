import { revokeOtherSessions } from './financeRepository';
import { supabase } from './supabaseClient';
jest.mock('./supabaseClient', () => ({
  supabase: { auth: { signOut: jest.fn() } },
}));
beforeEach(() => {
  supabase.auth.signOut.mockReset();
});
test('revokes only other sessions without ending the active session', async () => {
  supabase.auth.signOut.mockResolvedValue({ error: null, data: null });
  await expect(revokeOtherSessions()).resolves.toBeNull();
  expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'others' });
});
test('surfaces provider revocation failures instead of claiming success', async () => {
  supabase.auth.signOut.mockResolvedValue({ error: new Error('not_authorized'), data: null });
  await expect(revokeOtherSessions()).rejects.toThrow('not_authorized');
});
