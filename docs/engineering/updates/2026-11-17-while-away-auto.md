# 2026-11-17 — "Auto" in While you were away

## Why
The owner asked for an "Auto" view in "While you were away" covering Siri, Apple Pay and bank notifications.

## Change
- **New filter.** An **Auto** filter now comes right after **All**. It gathers every record a phone automation logged: Siri voice entries, Apple Pay payments, bank alerts and notifications, Google Pay payments and the Android assistant. The Apple Pay and Google Pay filters stay, for narrowing down further. The old "Automatic" filter, which left out Apple Pay and Google Pay, is replaced.
- **Row tag.** Each automatically logged row shows a small **Auto** pill before its time and source, so typed-in records and automatic ones are easy to tell apart. Manual and imported records carry no tag.
- **Code.**
  - `isAuto(source)` in `RecentLogsSheet.js` decides what counts as automatic.
  - `TransactionRow` takes an optional `tag`.
  - The pill's styling is in a new block at the end of `App.css`.
- **Translations.** The existing "Auto" catalogue row is also used by Cashback's auto-track toggle, with the same meaning. It now has proper translations: تلقائي, 自动, 自動, 자동, ऑटो. The Latin-script languages keep "Auto".

## Validation
- `RecentLogsSheet.test.js` checks the following:
  - Siri, Apple Pay and bank-notification logs all count under Auto and are tagged.
  - A manual entry is not tagged.
  - The Auto filter shows exactly those rows.
- The filter order assertion was updated.
- Full Jest, `tsc` and the strict build pass.
