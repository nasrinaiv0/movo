# MOVO email OTP delivery troubleshooting

## What the sign-in UI does

The email sign-in uses Supabase Auth `signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo } })`. The client uses the public MOVO Supabase URL and anon/publishable key. It must never use a service-role key in the browser.

The sign-in UI now maps common Supabase errors to actionable messages instead of replacing every failure with the same generic retry message. These messages are diagnostic hints; the Supabase Auth logs and dashboard remain the source of truth.

## Production checks

1. In Vercel, confirm the production deployment has `REACT_APP_SUPABASE_URL` set to the dedicated MOVO project URL and `REACT_APP_SUPABASE_ANON_KEY` set to that project's anon/publishable key. Do not use `SUPABASE_SERVICE_ROLE_KEY` in a `REACT_APP_*` variable.
2. Redeploy after changing environment variables. Check that the deployed app points to the intended project.
3. In Supabase → Authentication → Sign In / Providers, make sure Email is enabled.
4. In Supabase → Authentication → Email Templates, confirm the Magic Link template includes `{{ .Token }}` if the product should display a numeric OTP. Without it, users may receive only a magic link.
5. In Supabase → Authentication → SMTP Settings, configure a verified sender and working SMTP provider for production. Check sender/domain verification, provider logs, and Supabase Auth logs if delivery fails.
6. In Supabase → Authentication → Rate Limits, review the email send limit. MOVO enforces a 60-second client resend cooldown, but Supabase's server-side limit still applies.
7. In Supabase → Authentication → URL Configuration, set the Site URL to `https://movo.nasrinai.com` and allow that origin for email links and OAuth callbacks.
8. Test a fresh address and a returning account, verify the code, then confirm the resulting session persists after a page reload.

## Interpreting the UI messages

- **Email requests are rate limited:** wait at least 60 seconds and check Supabase's email rate limits.
- **Email delivery failed / SMTP:** inspect SMTP settings, sender verification, the email template, and Auth logs.
- **Email sign-in disabled:** enable the Email provider.
- **Supabase connection/configuration:** verify the deployed URL and public key and redeploy.
- **Generic Supabase rejection:** use the exact request timestamp to find the corresponding Auth log entry.

Do not paste secrets, OTPs, access tokens, or full authentication response payloads into issue reports. Never log a user's OTP or session tokens.
