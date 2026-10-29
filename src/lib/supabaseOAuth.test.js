import { signInWithGoogle } from './financeRepository';
import { supabase } from './supabaseClient';

jest.mock('./supabaseClient', () => ({
  supabase: { auth: { signInWithOAuth: jest.fn().mockResolvedValue({ data: { provider: 'google' }, error: null }) } },
}));

describe('Google OAuth configuration', () => {
  beforeEach(() => { supabase.auth.signInWithOAuth.mockClear(); });

  test('uses Google provider and redirects to the current MOVO origin', async () => {
    await signInWithGoogle();
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    });
  });
});
