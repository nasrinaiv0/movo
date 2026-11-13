import { authErrorCategory } from './authErrorCategory';

describe('safe Supabase Auth error classification', () => {
  test.each([
    [{ code: 'oauth_provider_not_supported' }, 'oauth-not-configured'],
    [{ message: 'OAuth was not configured' }, 'oauth-not-configured'],
    [{ message: 'Unsupported provider: google' }, 'oauth-not-configured'],
    [{ message: 'Provider is not enabled' }, 'oauth-not-configured'],
    [{ code: 'invalid_api_key', message: 'private value not to display' }, 'invalid-api-key'],
    [{ message: 'Invalid JWT' }, 'invalid-api-key'],
    [{ code: 'email_address_not_authorized' }, 'email-delivery'],
    [{ code: 'email_send_failed' }, 'email-delivery'],
    [{ message: 'Error sending magic link email' }, 'email-delivery'],
    [{ message: 'html/template: invalid context' }, 'email-delivery'],
    [{ code: 'otp_disabled' }, 'email-delivery'],
    [{ code: 'over_email_send_rate_limit' }, 'rate-limited'],
    [{ status: 429 }, 'rate-limited'],
    [{ code: 'otp_expired' }, 'invalid-code'],
    [{ code: 'invalid_otp' }, 'invalid-code'],
    [{ code: 'android_auth_browser_unavailable' }, 'android-browser'],
    [{ code: 'secure_auth_write_failed' }, 'native-secure-storage'],
    [{ code: 'secure_auth_read_failed' }, 'native-secure-storage'],
    [{ message: 'secure_auth_legacy_cleanup_failed' }, 'native-secure-storage'],
    [{ code: 'invalid_secure_auth_key' }, 'native-secure-storage'],
    [{ code: 'invalid_secure_auth_value' }, 'native-secure-storage'],
    [{ code: 'secure_auth_delete_failed' }, 'native-secure-storage'],
    [{ message: 'MovoNative plugin is not implemented on android' }, 'native-secure-storage'],
    [{ message: 'Failed to fetch' }, 'network'],
    [null, 'unknown'],
  ])('maps %p to %s without echoing provider details', (error, kind) => {
    expect(authErrorCategory(error)).toBe(kind);
  });
});
