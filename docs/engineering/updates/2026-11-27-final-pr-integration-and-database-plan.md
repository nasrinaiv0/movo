# MOVO final PR integration and authorized database preparation

Contributor: Codex. Recorded before the integration commit on 2026-11-27 UTC.

The owner requests completion, merge of all MOVO PRs, then an update to the MOVO database. This supersedes earlier no-merge/no-remote-migration scope for necessary safe steps; it does not authorize paid resources, blind historical replay, deletion of customer records, untested production flags or store submission. Claude review was explicitly waived by the owner; no independent human/legal/DBA review is claimed.

## Observed source and checks

PR #335 was merged by a separate GitHub action at `7b7eea053f3e167d223c50b6d4ad000fedb2ef8d`, after its nine workflows and inspected iPhone/iPad artifacts passed. Do not replace that legitimate history. PR #347 source `6393c4284ab03e44415ba4ee14102553cb4741c2` passed all 12 workflows, including baseline and isolated SVG iOS, both R8 comparisons and all four Wear profiles. SVG remains unadopted. The current remaining open PRs are #346 and #347; both were marked ready separately.

The main integration has conflicts only in three workflow files and the progress register. Keep the stricter, already tested #347 workflow contents, preserve the unique #335 register entry and engineering note, and retain main's CLAUDE guidance. Verify every non-Markdown source blob remains identical to 6393c428. Then join #346 history while retaining its already integrated canonical atomic writer and later owner/privacy safeguards. No new PR or force update is needed. Publish only a normal fast-forward of the existing #347 branch after documentation and local checks. Fresh CI must pass on its new exact head before merge; earlier green results are baseline evidence only.

## Actual iOS evidence on 6393c428

All four native screenshot archives were checked against GitHub SHA-256 and ZIP CRC, their paths and image sizes validated, and every PNG decoded. The actual baseline and SVG Planning/entitlement screenshots were inspected. All iPhone/iPad XCTest logs report zero failures. Optional actual iPhone Duo execution and store signing/purchases are not certified.

| Artifact | SHA-256 |
| --- | --- |
| Baseline iPhone 15226961368 | 3aa0a494e9f7ac93c427d76adf78473c82b7344a0f409e21b3c204cbffb6f0a5 |
| Baseline iPad 15227912635 | dfb7a12e9ca06b1128c7bfcce2dc93127a5b3b7560118b780d19773fcb600ad2 |
| SVG iPhone 15228663527 | a105d6e7bbe023cda15450c26b55478fb7c513613b9129ebe6311304ffe2d724 |
| SVG iPad 15230327914 | 02192ee3c89bf3f53304c418bc19941c55effcbe0c1ebef03a85eab44a5c8036 |
| SVG provenance 15230158292 | 7b941f782ee7233af2ab28084e655b0baba006fd16f8073eec02b0d4ab472cdc |

The provenance source head matches 6393c428 and the candidate package/lock hashes match the existing reviewed experiment. The superseded 5709317 run failed in CoreSimulator startup/shutdown and is diagnostic history, not acceptance evidence. No assertions or timeouts were weakened and no obsolete run was retried.

## Database preparation and limits

The active Movo project was identified through the Primary Supabase connection and matched the existing repository target. Read-only inspection found the existing 44 migration entries. Timestamps differ from source in places and prior reconciliation identified remote-only entries and missing constraint capabilities. Do not blindly push or replay the complete local migration directory. Inspect actual tables, grants, policies, function signatures/definitions, constraints and relevant aggregate integrity preflights; preserve customer rows and canonical accounting. Rehearse any exact forward change on an isolated synthetic database, review rollback/recovery and migration dependencies, then apply only the verified authorized changes after source integration is safely merged. No production SQL has been executed in this continuation.

Security advisors report deliberate private RLS tables without policies and authenticated SECURITY DEFINER RPCs, plus disabled leaked-password protection. These require contextual review: do not expose private tables or revoke intentional financial RPC access merely to silence a linter. Do not change passwordless Auth or incur a plan upgrade. Source reporting/import flags remain disabled; a database migration is not moderation/legal, physical-device, store or complete production acceptance.

Rollback of this source reconciliation is a reviewed revert while preserving earlier merged history. Existing remote schema and financial data remain unchanged at this checkpoint. The main worktree's held AGENTS/register edits and private reports are not included.

## Before the second integration commit

Local merge `a56ea7da` joined actual merged main and preserved all 6393c428 runtime/workflow/test bytes. The only tree differences are Markdown: main's CLAUDE guidance, the unique #335 entry/note and this documented reconciliation. Now join #346 head `111d698f1d976ac0d63a6032ac4cc83687db4260`; its full incoming non-merge history independently passes the existing documentation gate against main. Resolve the ten known overlaps to the later integrated #347 source. Its canonical atomic writer, API, import controls and date helper were already byte-identical; the remaining differences are the later App/controller/UI/test changes documented in the handover. This conventional merge retains both histories and avoids reintroducing an obsolete implementation. Verify non-Markdown equality, ancestry, whitespace and the unchanged gate before publishing. New exact-head CI remains pending until the fast-forward publication.
