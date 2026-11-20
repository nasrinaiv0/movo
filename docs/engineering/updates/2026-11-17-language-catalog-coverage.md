# Language catalog coverage

MOVO registers 97 language options. English and 11 translated catalogs currently cover all 3,221 tracked messages. Cebuano now covers 146 messages, up from 20 under the same coverage check. The 85 limited catalogs need another 272,398 locale-message entries for full coverage of those tracked messages. Hard-coded text on surfaces such as the existing exchange-rate and crypto screens also needs a localization pass.

## Updating translations

1. Run `node scripts/i18n-build.js --coverage` to get the current count for each locale.
2. Run `node scripts/i18n-build.js --missing <language-code>` to export the missing keys. Use `src/i18n/languages.json` for the exact locale and regional variety.
3. Add the translated values under `messages` in `src/i18n/extra/<language-code>.json`. Keep keys and named placeholders unchanged. Add a key to `unchanged` only when its original value is appropriate in the target locale.
4. Run `npm run i18n` and the i18n test suite. Review account balances, transaction types, destructive actions, subscription terms and right-to-left layouts in the affected languages.

The build rejects unknown keys, empty translations and changed placeholders. The language picker removes its Limited translation label only when the locale covers the current tracked catalog. The client downloads its supplemental messages from the same application bundle and can reuse the last saved locale dictionary offline.

## Verification and rollback

- `scripts/i18n-build.js`, `src/lib/i18n.js` and `src/lib/i18n.test.js` cover validation, loading, fallback, cache and locale formatting. The Cebuano dictionary is in `src/i18n/extra/ceb.json`.
- Localization uses static interface strings. There are no API, permissions, financial data or legal document changes.
- Revert the implementation commit to restore the previous Cebuano preview. Follow-up catalog updates should include placeholder validation and mobile render verification before release.
