import { oauthProviderEnabled, signInWithApple, signInWithGoogle } from './financeRepository';
import { supabase } from './supabaseClient';
import { authErrorCategory } from './authErrorCategory';

jest.mock('./supabaseClient', () => ({
  supabase: { auth: { signInWithOAuth: jest.fn().mockResolvedValue({ data: { provider: 'google' }, error: null }) } },
}));

const settings = (external, ok = true) => jest.fn().mockResolvedValue({ ok, json: async () => ({ external }) });
const env = { ...process.env };
beforeEach(() => {
  process.env.REACT_APP_SUPABASE_URL = 'https://example-ref.supabase.co/';
  process.env.REACT_APP_SUPABASE_ANON_KEY = 'sb_publishable_test_key_value_123456';
  supabase.auth.signInWithOAuth.mockClear();
  supabase.auth.signInWithOAuth.mockResolvedValue({ data: { provider: 'google' }, error: null });
});
afterAll(() => { process.env = env; });

test('reads the public provider list with the publishable key', async () => {
  const fetchImpl = settings({ apple: false, google: true });
  await expect(oauthProviderEnabled('apple', { fetchImpl })).resolves.toBe(false);
  await expect(oauthProviderEnabled('google', { fetchImpl })).resolves.toBe(true);
  expect(fetchImpl).toHaveBeenCalledWith('https://example-ref.supabase.co/auth/v1/settings', expect.objectContaining({ headers: { apikey: 'sb_publishable_test_key_value_123456' } }));
});

test('an unknown answer never blocks sign-in', async () => {
  await expect(oauthProviderEnabled('apple', { fetchImpl: jest.fn().mockRejectedValue(new Error('offline')) })).resolves.toBe(true);
  await expect(oauthProviderEnabled('apple', { fetchImpl: settings({ apple: false }, false) })).resolves.toBe(true);
  await expect(oauthProviderEnabled('apple', { fetchImpl: jest.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('bad json'); } }) })).resolves.toBe(true);
  await expect(oauthProviderEnabled('apple', { fetchImpl: settings({}) })).resolves.toBe(true);
  delete process.env.REACT_APP_SUPABASE_URL;
  await expect(oauthProviderEnabled('apple', { fetchImpl: settings({ apple: false }) })).resolves.toBe(true); // no cloud configured: nothing to check
});

test('a switched-off provider stops before the browser opens, with an error MOVO explains in its own words', async () => {
  const original = global.fetch;
  global.fetch = settings({ apple: false, google: true });
  try {
    const failure = await signInWithApple().then(() => null, error => error);
    expect(failure).not.toBeNull();
    expect(authErrorCategory(failure)).toBe('oauth-not-configured');
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
    await signInWithGoogle();
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledTimes(1);
  } finally {
    global.fetch = original;
  }
});
