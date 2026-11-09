# 2026-11-09 — MOVO Owner Access sign-in email template hardening

## Incident / verified evidence
- The MOVO owner sign-in screen at `/owner` reported "Error sending magic link email".
- Supabase project `cjsjmorqvuvvwbfyztiz` Auth logs recorded repeated HTTP 500 responses on `POST /otp` at 2026-11-09 03:59 UTC.
- Exact failure class: `html/template: ... /templates/magic-link: ends in a non-text context`, with `stateCSS` and `delimDoubleQuote`. Go's HTML template renderer cannot complete an unbalanced CSS string in the **live Supabase Magic Link template**. SMTP setup, account privileges, and Pro subscriptions are not the reported cause.
- The committed email source is not automatically deployed to Supabase Auth. Its contents may differ from the live dashboard version; do not claim otherwise.

## Code hardening
- Replace `supabase/templates/otp-email.html` with a mobile-friendly, plain inline-style email, with **one** `{{ .Token }}` placeholder in a text node only. The preview line does not display the sensitive OTP. Remove standalone CSS, responsive `@media` blocks, and attribute-level interpolations that can corrupt Go html/template contextual parsing.
- Add `scripts/validate-supabase-email-template.cjs`; execute it during `prebuild`. Reject missing/duplicate codes, unsupported variables, CSS/script blocks, and variables inside tags.
- Add regression tests in `src/owner/OwnerEmailTemplate.test.js`.

## Required live operation (not accomplished by a Git commit)
1. Open [MOVO Supabase Email Templates](https://supabase.com/dashboard/project/cjsjmorqvuvvwbfyztiz/auth/templates).
2. Select **Magic Link** (used by `supabase.auth.signInWithOtp` on the owner gate). Take a copy of the current template for rollback.
3. Replace **Body** with the full reviewed `supabase/templates/otp-email.html`; do not paste Markdown fences, an incomplete CSS section, or PR instructions. Set subject to **Your MOVO sign-in code**.
4. Save the template in Supabase. If a custom SMTP provider is configured, confirm its status and limits without changing unrelated credentials.
5. Trigger **one** owner OTP email from `https://movo.nasrinai.com/owner`, verify `POST /otp` succeeds, receive the email, enter the code, and then complete TOTP MFA. Confirm the owner's authenticated **UID** is in server-only `MOVO_OWNER_USER_IDS`.
6. Verify non-owner sign-in cannot call `/api/owner` and owner-only APIs still require `aal2` MFA.
7. Recheck Auth logs after the live template change. Do not repeatedly generate real sign-in codes to avoid email abuse/rate limiting.

## Release / security boundaries
- No Supabase production Auth configuration, SMTP credentials, user roles, billing, RLS, service keys, or customer data are changed by this PR.
- Never bypass OTP, MFA, or the UID allowlist to work around an email delivery failure.
- A green GitHub/Vercel build checks code only; it **does not** confirm the live Supabase Email Template was published.
- Production issue remains **pending live template update and one real end-to-end owner verification** until separately confirmed.
