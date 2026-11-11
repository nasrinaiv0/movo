# 2026-11-12 — MOVO bank/card activity and e-wallet card display (PR #275)

## Feature
Banks show their own ledger transactions plus transactions directly assigned to each explicitly linked active debit card or issuer-linked credit card. The Account details → Transactions tab provides an All activity view, Bank account view, and one view for each linked card (masked suffix). Full history is progressive, 50 records at a time. Individual card detail remains strictly scoped to that card. Recent activity and Money Flow in the bank overview use the same combined, deduplicated rows.

The Wallet → Cards carousel and pile now include active e-wallets, which remain separately available under E-Wallets. No account type is reclassified.

## Security and accounting isolation
- Link debit cards via cardBankLinks / linkedAccountId; credit cards via the issuing-bank ID. No institution-name guessing.
- Archived cards and other banks' cards are excluded from bank grouping.
- Transfer rows are deduplicated by transaction ID even when both account endpoints are in the bank group.
- Display-only projections: no writes to transactions, balances, offline cache, sync, Supabase schema, or access controls.
- Existing account-specific privacy and currency formatting remain in effect.

## Tests and release controls
- Pure helper regression covers link precedence, cross-bank exclusion, archived links, transfer destination visibility and duplication.
- React component regression covers bank aggregate, individual card filters, history clickthrough, and 65-item pagination.
- Wallet filter regression covers dual e-wallet visibility and archived exclusion. Seven new labels localized for all 11 languages with matching placeholders.
- First GitHub CI run: 195 of 196 Jest suites passed. The locale key check failed on seven new keys; translated strings are included in the updated head. Await exact-head CI and build.
- Vercel Sandbox creation and resume both rejected by Vercel HTTP 402 payment_required. Sandbox UI/browser verification NOT completed; device tests and preview gate remain pending. Do not merge until release checks pass.

## Rollback
Feature is a pure view change; revert its UI/helper/catalog changes to restore previous layout without any data rollback.

## 2026-11-12 — Follow-up: PostgreSQL client CI DNS repair

**Observed failure:** Finance Tenant Isolation GitHub Actions run 43060104116 exited 100 while `apt-get install postgresql-client` could not resolve `azure.archive.ubuntu.com`. The local PostgreSQL service started successfully, but the cross-tenant SQL tests never ran; there was no proven SQL/RLS failure.

**Minimal repair:** Remove the network-dependent apt step and the now-unused runner port mapping. Add thin `psql`, `createdb` and `dropdb` wrappers in `$RUNNER_TEMP` that call `docker exec -i` on `job.services.postgres.id`. `PGPASSWORD` is injected only into that disposable service process; the Python test harness keeps its loopback-only host guard, dedicated randomly named test database, cleanup and fail-closed behavior. Client connections point to PostgreSQL port 5432 inside the service. The wrapper forwards SQL standard input and propagates nonzero exit status. It does **not** skip, mock, disable, or downgrade the tenant-isolation assertions.

**Pre-commit validation:** Local command-forwarding harness checked `psql`, `createdb`, `dropdb`, arguments, password scoping, and SQL stdin; all 3 passed. GitHub Actions docs confirm `job.services.postgres.id` is the service container ID. Actual PostgreSQL migration and tenant tests must still run in GitHub Actions before merge.

**Release gates:** Await exact-head full regressions, production build, hybrid sync, tenant isolation, and verified preview behavior. Vercel Sandbox access was previously rejected with HTTP 402; a Vercel deployment READY status alone is not a browser smoke test. No production release or legal-policy claim from this CI infrastructure change.
