# Provider and privacy evidence preparation — 2026-11-28

Candidate b633fd26 (pre-continuation). Public terms are evidence of published conditions, not proof of MOVO's entitlement. All 18 release reviews remain pending.

| Provider / item | Preliminary finding | Required evidence |
|---|---|---|
| Twelve Data | Commercial external display depends on tier/exchange rights; redistribution may require separate agreement. | Signed entitlement, exchange rights, caching and display scope. HOLD. |
| CoinBeacon | Public API terms search excerpt permits commercial projects with attribution; original data sources also matter. Full terms fetch unavailable. | Retrieve full terms, record plan and source-by-source conditions, attribution, caching and redistribution. HOLD. |
| Binance public market fallback | Public dataset terms exclude commercial usage absent written agreement; they do not necessarily govern the actual REST endpoint. | Obtain endpoint-specific commercial permission. HOLD. |
| Frankfurter | Software MIT; source data terms separate. | Confirm v1 endpoint data sources and attribution/redistribution. |
| ExchangeRate-API | Keyless conversion permitted commercially with attribution and no redistribution. | Verify visible attribution, cache rules, no programmatic onward redistribution. |
| MOVO artwork, logos, fonts | iOS original-only packaging mitigates risk, not legal clearance. | Actual Android/iOS inventory, rights chain, name clearance, signed notices. |

Sources: https://twelvedata.com/terms ; https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage ; https://coinbeacon.io/terms/api ; https://github.com/binance/binance-public-data/blob/master/TERMS_AND_CONDITIONS.md ; https://frankfurter.dev/license/ ; https://www.exchangerate-api.com/terms ; https://www.exchangerate-api.com/docs/free .

Privacy/data-safety source map (verify final binaries, network traffic and all processor contracts before console entry):

| Data | Source/recipient | Control to verify |
|---|---|---|
| Identity and account IDs | Supabase auth; Friends identities | Owner authorization and account erasure |
| Financial records | device/optional Supabase; opted-in AI context | Consent, minimal scope, retention, encryption, export |
| Friends text/cards/photos | accepted connection; private DB | Block/report, card projection, revocation, erasure |
| AI prompts/replies, receipt/audio | NasrinAI/OpenRouter/provider on optional requests | Explicit consent and provider retention/transfer |
| AI safety reports (candidate, disabled) | report UUID, reason, verified actor and message reference; MOVO only | No prompt/context duplication, ownership, abuse limits, account/message deletion |
| Purchases/referrals/integrity | Apple/Google and MOVO verification | Account binding, lawful retention, refund/revoke |
| Technical diagnostics | Hosting/service providers | No sensitive content, identify SDKs and purpose |

Apple UGC, third-party AI consent and Google AI flagging source: https://developer.apple.com/app-store/review/guidelines/ ; https://support.google.com/googleplay/android-developer/answer/13985936 . No assertion of operational compliance. No provider contract or console access. Independent reviewer must verify full current terms and actual licensed account. No release flag changes.
