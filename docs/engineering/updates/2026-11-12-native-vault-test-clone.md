# Native encrypted vault test fixture

## 2026-11-12 — Repair native finance encrypted vault test fixture

Jest jsdom omits structuredClone needed by fake-indexeddb for JSON-only encrypted envelopes. The new test fixture adds a narrowly scoped structuredClone polyfill without modifying production code or cipher behavior. Exact-head CI must pass; this does not activate the native encrypted vault as the authoritative finance store.
