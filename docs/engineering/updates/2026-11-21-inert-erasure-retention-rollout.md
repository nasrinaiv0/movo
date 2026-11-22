# Keep destructive rollout inert during source merges — 2026-11-21

The owner explicitly requests merging all draft PRs. This authorizes source integration; the earlier production approval still covers #328 only. Keep #274's three migrations, storage freeze, atomic erasure and age-based retention separately approval-held.

Add two server-only switches, both disabled unless exactly `true`: `MOVO_ACCOUNT_ERASURE_ENABLED` and `MOVO_DATA_RETENTION_ENABLED`. Disabled deletion/clear return 503 before constructing Supabase clients, freezing accounts, listing/removing files or running SQL. Disabled retention returns 503 before using a configured cron secret or creating an admin client. A source merge and an existing cron schedule/secret cannot activate these destructive features. Neither switch is embedded in the browser.

Four disabled/unrecognized values are tested on both deletion and clear, and four on retention even with a valid cron credential. Enabled retention still requires cron authentication before the existing RPC. Existing owner-only, recursive storage cleanup, retry and atomic-erasure tests remain. Fourteen focused tests pass on the pre-integration branch. Full current-main/owner/encryption validation remains required before merge.

No production environment value, record, schema, storage object, cron secret, user account, hosting or store setting is changed. After separately approved and rehearsed production migrations, an operator may explicitly activate these server features and verify them on disposable accounts. Keep them disabled for now; account erasure through these endpoints remains unavailable and must not be represented as App Store acceptance.
