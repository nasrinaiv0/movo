# 2026-11-16 — Profile page: clearer overview and consistent rows

## Owner request
"Improve this page and make it more professional and user friendly." The owner's screenshot of Profile showed three tiles: Total Balance, Total Income, Total Expense.

## Problems found
- **Mislabelled totals:** "Total Income / Total Expense" were really the month chosen on Home, but the page did not say so.
- **Meaningless trend:** the Balance tile showed "↑ 999+%" against an almost empty last month, while the other tiles had no trend. This made the tile heights uneven.
- **Icons:** Settings and other rows had bare icons and no descriptions, unlike Menu.
- **Local Storage:** its note was a long paragraph.

## Changes (`screens/Profile.js`, `App.css` last block "Profile page")
- **Overview card,** replacing the three tiles:
  - a heading with the month in words, for example "November 2026";
  - the total balance in large type;
  - that month's income and expenses side by side;
  - a trend only when it is meaningful (under 999%).
- **Tinted icon tiles** on every row, in the Menu's colour language. Accounts: bank blue, card purple, e-wallet teal. Settings: grey, red, blue, purple. Sync and export: blue and green. Sign out of other devices: orange. Log out: red.
- **Row descriptions** for Settings rows:

  | Row | Description |
  |---|---|
  | Financial Settings | All MOVO settings |
  | Notifications | Alerts and reminders |
  | Security & Privacy | App lock and your data |
  | Preferences | Theme, text and layout |

- **Local Storage:** "Kept in this browser. Not synced or encrypted by MOVO." The disclosure keeps the same meaning; the App test checks it.
- **Translations:** five new strings in all 11 languages.

## Validation
- Full Profile screenshots before and after, dark and light, with sample data. No console errors.
- App test updated: disclosure wording, overview month, row descriptions. Jest full suite, `tsc`, strict build.
- Not done: no device check.

## Rollback
Revert the commit.
