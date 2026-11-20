# MOVO Google Play territory and privacy declarations

## 2026-11-12 — Country-specific Play compliance worksheet and port-free finance CI

Google Play jurisdiction-specific release matrix added for 25 initial jurisdictions, explicitly BLOCKED pending console territory eligibility, local legal review, merchant verification and consumer/security evidence; this is not 176-country legal clearance. Added structured Play Financial features and Data safety declaration worksheet, using MOVO features and avoiding unsupported claims. Finance test CI uses docker exec into its disposable PostgreSQL service; removed unneeded host port 55432 mapping after a concurrent CI runner job failed binding an already-in-use port. Test logic and database data unchanged.

Official evidence: https://support.google.com/googleplay/android-developer/answer/6223646 ; https://support.google.com/googleplay/android-developer/answer/13849271 ; https://support.google.com/googleplay/android-developer/answer/10787469 .
