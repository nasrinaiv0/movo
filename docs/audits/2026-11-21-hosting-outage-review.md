# Browser acceptance with the host disabled

2026-11-21, #330. [Implementation](../engineering/updates/2026-11-21-hosting-resilience.md) · [Operator runbook](../MOVO_HOSTING_RESILIENCE.md).

The real generated production worker and original-only bundle were served by the optional Node transport behind an isolated loopback outage fixture. The fixture replaced all host responses with the selected HTTP status; the browser's service worker remained active. No production customer data, credentials, cloud writes or hosting settings were used. Chromium used a 390 × 844 viewport and reduced motion. Source/API tests are separate from these browser observations.

| Scenario | Observed result |
| --- | --- |
| First visit without a worker/cache, host returns 402 | Actual 402 remains; no imaginary installation |
| Healthy visit installs worker/cache, then host returns 402 | Cached app opens and shows the saved 100.25 cash account |
| Add expense while host returns 402 | Description, 12.34 keypad amount and selected synthetic account save locally; balance becomes 87.91 |
| Cold document reload with host still disabled | 87.91 and exactly one saved expense remain |
| API request during 402 | Actual 402 returned; cached HTML is not substituted |
| Host returns 503 | Cached app opens with the saved balance |
| Browser network fully offline | Cached app opens with the saved balance |
| Host returns 401 and 403 | Actual denials remain; cached app does not replace them |
| Return to healthy host | Balance stays 87.91 and the expense appears once |
| JavaScript page errors | None |

The normal recent-records sheet appears on reload and was dismissed through its Done control before navigating. No forced clicks, ownership bypass or weakened financial assertions were used.

[Inspected Wallet screenshot during HTTP 402](assets/2026-11-21-hosting-resilience/wallet-during-402.png) · [Machine-readable results and artifact hash](assets/2026-11-21-hosting-resilience/results.json).

This is responsive Chromium/PWA evidence. It does not prove Safari/iPhone installation and storage lifecycle, signed-device acceptance, public TLS/DNS, production provider availability, full reconciliation parity or Apple approval. The new worker must be installed while a host is available; a currently disabled host cannot distribute the update to a first-time visitor or an old uncached client. An independently deployed backend and integration acceptance remain necessary for complete online service.
