# PR #245 — payment-link render loop fix (2026-11-09)

**Problem.** With Cloud Sync off, #245 pauses paid features. The payment-link effect in `src/App.js` opened the
plans sheet *before* marking the `#log?...` link as handled or clearing it from the address bar, so every render
re-ran the effect and opened the sheet again ("Maximum update depth exceeded"). `src/App.test.js` hung on the
Apple Pay scenarios; this is why the branch had no completed CI run.

**Fix.** Each link is marked handled and removed from the URL first; a link that needs Pro+ then opens the plans
sheet once. No plan rule changed: local mode still pauses Pro/Pro+ features (`canUseFeatureInMode`).

**Tests.**
- New App test: in local mode a payment link opens the plans sheet exactly once and the hash is cleared. It fails
  with the previous ordering (verified by reverting the fix).
- App feature scenarios run with plain plan rules (they render without Supabase, i.e. in local mode); the local
  pause itself stays covered by `planAccess.test.js`. The entitlement fixture is now one stable object.
- `src/App.test.js`: 49/49 pass in about 7 seconds (previously timed out).
