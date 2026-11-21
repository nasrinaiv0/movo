# Integrate released audit fixes into #331 — 2026-11-21

The owner explicitly requested merging all draft PRs. #330 merged as `c3e37d7c6a1bac23533c8c0a626a6f05709f6dd0` after all eight published-head code/native/SQL/container workflows passed. Merge its source into #331 while retaining the isolated development overrides and their compatibility regression. Resolve documentation by preserving both histories; no application behavior, production dependency, account/model/API contract, database or hosting setting is changed by the remaining #331 diff.

Clean Node 26.13.1 installation passes. The combined tree passes 259 suites / 1,708 tests, typecheck, 24 Node tests, strict original-only build and its packaging audit (54 worker resources). Fresh exact-head CI is required before the source merge. The production dependency graph remains unchanged; the remaining development advisories are tracked separately.

The owner-directed source merge does not activate production migrations, Cloud Run, billing or store publishing. Vercel's account restriction remains a separate availability issue, not a claimed passing deployment. Preserve the unapplied #274 migration/activation hold and signed-device/name/rights evidence gates while continuing #291/#274 integration.
