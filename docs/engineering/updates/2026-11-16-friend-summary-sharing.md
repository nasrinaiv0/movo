# 2026-11-16 — Friend money summary sharing: clearer screen, live preview, savings rate

## Owner request
"Improve the UI/UX and functionality of Friend Finance Summary sharing."

## What changed
- **Friends list:** each friend row is one large target, "Name · Money summary ›", in place of a small unlabelled document icon. The remove button is unchanged.
- **Summary screen** (`components/FriendFinanceSummary.js`):
  - Header with a back button, the friend's initial and name.
  - **Shared with you:** a card with the month in words (for example "November 2026", not "2026-11") and the date it was shared. It shows exact totals with net (negative in red), the savings rate, colour bars per category matching the app's category colours, and the note.
  - Plain empty, loading and error states, with Try again.
  - **Your summary for {name}:** a status chip (Sharing / Not shared) and a month picker in words. Three switches choose what to include:
    - Spending by category: percentages only.
    - Savings rate: new.
    - Income and expense totals: marked "Shows exact amounts".
  - A switch is turned off, with the reason shown, when the month has no spending or no income.
  - The optional note has an example and a character count.
  - **Live preview:** "What {name} will see" replaces the separate Preview and Approve steps. The single button names the friend: "Share with Mika", or "Update summary for Mika" when already sharing.
  - **Stop sharing** now asks for confirmation.
  - Report and Block are quieter text buttons at the bottom; Block is red.
- **Savings rate:** the share of that month's income that was kept, as a whole percent from −100 to 100. It is less revealing than exact totals. `api/lib/friendSocial.js` accepts it only as an integer in that range. Category percentages are still the only category data sent; amounts never leave the device unless totals are switched on.
- Privacy defaults are unchanged: every switch starts off and nothing is sent until the share button is tapped.

## Data and security
- No schema, RLS, grant or function change. Snapshots are still stored by `movo_friend_social` as the 4,000-byte owner-written JSON it already accepts.
- The new field passes the existing server allowlist. Unknown fields are still dropped (existing test).
- This screen still depends on production having migration `20261116070316_movo_friend_discovery_summaries_avatars`, which was **not yet applied** when this was written (see the Friends root cause in the session notes). Until it is applied, the summary screen shows "Friends is being updated. Try again shortly."

## Validation
- Jest: new `FriendFinanceSummary.test.js` and a savings-rate API test, plus the existing Friends suites.
- Full suite, `tsc`, and strict build.
- Browser check of the built app with the Friends API answered locally (sample data), light at 430 px and dark at 375 px:
  - list row, received card, switches, live preview, share then update, Stop sharing;
  - no horizontal overflow and no console errors.
- Not done: no test against the production API (blocked by the unapplied migration) and no device test.

## Rollback
Revert the PR. Snapshots that include `savingsRate` remain readable by older clients, which ignore the field.
