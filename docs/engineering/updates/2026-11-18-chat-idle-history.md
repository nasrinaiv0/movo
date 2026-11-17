# MOVO chat inactivity and history

MOVO starts a fresh chat after 10 minutes without interaction in the chat. Typing, tapping and scrolling restart the timer. Returning to the chat checks elapsed wall-clock time even when a backgrounded web view could not run timers. A reset preserves the draft on the current screen and allows pending replies, dictation, playback, and on-device financial actions to finish.

Use the clock icon in the chat header to reopen a saved conversation. Older chats and messages load in pages. The plus button starts a chat immediately. The first visit after this update starts fresh and keeps previously saved cloud conversations available through history.

## Data

- Cloud history uses the existing account-owned rows and row-level security. Both messages in a completed turn are inserted together. A provider failure creates no empty conversation.
- Completed on-device turns use MOVO's existing AES-GCM device key with account, thread and turn binding. Guest history stays separate from signed-in history. Chart replies keep their chart. Transaction-log history keeps the confirmation text and omits the transaction action controls. Audio and original attachments are never part of history.
- Clear All Data, account deletion and the device reset remove local history using the existing storage cleanup. An in-flight encryption operation cannot write it back after a reset in the same app instance. A failed device write shows an error and keeps the current conversation on screen.

## Verification

- The Node 26 regression suite passed 1,553 tests. Coverage includes the idle deadline, elapsed time on resume, cloud and device history, draft preservation, account isolation, encrypted storage and completed-turn writes.
- Chromium at 390 × 844 showed a new chat after 10 minutes, kept the typed draft, reopened both saved chats and recovered the selected conversation after switching tabs. The browser used actual WebCrypto and IndexedDB, with no production account data.
- Review the PR's web, database and native checks before release.
- Keep the existing database schema and deployment configuration. Revert the implementation commit to roll back the chat UI and timer. A rollback leaves previously saved rows intact.
