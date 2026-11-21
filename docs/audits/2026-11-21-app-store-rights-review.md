# App Store preparation: artifact and responsive-web evidence

2026-11-21. Supporting technical evidence for #330; the owner confirmed this is preparation for submission, with no existing rejection. [Submission packet](../app-store/APP_REVIEW_PACKET.md) · [Implementation and limitations](../engineering/updates/2026-11-21-app-store-rights-preparation.md).

The original-only build excludes unverified public artwork/tutorial packs and retains existing saved style IDs. A fictional guest bank account has a 100.25 opening balance and the old `wp-l01` selection. The wallet renders generated geometry and a generic MOVO mark without requesting the excluded wallpaper or logo files. The existing Terms screen opens local bundled license text in the existing sheet.

The captures use isolated Chromium at 390 × 844 with reduced motion and no user session. External requests are blocked; API calls return a synthetic unavailable response. Neither test nor screenshot reads production customer records. These are browser checks, not native Safari, signed-device, live-server, physical accessibility or App Store Connect acceptance.

| Check | Observed result |
| --- | --- |
| Old style ID opens Wallet with original illustration | Pass; 100.25 is preserved |
| Bundled/remote logo, legacy wallpaper and tutorial requests | None in these flows |
| Legacy video playback | None |
| Menu → Profile → Terms → Third-party notices | Pass; local bundled text visible |
| JavaScript page errors | None |
| Notice sheet at mobile viewport | 372px wide, 826px high inside 390 × 844 |
| Long notices scroll and keyboard dismissal | Reaches end without horizontal overflow; Escape closes the sheet |

Inspected captures:

- [Wallet with synthetic balance and preserved style selection](assets/2026-11-21-app-store-rights/wallet.png)
- [Bundled third-party notices in the existing sheet](assets/2026-11-21-app-store-rights/notices.png)
- [Machine-readable browser result](assets/2026-11-21-app-store-rights/results.json)

The artifact check passes independently of the rights review. The upload/submission checks remain held until actual name/rights/store-record/metadata evidence exists, plus signed-device/live-backend evidence before public submission. Another Finance app already uses MOVO; no name clearance is asserted. No Apple submission, store-record creation, production migration or deployment occurred.
