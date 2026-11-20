# Owner preference isolation — 2026-11-20

The November 20 audit identified a P0: a shared device could merge the previous account's subscriptions, archives, budgets, membership records and other financial preferences into a newly signed-in account. Encryption does not establish who owns those records.

## Change

`src/lib/ownerPreferences.js` stores versioned snapshots under distinct guest and owner keys, with a matching owner field. Only allowlisted appearance, language and setup acknowledgements can cross scopes. Financial lists, profile details, device keys and custom artwork cannot. The old `movo.preferences.v3` compatibility key contains only those safe fields.

Unassigned legacy preferences and artwork are copied byte-for-byte to recovery storage before the compatibility key is rewritten. Conflicting legacy copies are retained separately. Migration fails closed if recovery cannot be verified. This retains existing plaintext data; it adds ownership boundaries, not new encryption claims. The guest view reports retained records and links to support; recovery is not silently attached to any account or included in another owner's cloud upload.

`src/App.js` switches scopes before releasing the new account's view. State callbacks and cloud timers retain the owner and session generation that created them. Logout restores guest preferences; corrupt snapshots remain untouched and block preference merge/upload. Deletion prevents persistence from resurrecting cleared snapshots. Account changes close old forms and discard transient draft views. A file import or image decode completed after a switch cannot enter the new account. Failed artwork storage cannot leave the previous owner's artwork in the runtime view.

Native automation credentials remain protected by their existing vault. A cached key is activated only after the server registration endpoint verifies it against the captured account JWT; another owner's key is rejected. No credential is copied into native Preferences or cloud preference rows.

## Validation and limitations

Tests cover guest/A/B/restart separation, recovery preservation, stale legacy writers, quota failure, corrupt snapshots, delayed cloud responses, stale UI setters, native-key verification and delayed artwork decoding. Existing UI/offline fixtures now explicitly seed their owner/guest scope rather than relying on the unsafe legacy key. The native secure-storage contract still verifies sanitization.

Initial full validation passed 253 suites / 1,643 tests before the final native-key test. Final exact-head tests, typecheck, serial production build and hosted checks are recorded in the PR. Parallel builds were killed by the execution host (SIGKILL); they are not successful validation. No production database schema, providers or server grants change here. Signed-device, store lifecycle and broader Friends acceptance require separate evidence.

## Rollout and rollback

Deploy the scope-aware client only after checks pass. An old client sees safe appearance/setup fields and cannot recover scoped financial lists automatically. Prefer roll-forward recovery; never put owner financial data back into the shared key. Keep recovery snapshots until an explicit owner-reviewed recovery or deletion. Do not clear a device carrying unsynced records to complete acceptance. A browser/device reset can still remove local data and keys.

The disposable Android R8 fixture now writes an explicit guest preference envelope before first launch, plus a safe compatibility key. Its card, artwork and callback assertions remain unchanged. This prevents acceptance tests from relying on the very anonymous preference ownership assumption being removed. Fresh Android release/emulator CI must compile and exercise this fixture.
