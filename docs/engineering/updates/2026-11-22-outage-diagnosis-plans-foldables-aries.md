# Production API outage diagnosis; Plans retry; tabletop foldables; Aries horns

## Diagnosis (owner report 2026-11-22)

The owner reported three bugs: Friends not working, Plans greyed out on Android, and bank balances differing between devices. All three trace to one production fault.

- `https://movo.nasrinai.com/api/*` answers **402 Payment Required, `x-vercel-error: DEPLOYMENT_DISABLED`**. The Vercel project reports `live: false`.
  - Every deployment since 2026-11-21 shows "Account is blocked".
  - No production function has logged anything for about a day.
- **Friends** call `/api/friends` and fail.
- **Plans:**
  - The entitlement check calls `/api/purchases/entitlements`.
  - Purchase checks call `/api/purchases/config`.
  - Purchase verification calls `/api/purchases/verify`.
  - All three fail.
- **Balances across devices:** when the entitlement check fails, cloud sync treats the cloud as unreachable. Each device then keeps showing its own device copy, and preferences stop syncing (the last row update in production was 2026-11-20). A second device therefore shows a different balance from the first.
- Checked and ruled out with production metadata (counts only, no personal data):
  - cross-currency rows (none);
  - truncated cloud reads (every read is paginated to the end);
  - postings that double-count a transaction (postings come only from loan and receivable events);
  - card-to-bank links pointing at missing accounts (every cloud debit card has a valid link);
  - preference-row size limits (largest row is about 42 KB of 256 KB);
  - balance code differing between the deployed web build (#327) and main (no balance logic changed).

**Owner action required:** restore the Vercel account (billing or plan) for team "Nasrin AI inc", then redeploy `main`. No code change can bring `/api` back while the account is disabled.

## Changes

- **Plans on phones** (`src/components/PlanOffer.js`):
  - When the App Store or Google Play returns no MOVO subscriptions, or the query fails, the panel now says why and offers **Try again**. Before, it showed a silently disabled button.
  - Empty and failed results get different messages. The empty message points testers to installing from the store or testing link, since sideloaded builds receive no products.
  - The two strings are translated into 11 languages (`src/i18n/catalog/ui-2026-11-22-store-issue.js`).
- **Foldables, tabletop posture** (`src/App.css`): with a horizontal hinge (`vertical-viewport-segments: 2`), sheets and toasts sit on the lower half and content stays on the upper half. The side-by-side hinge layout already existed.
- **Aries horns** (`src/lib/ariesArt.js`):
  - The flat grey spirals are replaced by a procedurally generated ram curl: a tapering spiral tube with 15 growth ridges, a warm ivory-to-taupe gradient, an edge highlight and an inner-edge shadow.
  - Roots are tucked under the wool. The geometry is computed once and mirrored for the right horn, and the CSS hooks are unchanged.

## Platform status (no change needed)

- **Android:**
  - `compileSdk`/`targetSdk` 36 (Android 16) for the phone and Wear OS modules.
  - Fold and unfold are handled without restarting the activity (`configChanges` includes `screenSize|smallestScreenSize|screenLayout|density`), and there is no orientation lock.
- **iOS:** the deployment target is iOS 15, the iPhone family is set, and an Apple Watch target is included (watchOS 10).
  - iPad and multitasking support would need an iPad device family, all orientations and iPad screenshots in App Store Connect. That is an owner decision and is not changed here.
- **Smartwatch:** both watch apps offer Quick Log to the phone and keep no financial data on the watch.

## Tests

- `src/components/PlanOffer.test.js`: empty store → Try again with explanation, and retry queries the store again; failed store → explanation.
- `src/lib/ariesHorns.test.js`: horns render with finite coordinates and ridges in every state, mirrored right horn; the tabletop CSS keeps sheets off the hinge.
- Full suite, `tsc --noEmit` and the strict build: see the PR.

## Data, security, rollback

- No schema, RLS, API or preference changes. Revert the commit to roll back.
