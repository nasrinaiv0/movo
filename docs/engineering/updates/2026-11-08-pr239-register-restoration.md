# MOVO engineering register restoration — 2026-11-08

## Incident and evidence
- Commit `1d1d626` in the wallet-collectibles PR (#239) reduced both `docs/PR_PROGRESS.md` and `docs/engineering/MASTER_CHANGE_LEDGER.md` to 1,506 bytes each. The prior `be7c3d9` versions were 67,887 and 79,976 bytes; their final text was visibly truncated.
- The merge of import/export PR #240 did not restore these registers; the issue was detected during cross-PR conflict analysis. A passed app build does not validate documentation completeness.
- Restore both complete files from `feat/import-export-upload-preview-save-20261108` at commit `e985d32`, whose versions were 68,723 and 80,511 bytes. That branch is now merged as PR #240 and its register changes are relevant to main.
- Source files are copied by existing Git blob SHA (no lossy reconstruction and no overwriting newer application code). No database, storage, account, or billing code is changed.
- Later branch-only security/expiry/founder offer notes remain in their respective dated audit files until those PRs pass release gates.
- Verify the two exact restored Git blob hashes and complete file sizes, then require documentation-integrity regression checks in CI to prevent recurrence.

## Recovery verification
- Expected restored PR register blob: `4357dbdf4a7718a80d58a272fa0c619f3caa2c02` (68,723 bytes).
- Expected restored master ledger blob: `d56f20b6e7c8b5a195b92068a8faf379d608b576` (80,511 bytes).
- Retain all audit artifacts on the unmerged PR branches; do not infer release certification from document restoration.
