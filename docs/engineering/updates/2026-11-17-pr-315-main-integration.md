# 2026-11-17 — PR #315 brought up to date with main after #314

## Why
The owner asked to merge all finished PRs. #314 ("dedicated Friends and Summary pages with section sharing") was merged first. Both #314 and this PR had reworked the friend summary screens, so this PR keeps #314's version.

## Resolution
- `components/FriendFinanceSummary.js`, its test, `components/FriendsSheet.js` and `api/lib/friendSocial.js` follow `main` (#314). Its seven-section sharing replaces this PR's single snapshot and `savingsRate` field, so the obsolete `savingsRate` API test is removed. The database is unchanged.
- This PR's separate friend page (`screens/FriendProfile.js` and its test, the `FriendProfile` view and `onOpenFriend`) is removed. Friends now opens #314's Friends page, and a connection opens its Summary page.
- In `App.css`, #314's Friends and Summary styles are kept, and this PR's unused friend summary and friend page blocks are dropped. The chat chart rules for narrow phones are kept.
- Menu keeps this PR's tool icons and adds #314's Friends tile in the same icon style.
- Translations were regenerated with `npm run i18n`.

## Validation
- Jest: 243 suites, 1,512 tests.
- `tsc --noEmit`, the strict build and the docs check pass.
