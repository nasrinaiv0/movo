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

## Follow-up: centered, with spent and logged times
Request: "place this at the center and add time for logging and time when it was expensed".
- The sheet uses `center` (a centered pop-up). The name (`.tx-detail-name`), amount and type chip are centered, and the date subtitle is gone.
- The details card adds two rows:
  - **Spent**, **Received** or **Transferred** (by type): the transaction's `occurred_at`;
  - **Logged**: `created_at`, shown only when it exists.
- New records saved on the device or offline now carry `created_at` (now). This is safe because the cloud upload adapters build explicit payloads and `offlineReconciliation` treats `created_at` as ephemeral. Older local records without it show only Spent.
- "Transferred" is translated into 11 languages; Spent, Received and Logged already were.

## Validation
- Jest (full suite) and the strict build pass. The existing App test still finds the sheet by its "Transaction details" label.
- Browser (Playwright, 430px, production build against the local mock cloud): the computed sheet background is opaque (`rgb(255,255,255)` light, `rgb(28,28,30)` dark) with no backdrop filter. Screenshots were reviewed in light and dark.
- Not run: real devices.

## Rollback
Revert the commit.

## Follow-up: middle of the screen, no outline (owner, 2026-11-12)

Owner: "center meaning center of the screen / and less border especially for dark mode".

- **Position:** the backdrop centres the pop-up in both directions. Its top and bottom padding are equal: `max(16px, safe-area top, safe-area bottom)`. So on an iPhone (top inset about 59px, bottom about 34px) the pop-up is still at the exact middle, not shifted down.
- **Border:** `border: 0`, no outline, and no inner top highlight on `.sheet.sheet-center.tx-detail-sheet`. The glass edge and the 0.5px highlight had read as a bright frame in dark mode. Instead, a soft shadow sets the pop-up apart (deeper in dark).
- **Dividers:** in dark mode the lines between Account, Category, Spent and Logged are removed, and 10px row spacing separates them. In light mode they are fainter (6% ink).

Measured with Playwright (CSS px; gaps measured from the viewport edges):

| Viewport | Theme | Top gap | Bottom gap | Border |
| --- | --- | --- | --- | --- |
| 430×932 | light | 281 | 281 | 0 |
| 430×932 | dark | 287 | 287 | 0 |
| 390×844 | light / dark | 237 / 243 | 237 / 243 | 0 |
| 375×667 | light / dark | 149 / 154 | 149 / 154 | 0 |

Not run: real iPhone or Android devices.
