# Dynamic Favicon and Third-Party Brand Rights Audit Register

**Status: OPEN — NOT LEGALLY CLEARED FOR ALL CATALOG ENTRIES**  
**Last reviewed:** 2026-10-31  
**Scope:** Every entry in `src/lib/institutionFavicons.js` and `src/lib/subscriptionAppFavicons.js`, plus the Google S2 favicon endpoint.

## Important finding

The Google S2 endpoint can return a favicon, but that fact alone is not a license to reuse the underlying artwork. Google's published API terms say content accessible through APIs may be protected by intellectual-property rights and may only be used if licensed by the rights holder or otherwise permitted by law. Google's general API terms may or may not govern this undocumented endpoint in the exact same way; this audit does **not** assume that the S2 endpoint is a documented, commercially licensed API.

Therefore, **no provider-specific permission is inferred from the icon being publicly reachable**. The existing catalogs are domain mappings, not a record of permission. This register intentionally marks provider-by-provider rights clearance as pending until a reviewer records the official policy and evidence.

## Google endpoint review

| Item | Finding | Status / action |
|---|---|---|
| Endpoint | `https://www.google.com/s2/favicons?domain=…&sz=…` | Endpoint is used by code; actual terms applicable to this specific endpoint are not confirmed |
| General Google API Terms | Require compliance with law and third-party rights; API content can remain protected by IP rights; prohibit certain copying/storage/public display absent permission or legal basis | Reviewed at a high level; applicability to S2 endpoint must be confirmed |
| API documentation / commercial authorization | No specific official S2 endpoint documentation or express commercial-use license identified in this review | **OPEN** — do not represent as Google-approved or licensed |
| Caching | General API terms restrict storing/caching content beyond applicable cache headers where those terms apply | Do not persist returned image files unless rights and cache rules are verified |
| Privacy | A direct browser request may disclose IP address and request metadata to Google; exact collection depends on Google practices and client context | Privacy notice and network behavior must be checked |
| Fallback | Generic local icon plus readable service/institution name | Required |
| Brand association | Do not claim partnership, endorsement, official integration, or official logo status | Required |

Official Google source: https://developers.google.com/terms/  
Google Privacy Policy: https://policies.google.com/privacy

## Provider-by-provider audit policy

Each registry row must be reviewed against the **official** provider source, not a third-party summary. Review both:
1. The provider's current Terms of Use / Terms of Service that govern the product or service; and
2. The provider's official trademark, brand, logo, or press-resource guidelines, if published.

The Terms of Service do not necessarily grant logo rights. A brand guideline may permit limited referential use, require approved assets, prohibit app/UI uses, or require permission. If no clear rule is found, status remains **PENDING**; silence is not permission.

### Required fields for every catalog entry

- Exact display name and mapped domain
- Official provider terms URL and date checked
- Official brand/trademark policy URL and date checked
- Asset provenance: provider-supplied asset, site favicon fetched by Google, or local generic fallback
- Permitted context / restrictions / attribution requirements
- Whether the policy clearly allows MOVO's intended in-app informational use
- Decision: `APPROVED_BY_COUNSEL`, `APPROVED_POLICY_REVIEW`, `REQUIRES_PERMISSION`, `USE_TEXT_OR_GENERIC_ICON`, or `PENDING`
- Reviewer, evidence link/snapshot, next review date
- Any region-specific restrictions

### Current status of every existing registry entry

**All provider-specific entries remain PENDING until the fields above are completed.** The existing curated domain lists have not been individually cleared for commercial in-app logo use. This includes the bank/financial institution registry and the subscription-app registry. Domain correctness is a separate task from logo permission.

For a PENDING or REQUIRES_PERMISSION entry, the safe display is the plain service/institution name and a generic local icon. Do not describe the fetched favicon as an official logo. Do not copy or bundle the image as a local asset. If the product chooses to show remote favicons while this audit is open, that is an unresolved legal risk and must not be described as cleared.

## Representative official policy sources already located

These examples demonstrate why each provider needs its own review; they do **not** clear the entire catalog:

- Google APIs Terms: https://developers.google.com/terms/
- Meta Brand Resource Center: https://www.meta.com/brand/resources/meta/company-brand/
- Instagram brand guidance: https://www.meta.com/brand/resources/instagram/instagram-brand/
- Apple third-party trademark/copyright guidelines: https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html
- Netflix Brand Assets Terms: https://brand.netflix.com/en/terms/
- OpenAI brand guidelines: https://openai.com/brand/
- Philippine Intellectual Property Code, Section 148 (identification/information use subject to conditions): https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/4371

These policies differ. For example, official brand guidance may distinguish ordinary word-mark references from logo/icon use, may limit use to specific contexts, or may require prior permission. Do not generalize one provider's permission to another provider.

## Engineering safeguards required before enabling the catalog in production

1. **Default fallback:** local generic icon with accessible text label; image error handler must replace broken/empty/incorrect icon without loops.
2. **No guessed domains:** only curated, reviewed domain mappings may generate a remote request; manual names return no URL.
3. **No financial data:** favicon request may contain only the mapped domain and bounded size. Never send user ID, account data, transaction, subscription amount, bank balance, or credentials.
4. **Privacy disclosure:** explain direct third-party favicon requests and likely request metadata in the live Privacy Policy where required.
5. **No unapproved local copies:** do not download, cache, bundle, or rehost third-party icons until the applicable license and caching terms are established.
6. **Visible names:** never use an icon as the sole accessible identifier; do not claim the icon is official or verified.
7. **Permission workflow:** unresolved entries display a generic icon until their audit status is cleared.
8. **Change control:** additions or domain changes require a completed audit row, reviewer, official sources, and regression tests.
9. **Removal workflow:** support a rights-holder request, remove or replace disputed icons promptly while reviewing the claim, and log the disposition.
10. **No endorsement:** do not place provider marks in MOVO's own logo, app icon, advertising, or partnership claims.
11. **Visual QA:** verify favicon results across browsers, mobile/desktop, light/dark themes, high-DPI screens, missing icons, redirects, and wrong-domain cases. Visual QA does not establish legal permission.
12. **Review cadence:** recheck official terms and brand rules before launch and periodically thereafter; record the date and changes.

## Release gate

Do not mark this feature legally cleared, merge it as fully approved, or claim all icon terms have been reviewed until every provider entry has an evidence-backed decision. If comprehensive provider-by-provider clearance is not practical, use text labels and generic local icons instead of the remote brand icons.

This is an engineering audit register, not legal advice or a legal opinion. Have qualified counsel review the intended use in the Philippines and major target markets.
