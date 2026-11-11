# MOVO privacy-safe bank icon fallback regression

## 2026-11-12 — PR 274: finance card name fallback and legacy logo test coverage

Exact-head CI exposed six test suites still asserting remote unreviewed favicons and a functional regression: the MOVO-face fallback masked bank names in Wallet filters. Keep the local MOVO artwork while showing the underlying account/institution label in the fallback subtitle, without changing card balances, visibility settings, or color themes. Update UI and logo tests to assert offline icons, no unreviewed network fetch, visible institution labels, and unchanged finance metrics. Re-run the complete CI suite on this new commit before merge.
