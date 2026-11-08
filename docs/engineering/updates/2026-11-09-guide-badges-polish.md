# Video guide, plan badges, automatic free month and UI polish (2026-11-09)

Owner request: every first-time user gets a 1-month free trial; Bronze/Silver/Gold/Platinum badges with Gold for Pro
and Platinum for Pro+ regardless of days; a full first-run guide with a video and the walkthrough after it; less
text, compact consistent UI; bring back "Add card" under Wallet → All.

- **Video guide** (`src/components/TutorialVideo.js`): six animated scenes built from MOVO's own UI pieces (no
  download, works offline, translated). Progress bar, tap right/left, pause, Skip. Skip or the last scene opens the
  spotlight walkthrough; the plans sheet follows. Replay: Settings → Video guide. Reduced motion: still scenes that do
  not advance by themselves. Tests: `TutorialVideo.test.js`.
- **Free month for every first-time account** (`src/App.js`): after the plans sheet has been seen, an eligible
  signed-in account that did not claim it gets it started automatically (`POST /api/purchases/trial`, no code).
  Eligibility stays server-side (`claim_movo_trial`: verified, never trialled, no store purchase); a refusal is
  retried on a later launch only. Signed-out people are told to sign in.
- **Plan badges** (`src/lib/streak.js` `badgeEarned`, `src/screens/Menu.js`): Pro unlocks Bronze–Gold, Pro+ adds
  Platinum; badges unlocked by plan show "Pro"/"Pro+" instead of a day count; the next-badge goal skips them.
- **Plans sheet** (`src/components/PlanOffer.js`): shorter copy, all strings translated, solid plan cards, optional
  referral field behind "Have a referral code?"; keeps #245's local-mode screen.
- **Wallet**: "Add Card" is back in All → Quick actions and on the empty Cards view; type tiles read Banks / Cash.
- **Less text**: shorter Menu tile subtitles.
- 71 new strings in all 11 languages (`src/i18n/catalog/zz-guide-plans-20261109.js`).
- Legal: the Terms and Privacy pages do not describe the trial today; no wording changed here.
