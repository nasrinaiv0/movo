# Open PR consolidation — 2026-11-20

#328 is merged after owner-approved migration and catalog verification. Its production Vercel deployment is READY. #327 contains all #326 commits and incorporates #329 without altering its focus trap, inert background or reduced-motion behavior. Only progress-register entries conflicted; both were preserved. The source trees carry their original detailed implementation and rollback notes.

Local integrated JavaScript tests, TypeScript, production compilation, Python iOS orchestration and R8 harness checks are recorded in the PR body as they finish. Hosted checks must pass at the new head. No skipped store-upload job counts as a store release. Physical device/provider acceptance remains outside automated CI. #329 is closed as consolidated only after the containing PR merges.

#291 encryption and #274 erasure/retention have substantial conflicts with newer privacy and consent code. They remain open until separately validated. No additional production database changes are authorized by the approval limited to #328.
