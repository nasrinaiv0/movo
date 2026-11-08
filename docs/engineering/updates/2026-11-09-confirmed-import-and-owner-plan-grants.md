# Confirmed local import + owner-managed Pro / Pro+ access — 2026-11-09

## What changed
- File previews remain read-only until the second confirmation.
- Both guest and signed-in local commits now **read back** persisted account and transaction arrays before reporting success and updating Home, Wallet, and Transactions.
- Zero-record imports no longer say "Records saved"; the preview remains actionable. This is particularly important for unsupported backup groups and duplicate-only files.
- Only accounts and transactions are currently replayed by the MOVO finance-backup JSON importer; all other groups are **preview-only**. This change does not assert a complete import of loans, budgets, QR, subscriptions, attachments or scheduled operations.
- Cloud sync is never written by these local import actions. Original account ownership is not replayed. Existing same-name/currency and transfer ambiguity checks remain.

## Complimentary Pro / Pro+ grants (database authority)
Migration: `20261108230330_owner_manual_plan_grants.sql`. Apply **after** the existing plans migration; it is not automatically applied to production by this PR. No user client can write or change manual grants.

1. Find the verified account UUID in Supabase Authentication > Users (do not infer an ID from an email string).
2. As an authorized database administrator, execute the following in Supabase SQL Editor:

```sql
-- 30 days of Pro: replace the UUID with a real verified user.
insert into public.movo_manual_plan_grants(user_id, tier, expires_at, reason)
values ('00000000-0000-0000-0000-000000000000'::uuid, 'pro', now() + interval '30 days', 'Complimentary access');

-- Pro+ for a 90-day promotional grant:
insert into public.movo_manual_plan_grants(user_id, tier, expires_at, reason)
values ('00000000-0000-0000-0000-000000000000'::uuid, 'pro_plus', now() + interval '90 days', 'Owner promotion');
```

Verify effective access (the server will also return `source: "manual"` if this is the effective winning grant):

```sql
select public.movo_plan_status('00000000-0000-0000-0000-000000000000'::uuid);
```

Revoke one specific grant (copy its actual UUID from the query, never revoke unrelated grants):

```sql
select id, tier, expires_at, revoked_at, reason
from public.movo_manual_plan_grants
where user_id = '00000000-0000-0000-0000-000000000000'::uuid
order by granted_at desc;

update public.movo_manual_plan_grants set revoked_at = now()
where id = '00000000-0000-0000-0000-000000000000'::uuid and revoked_at is null;
```

Expiry is determined by the database clock; stale client entitlements must be refreshed. Manual entitlements do not create App Store / Play receipts, purchases, charges or referral-qualification purchases. Plan status selects the highest valid tier among store, referral, trial and unrevoked manual grants. The existing cloud plan triggers enforce these grants server-side.

### Vercel environment handling
Vercel environment variables **cannot independently grant secure MOVO access**: the database RLS/triggers cannot read Vercel variables. Do not put `service_role` or admin SQL credentials in browser-prefixed `REACT_APP_*` keys. For an eventual owner dashboard/API, configure a *server-only* owner allowlist or identity assertion in Vercel and write grants through a reviewed, authenticated server endpoint to this table. Such an endpoint is **not** introduced in this PR. Avoid hardcoded user emails or JSON lists that can diverge from database access.

## Verification and release
- Vercel Sandbox: `movo-import-persist-20261109`, source branch `fix/import-confirm-local-persistence-20261109`.
- Focused frontend regression: 23 tests / 3 suites passed after installing lockfile dependencies.
- SQL: added isolated `manual_plan_grants.test.sql` and integrated into `scripts/test-plan-migration.py`. Run against disposable PostgreSQL first.
- Pending: exact-head full CI/build; real iPhone Safari and signed devices; full JSON multi-domain restore; verification against actual deployed DB schema. Do not merge or deploy until release checks and migration rehearsal pass.
- No live customer records, production SQL, or production environment variables were modified.
