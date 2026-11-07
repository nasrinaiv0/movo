# MOVO — E-wallet payment QR uploads
**Date:** 2026-11-07
**Base:** main at a0b724b2d4b953e61d04c8fd2fe14892c857c575
**Scope:** Wallet e-wallet account add/edit and QR display

## User story
Owners of e-wallet accounts (including GCash, Maya and other e-wallets) can attach a payment QR image to a particular account. The e-wallet card previews it, the account details screen can enlarge it, and the account editor allows replacing/removing it. Existing bank QR behavior is preserved.

## Findings and root cause
Wallet account tile and AccountDetailsSheet already supported QR display for account_type e_wallet. AccountSheet rendered the QR uploader only for bank, and App.saveAccount QR persistence selected an empty value for non-bank account types. That prevented e-wallet QR uploads from being stored.

## Code changes
- src/lib/accountQrEligibility.js: allowlist only bank and e_wallet. Excludes cards, cash, investments, memberships and other types.
- src/components/AccountSheet.js: reuse bank QR uploader for e-wallet, with dedicated accessible label, explanation and image alt; preserve bank flow.
- src/App.js: persist account-specific QR for banks or e-wallets, neutral offline-sync message. Reuse the existing private PNG cloud storage and local IndexedDB cache.
- src/i18n/catalog/bank-qr.js: four new strings translated into all 11 supported languages, with generated locales updated.
- Tests: src/lib/accountQrEligibility.test.js, src/components/AccountSheetQr.test.js, and e-wallet QR zoom regression in src/components/AccountDetailsSheet.test.js.

## Privacy, storage and scope
- Accept PNG/JPEG/WebP images up to 8 MB and process/crop locally into PNG. Existing encoded QR max 1.2 MB is unchanged.
- Signed-in users use private Supabase Storage bucket movo-account-qrs with user-ID-prefixed object paths and authenticated access policies, not public storage; signed URLs are short-lived.
- Local-only users use IndexedDB for device-stored QR images. Existing cloud offline-retry and cache logic are reused.
- QR images are not sent to the chat model, financial transaction ledger, payment processor or other accounts. Displaying the code never initiates a payment.
- No database migration, RLS policy changes, billing changes, financial calculations, account balance changes or provider keys.
- Users can remove or replace a QR from Wallet, account details, Edit account.

## Verification
- Focused Jest: 11 tests passed across eligibility, editor QR UI, upload processing callback, bank regression, detail zoom, and localization.
- Full Vercel Sandbox: npm ci and npm run build (typecheck, 717/717 Jest tests in 129 suites, optimized React bundle compiled successfully).
- Chromium mobile viewport 390x844 with production CSP and optimized built app: create E-Wallet GCash account, upload a synthetic PNG QR, see preview, save account, see QR on e-wallet card, reload and verify QR survives, edit and remove QR, save and verify QR is gone.
- iOS physical hardware and authenticated remote cloud paths were not tested end-to-end; verify on device after deployment.

## Rollback
Revert the PR. No schema migrations, financial records or private storage policies were changed.
