import { getEmailCodeErrorMessage } from './AuthPanel';

describe('email OTP delivery diagnostics', () => {
  test('explains Supabase email rate limits', () => {
    expect(getEmailCodeErrorMessage({ code: 'over_email_send_rate_limit', status: 429 }))
      .toMatch(/limiting email requests/i);
  });

  test('explains SMTP delivery failures without exposing provider details', () => {
    expect(getEmailCodeErrorMessage({ message: 'Error sending confirmation email', status: 500 }))
      .toMatch(/SMTP Settings/i);
  });

  test('explains disabled email authentication', () => {
    expect(getEmailCodeErrorMessage({ code: 'email_provider_disabled' }))
      .toMatch(/Email sign-in is disabled in Supabase/i);
  });

  test('explains invalid deployment credentials', () => {
    expect(getEmailCodeErrorMessage({ message: 'Invalid API key', status: 401 }))
      .toMatch(/project URL and publishable\/anon key/i);
  });

  test('uses a safe actionable fallback for unknown errors', () => {
    const message = getEmailCodeErrorMessage({ message: 'internal sensitive detail' });
    expect(message).toMatch(/Supabase Auth logs/i);
    expect(message).not.toContain('internal sensitive detail');
  });
});
