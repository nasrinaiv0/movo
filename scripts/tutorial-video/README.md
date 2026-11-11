# MOVO video guide (public/tutorial/movo-guide.mp4)

The first-run video guide is a recording of the real MOVO build. It uses **invented sample records** for a fictional
person ("ana@example.com"); no real customer or financial data is used. The narration is in the owner's "MOVO" voice
in the owner's ElevenLabs workspace.

## Chapters (must match `CHAPTERS` in `src/components/TutorialVideo.js`)

| Start (s) | Screen recorded | Narration |
|---|---|---|
| 0 | Home dashboard | Welcome to MOVO. Your money, in one calm place. |
| 5.9 | Wallet: accounts and cards | Add your banks, cards, e-wallets and cash. You enter the balances. MOVO never connects to your bank. |
| 15.3 | NasrinAI chat: "Grab 250" logged on the device | Log in seconds. Type "Grab 250" to NasrinAI, or tap plus. |
| 23.8 | Transactions | Transactions and Money Flow show where every peso goes. |
| 29.6 | Subscriptions | Plan ahead with budgets, goals and subscription reminders. |
| 35.5 | Settings → Delete Account | Your data stays yours. Export it, or delete your account, any time in Settings. |
| 43.2 | Add account (bank logos), then Terms §16–17 | Bank and brand logos only help you recognise your accounts. MOVO is not affiliated with them, and never moves your money. |
| 52.6 | Free month offer, then the setup agreement | Your first month of Pro is free. Last step: review and accept the Terms of Service and Privacy Policy. |

## Re-recording

1. Build against the local stand-in cloud:
   `REACT_APP_SUPABASE_URL=http://localhost:3312 REACT_APP_SUPABASE_ANON_KEY=mock-anon-key CI=true BUILD_PATH=/tmp/build-e2e npx react-scripts build`
2. `node scripts/tutorial-video/mockcloud.cjs /tmp/build-e2e 3312` (test-only server; holds no real data).
3. `node scripts/tutorial-video/record.cjs` writes one 30 fps segment per chapter part to `segments/`.
4. Narration: one ElevenLabs clip per chapter (text above), saved as `audio/1.mp3` … `audio/8.mp3`.
5. Join the segments with 0.4 s crossfades at the chapter starts, place clip *n* at chapter start + 0.6 s,
   loudness-normalise to −16 LUFS, H.264 CRF 27 / AAC 96 kb/s mono, `+faststart`, poster frame at 1.2 s.

Bank, e-wallet and merchant logos in the recording are the curated Google S2 favicons the app already shows; the
video and the setup agreement both state that logos only identify records and imply no partnership.
