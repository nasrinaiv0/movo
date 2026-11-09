# 2026-11-09 — One-time referral incentives with server verification

## Scope and user intent

- Compact Local Mode restriction sheet; preserve existing plan pause, export and non-cancellation information.
- Profile **Refer MOVO** action shows a server-generated 256-bit one-use QR/token, Copy, Share, points and referrals. A second user can redeem the token only within seven days of creating and verifying an account.
- An eligible new app sign-in earns the inviter 5 points **only after server-verified Apple App Attest / Google Play Integrity challenge validation**. A first store-verified production Pro/Pro+ purchase earns 100 more, at most once. Renewals earn nothing more. A refund/voided purchase can reverse 100 once.
- Current “10 verified paid referrals → three months Pro” subscription reward remains separate.

## Database security

Migration `20261109153000_verified_referral_points.sql` defines: invite hashes and expirations, single-use claims with one referred user per invitation, expiring challenge hashes, and an immutable-incentive-model event ledger unique by (claim, kind). All tables have RLS; no ordinary signed-in or anonymous role can write or directly select. Only service-role RPCs create records after JWT owner checks in API handlers; functions use SECURITY INVOKER. The 5-point and 100-point credits are distinct from financial transactions, balances, cashback, loyalty, and subscription entitlements. Rate limits: 20 invitations/day/referrer, 10 attestation challenges/hour/new account, and automatic review hold after ten new verified signups/day/referrer. These measures reduce but cannot entirely eliminate Sybil fraud.

## Mobile and purchase verification

- Apple: server checks X.509 chain and challenge using `appattest-checker-node`; production Team ID, bundle and environment are required.
- Google: decodes Play Integrity by Google API and checks request hash, app package/signing certificate, device integrity, licensing and recency. Store transaction and RTDN notifications already verify purchases and now post points idempotently behind flag.
- Native attestation does not prove uniqueness of human beings; device farms remain possible. Suspicious awards are held for fraud review.
- Referral APIs require an authenticated, server-verified JWT and are disabled by default via `MOVO_REFERRAL_POINTS_ENABLED=false`.

## Test evidence, 2026-11-09

- Vercel Sandbox built the exact working source: 169/169 Jest suites, 1,022/1,022 tests passed, optimized bundle compiled.
- Sandbox npm audit production dependencies: zero reported vulnerabilities.
- New PostgreSQL GitHub workflow `referral-points-security.yml` passed against disposable PostgreSQL fixtures for uniqueness, self-referral, repeated challenge, 5/100 reward isolation, sandbox rejection, refund adjustment and no client writes; existing finance tenant isolation also passed.
- Large GitHub source files and lockfile were verified intact after a previous transfer truncation was discovered; the affected PR #257 was closed.

## Outstanding release gates

- Exact latest PR-head CI must pass across all workflows; before completion, do not merge.
- iOS App Attest capability, Apple Team ID, Google Play Integrity Cloud project/production signing digest, and true signed device verification are outstanding.
- Validate iPhone Safari and Android UI/QR scan/share behavior, production billing callbacks, refunds and privacy disclosures.
- **No migration applied to MOVO production; no flag enabled, no points actually awarded on production.** All changes remain on PR branch.
