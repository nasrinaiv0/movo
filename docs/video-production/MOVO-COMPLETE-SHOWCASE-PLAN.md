# MOVO Complete Product Showcase — Video Production Plan

## Purpose

Produce a polished, end-to-end MOVO product walkthrough that demonstrates the real app, its major pages, visible controls, and working automations. The video should help a new user understand what MOVO does and how to use it—not merely show a sequence of attractive screens.

**Primary deliverable:** one comprehensive product showcase, target runtime **7–8 minutes** (approximately 7:10 before pacing and transitions).
**Optional cut-downs:** a 2-minute promotional edit and a 12–15-minute tutorial assembled from the same verified footage.

## Creative direction

- Premium, modern, approachable fintech product film.
- Use real MOVO screens and real interactions captured from the current application. Do not fabricate UI, balances, transaction results, integrations, or feature availability.
- Keep transitions quick but allow enough screen time to read important values and understand each action.
- Use the user's own natural voice as the narration identity. The user must supply or explicitly select an authorized clean voice recording/sample for voice cloning or voice conversion. Do not assume access to a voice profile or synthesize from unrelated recordings. If no approved sample/tool is available, prepare narration for the user to record and sync it; do not silently substitute another voice.
- Preserve the speaker's natural accent, cadence, warmth, and conversational delivery. Avoid an exaggerated announcer style.
- Music should sit quietly under narration and duck during explanations. Use properly licensed/original music and sound effects.
- Add accurate captions and readable on-screen labels.

## Runtime and scene plan

| Timecode | Length | Scene and required demonstration |
|---|---:|---|
| 00:00–00:30 | 0:30 | **The problem / opening.** Show a person juggling expenses, cards, bills, and scattered transaction notes. Introduce MOVO as a place to bring money activity and planning together. |
| 00:30–01:10 | 0:40 | **Home dashboard.** Show the dashboard from a realistic signed-in test account. Explain total balance, spending overview, recent activity, and dashboard shortcuts that are actually present. Tap each relevant shortcut once. |
| 01:10–01:55 | 0:45 | **Wallet.** Demonstrate wallet categories and the user's supported bank accounts, e-wallets, cards, and cash. Open an account/card detail and point out the displayed balance and relevant account details. Show add/edit controls only if they are available and working. |
| 01:55–02:45 | 0:50 | **Transactions.** Demonstrate creating/logging a transaction, selecting a payment source, showing its available balance or limit where implemented, and viewing transaction history. Demonstrate edit and delete/revert behavior only with disposable test data and verify the resulting state. |
| 02:45–03:55 | 1:10 | **Financial planning.** Cover plans/goals, allocated funds, budgets or expense limits, savings, debts/owed amounts, and how a plan can be associated with a bank, wallet, or cash source. Expand/collapse detail sections and show the relevant controls. Do not imply unsupported automatic transfers. |
| 03:55–04:35 | 0:40 | **Credit cards.** Show card limit, amount spent, amount after interest (when configured), spent/limit, outstanding balance, and payment recording. Explain that balances should reflect recorded credit and payment activity. Verify the figures in the test account before capture. |
| 04:35–05:20 | 0:45 | **Bills and subscriptions.** Show adding/viewing a bill or subscription, due date/billing cycle, and the effect of recording a payment. If demonstrating deletion/reversal, prove the billing cycle returns to its prior state. Use test records only. |
| 05:20–05:55 | 0:35 | **MOVO AI chat.** Demonstrate a realistic financial question and the actual response. Avoid exposing private financial data or claiming the AI performs actions it does not perform. |
| 05:55–06:55 | 1:00 | **Automations.** Show supported transaction capture flows, such as Apple Pay / Apple Wallet via the configured iOS Shortcut, bank or e-wallet notification logging, and Siri voice logging. Show the actual setup and a successful test event where possible. Explain any device, permission, shortcut, or supported-bank limitations. Do not imply universal direct bank connectivity or Android support unless verified in the current build. |
| 06:55–07:30 | 0:35 | **Calendar, search, notifications, profile and settings.** Briefly show each available page/control and explain its practical purpose. Do not linger on settings that are not central to the product story. |
| 07:30–07:50 | 0:20 | **Closing.** Return to the dashboard, reinforce the core benefit, show MOVO branding and the verified product URL / call to action. |

Timing is a target, not a reason to rush. If a feature is not available in the current production build, omit it or label it clearly as a planned feature—never fake a demonstration.

## Narration and natural-voice workflow

1. Draft a conversational voiceover aligned to the scene plan. Write for natural spoken delivery, not marketing copy stuffed with claims.
2. Prepare a short voice-recording checklist for the user: quiet room, consistent microphone distance, no background music, natural speaking pace, and a clean recording in a supported format.
3. Ask the user to provide/approve the voice sample and explicitly authorize its use for this MOVO video. Use only the user's own voice sample and an authorized voice tool/provider.
4. If the selected tool supports voice cloning, test a 10–15 second sample first. Have the user approve pronunciation, accent, pacing, and likeness before generating the full narration.
5. Pronounce product names and terms consistently: “MOVO”, “Apple Pay”, “Siri”, “e-wallet”, “credit card”, and the user's preferred pronunciation of any brand or personal name.
6. Generate narration in scene-sized clips for easier retakes and precise sync. Keep a clean master narration track.
7. If voice cloning is unavailable or not approved, deliver the final script and recording guide for the user to record naturally. Do not use a generic synthetic replacement without approval.

## Required production assets

- Current MOVO app running in a stable test environment, with the latest relevant UI and features.
- A dedicated demo account populated only with fictional/test financial data.
- A shot list with screen, action, expected result, and narration for every scene.
- Screen recordings at the highest practical resolution and frame rate supported by the target device.
- User-approved voice sample or user-recorded narration.
- MOVO logo/brand assets from the repository.
- Licensed/original background music and subtle sound effects.
- Captions/subtitles, title cards, end card, and final export.

## Capture and editing requirements

- Record actual taps, menus, expand/collapse controls, forms, validation, and state changes. Include a close-up or crop when controls are too small to read.
- Use a consistent device frame/aspect ratio per deliverable. Produce a 16:9 master for website/YouTube; create vertical 9:16 and square crops only as separate edits, not by stretching the master.
- Keep cursor/tap indicators subtle and consistent. Avoid covering important values or buttons.
- Remove dead time, accidental taps, loading glitches, test notifications, and personally identifying information.
- Use fictional names, balances, account identifiers, and transaction descriptions. Never show real bank credentials, full card numbers, OTPs, private notifications, API keys, or personal financial records.
- Blur or replace sensitive data before footage leaves the local editing workflow.
- Show a successful end state after each important action so the viewer can see what changed.

## Feature verification / truthfulness gate

Before recording each scene, Claude must inspect the current main branch and relevant open PRs, then verify the feature in the running app. Maintain a checklist with:
- Feature and exact screen/control name
- Current implementation status (working / partial / unavailable)
- Test steps performed
- Expected and observed result
- Evidence/recording filename
- Narration claim approved or revised

Do not infer feature availability from this document or old screenshots. Check the current code and test build. If the UI or behavior differs from this plan, update the shot list and script to match the real product. Do not modify production financial data to stage a shot.

## QA and acceptance criteria

- Every feature shown exists and works in the tested build.
- All visible buttons in the selected showcase flow are demonstrated or intentionally excluded with a reason; the video is not expected to click every low-level control in the entire app if doing so would make the story unusably long.
- Every financial calculation and before/after state shown is checked against test data.
- Transaction deletion/reversal, subscription/bill cycle changes, and credit-card payment effects are verified before narration is locked.
- Automation footage proves a real successful test and accurately states prerequisites/limitations.
- Voice likeness is generated only from the user's explicitly approved sample and approved by the user.
- Captions match the final narration; no spelling errors or clipped text.
- No secrets, real personal financial information, or full payment credentials appear.
- Export is watched from beginning to end with audio, captions, and transitions checked.

## Suggested output package

1. `MOVO-Complete-Showcase-16x9.mp4` — 7–8 minute master.
2. `MOVO-2-Minute-Promo-16x9.mp4` — optional promotional cut.
3. `MOVO-Complete-Showcase-Captions.srt` — synchronized captions.
4. `MOVO-Voiceover-Script.md` — approved narration, separated by scene.
5. `MOVO-Shot-List-and-QA.md` — scene-by-scene capture evidence and verification checklist.
6. Project/edit timeline and licensed music/SFX attribution notes, where applicable.

## Instructions for Claude

Treat this PR as the production brief. First inspect the current MOVO main branch and open PRs; reconcile the feature list with the real implementation. Then prepare the detailed shot list and full narration script, identify the supported voice workflow, and capture the app in a test environment. Do not start final voice generation until the user has supplied/approved their voice sample and approved a short voice test. Do not merge unrelated application changes as part of this video task. Keep the production plan, script, and assets organized in a dedicated video-production directory.
