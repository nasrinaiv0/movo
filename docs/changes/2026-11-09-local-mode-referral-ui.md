# MOVO UI change â€” 2026-11-09

## Scope
- Local Mode feature restriction sheet: compressed copy into a clear, two-section explanation. Kept subscription non-cancellation disclosure and Cloud Sync settings control.
- Profile: added a borderless Refer MOVO menu row under the user card. The sheet displays a client-side QR code and copyable referral code, plus server-reported qualified referral progress.
- qrcode.react draws the QR locally. The QR encodes the actual referral code, not a speculative app URL or secret. Users must enter the code in the existing free Pro trial flow.
- Signed-out accounts cannot view/forge codes; they see sign-in. Accounts without an issued code are directed to Cloud Sync settings. No new entitlements are created; rewards remain server-authoritative.
- On supported devices, Share opens the native share sheet. Otherwise the code is copied. Clipboard failures show instructions to select and copy.

## Testing checklist
- PASS: src/screens/Profile.test.js and src/components/PlanRestrictions.test.js
- PASS: Vercel Sandbox production build, TypeScript typecheck, 168 test suites / 1020 tests, and i18n validation across 11 languages
- PENDING MANUAL: Check narrow iPhone layout and dark/light theme on preview
- Manually scan the QR and enter it in the trial redemption field
- Confirm awards only after 10 verified paid referrals through server processing

## Release impact
No database migrations, no new API routes, no change to billing logic. Merge only after¶»§q«^