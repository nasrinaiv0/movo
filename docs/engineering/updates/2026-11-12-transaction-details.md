# 2026-11-12 — Transaction details: solid, compact and organized

## Request
The transaction details sheet should be solid (not transparent), more compact and organized. In the owner's screenshot the glass sheet let the transaction list show through, and five plain rows repeated the date.

## Change
- `src/App.js` (`detailTx` sheet, class `tx-detail-sheet`):
  - **Header (unchanged):** the description as the title and the date and time as the subtitle.
  - **Amount:** large and signed by type (− for expenses, + for income, shown in green), with the base-currency equivalent when the currency differs, and a Type chip.
  - **One grouped card:** Account, then Category (with subcategory). Note, Reference ID, Payment reference and Receipt note appear only when present. Long text wraps on its own line.
  - **Removed:** the "Date & time" row, which repeated the subtitle.
  - **View receipt:** a full-width row with a receipt icon and a chevron. Its behaviour is unchanged (signed URL or local file).
  - **Edit and Delete:** behaviour unchanged, including Reverse for allocation events and no actions for accounting events.
- `src/App.css`, block "Transaction details sheet":
  - a solid `--card-solid` background with backdrop blur and glass layers off;
  - compact rows (11px padding) on a `--field` card;
  - 48px action buttons;
  - Edit gets a calm `--field` background in dark mode (the shared dark secondary button was bright white).

## Validation
- Jest (full suite) and the strict build pass. The existing App test still finds the sheet by its "Transaction details" label.
- Browser (Playwright, 430px, production build against the local mock cloud): the computed sheet background is opaque (`rgb(255,255,255)` light, `rgb(28,28,30)` dark) with no backdrop filter. Screenshots were reviewed in light and dark.
- Not run: real devices.

## Rollback
Revert the commit.
