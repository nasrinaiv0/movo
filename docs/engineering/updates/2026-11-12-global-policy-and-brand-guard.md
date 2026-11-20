# MOVO compliance and logo safeguards (PR 274)

## 2026-11-12 — PR #274: verified mailing address, Google Play declarations and fail-closed logos

Published developer-supplied privacy correspondence address in web/in-app legal pages and external deletion page; explicitly did not invent the legal controller's business registration. Blocked all unreviewed Google favicon, direct site favicon and payment network external requests with generic local fallback; added tests that default and legacy owner approval do not authorize artwork. Added Google Play financial features, Data Safety and regional merchant/availability review checklists. Complete native finance encryption/migration, legal counsel approvals and Google Play Console submissions remain pending. No production data, store settings, billing or migrations modified.

Sources: Google Financial features https://support.google.com/googleplay/android-developer/answer/13849271 ; Google Data safety https://support.google.com/googleplay/android-developer/answer/10787469 ; country requirements https://support.google.com/googleplay/android-developer/answer/6223646 ; official Play user locations https://support.google.com/googleplay/android-developer/answer/10532353 .
Release still NO-GO: Vercel Sandbox creation returns 402 payment_required. Cross-device encryption, migrations, commercial authorization, and legal review remain incomplete.
