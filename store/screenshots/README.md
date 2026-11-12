# MOVO store screenshots

Eight feature screenshots for each store, made from the **real MOVO build**. Every phone screen and every enlarged
element is a capture of the running app; nothing in the interface is drawn or retouched. The device frames, status
bars and icons are drawn for this set (not Apple or Google device art).

`preview.png` shows the whole gallery. It is a reference only: do not upload it.

## Upload

| Store | Folder | Size | Upload slot |
|---|---|---|---|
| App Store Connect | `ios/` | 1320 × 2868 px | iPhone 6.9" display (App Store Connect scales it for smaller iPhones) |
| Google Play Console | `android/` | 1440 × 2560 px (9:16) | Phone screenshots |

All files are 24-bit RGB PNG with no alpha channel and no embedded metadata, each under 3 MB. Upload them in
file-name order: the first three appear in search results, so they carry the core story (overview, wallet, quick log).

## The eight screens

| # | Screen captured | Headline | Supporting line |
|---|---|---|---|
| 1 | Home + Money Flow | Your money, in one calm place. | Balances, budgets and bills, together in one private home for your money. |
| 2 | Wallet + card faces | Every account. One wallet. | Banks, cards, e‑wallets and cash side by side. You add them, MOVO keeps count. |
| 3 | NasrinAI chat logging "Coffee 180" | Type "Coffee 180". It's logged. | Write it the way you'd say it. MOVO reads it on your phone and files it in a second. |
| 4 | Transactions + Spending This Month | See where every peso goes. | Money Flow and spending breakdowns turn everyday records into a clear picture. |
| 5 | Budgets & Plans + savings goals | Stay on budget. Reach your goals. | Monthly limits per category and savings goals that show exactly what's left. |
| 6 | Subscriptions calendar + Upcoming Renewals | Never miss a renewal. | Every subscription on one calendar: what it costs, what it adds up to, and what's due next. |
| 7 | Home in light and dark | Light or dark. Always yours. | Liquid Glass themes, accent colours and card styles that look the way you like. |
| 8 | Settings | Your records. Not your bank login. | MOVO never connects to your bank. Lock the app, export your data or delete it any time. |

Every claim matches what the app does today: chat logging ("Grab 250"-style lines) is parsed on the device, MOVO has
no bank connection, and App Lock, Import & Export and Delete Account are in Settings. Keep it that way when editing.

## Store-safe content

- The records belong to an invented person ("Ana Reyes"); no real customer or financial data is used.
- No third-party trademarks: accounts, merchants and subscriptions use generic names ("Payroll Account", "Music Plus"),
  so cards show the MOVO face and no bank, card-network or merchant logo appears. App Review (guideline 5.2.1) and
  Google Play's impersonation/IP policy often reject screenshots with other companies' marks.
- Balances are presented as records the person entered, never as bank-verified.

## Regenerating

The generator lives in `scripts/store-screenshots/` and reuses the video guide's local mock cloud.

```sh
REACT_APP_SUPABASE_URL=http://localhost:3312 REACT_APP_SUPABASE_ANON_KEY=mock-anon-key CI=true BUILD_PATH=/tmp/build-e2e npx react-scripts build
node scripts/tutorial-video/mockcloud.cjs /tmp/build-e2e 3312 &        # test-only server; holds no real data
for p in ios android; do PLATFORM=$p node scripts/store-screenshots/capture.cjs && PLATFORM=$p node scripts/store-screenshots/extras.cjs; done
node scripts/store-screenshots/compose.cjs ios && node scripts/store-screenshots/compose.cjs android
python3 scripts/store-screenshots/finalize.py
```

- `seed.cjs`: the invented records, preferences, budgets and card finishes.
- `capture.cjs` / `extras.cjs`: drive the real build in Chromium at 3× with phone safe areas (iPhone 430 × 932 pt,
  Android 412 × 915 dp) and save full screens plus element crops to a scratch folder (`STORE_SHOTS_WORK`).
- `compose.cjs`: lays out each slide (copy, colours, device frames, lifted elements) and renders it at the store size.
  `node compose.cjs ios 3` re-renders a single slide.
- `finalize.py`: re-saves the PNGs as RGB without alpha or metadata.

If the app's layout changes, re-run the whole pipeline; the Coffee card position used for the slide 3 zoom is
recorded as `COFFEE` in `compose.cjs`.
