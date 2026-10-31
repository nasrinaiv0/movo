# MOVO — Official Institution Logos on Account Cards

**Date:** 2026-10-31  
**Status:** Documentation / implementation handoff; no UI implementation or asset review has been verified.

## User requirement

When an account has a selected bank or financial institution, show that institution's real, official logo on the account/card visual, not only in the searchable Bank / Institution dropdown. This complements the country-aware picker documented in `2026-10-31-country-aware-bank-institution-picker.md`.

## Expected behavior

- The account card uses the selected institution's reviewed logo when one is available and approved for use.
- The logo is clearly associated with the institution but must not make the card look like an issued bank card or imply MOVO is affiliated with the bank.
- Keep existing account style, card-kind (debit/credit), user-selected card color, account name, masked last four digits, and balance presentation intact.
- Logo sizing must preserve original proportions and include adequate padding. Do not recolor, crop, distort, add effects to, or combine brand marks with MOVO branding unless the rights holder's guidelines explicitly allow it.
- A logo must never be required to create or display an account. If no reviewed logo is available, show the existing generic account icon with the institution's display name.
- If an institution's name is entered manually and cannot be matched unambiguously, do not guess a logo. Show the generic fallback until the user explicitly selects a known catalog institution.
- The same institution mapping should be used by the searchable picker, Add Account preview, saved account card, and Edit Account preview to avoid inconsistent branding.
- When a user changes the selected institution, update the preview and saved card after the normal save action. Do not silently rewrite other account fields.

## Asset policy

Use official institution brand/resource pages or other explicitly authorized sources. Do not copy logos from random image search results, unverified logo-CDN endpoints, or another application's bundle. Store approved assets locally in a consistent format (SVG or optimized raster as permitted by the brand owner) and maintain a manifest containing:
- stable institution ID and country code;
- local asset path;
- official source URL and date reviewed;
- license/brand-guideline review status and constraints;
- fallback behavior.

A logo's public availability does not necessarily grant permission for every use. The MOVO Terms of Service disclaimer is not a license. If usage is uncertain or approval is required, use the generic fallback until legal/brand review is complete. Do not hotlink remote logo URLs in the user's account card at runtime; this is more reliable and avoids exposing user activity to third-party image hosts.

## Suggested mapping model

Use the stable institution ID from the country-aware catalog, e.g. `ph-bdo-unibank`, as the key for a local asset manifest. Do not use fuzzy string matching as the only source of truth. Existing free-text institution values must continue to display as text and use the generic icon unless explicitly mapped.

Example only (not a verified asset or permission grant):

```json
{
  "institutionId": "ph-bdo-unibank",
  "countryCode": "PH",
  "displayName": "BDO Unibank",
  "logoAsset": "/brands/banks/ph-bdo-unibank.svg",
  "assetSource": "official brand-resource URL",
  "reviewStatus": "pending"
}
```

## Accessibility and UI

- Provide an accessible name such as "BDO Unibank logo" when the image conveys useful identity; otherwise mark decorative imagery appropriately and keep the institution name visible in text.
- Ensure logos are legible in dark and light themes; do not alter the logo to force contrast. Use a neutral background/container if needed and permitted.
- Avoid layout shifts while assets load; provide dimensions and a fallback on load failure.
- Ensure the logo does not overlap the account name, balance, card-kind badge, masked digits, or user-selected style.
- Verify responsive behavior on narrow mobile screens and the existing account preview/card.

## Acceptance criteria

- [ ] Selecting a reviewed catalog institution shows its correct logo in the Add Account preview.
- [ ] Saving the account shows the same logo on the saved account card.
- [ ] Edit Account preview and saved card remain consistent.
- [ ] Changing institution updates the logo only after a valid selection/save, according to existing form behavior.
- [ ] Manual/unmatched institutions, missing files, and image-load failures use a stable generic fallback.
- [ ] Logo files have official provenance and a completed usage review before being marked approved.
- [ ] Logo assets are local, optimized, and do not cause third-party requests when rendering account cards.
- [ ] No implied partnership, bank account connection, card issuance, or endorsement is communicated.
- [ ] Existing account creation, edit, display, financial calculations, and account-type tests pass.
- [ ] No production behavior is claimed verified until runtime/UI testing is completed.

## Implementation notes

Inspect the existing account preview/card component and the canonical account/institution model. Reuse the country-aware catalog and stable institution IDs; do not create a second unrelated logo lookup table. Keep changes limited to institution catalog metadata, approved local assets, card/preview rendering, tests, and documentation. Do not change balances, savings classification, authentication, Supabase schema/RLS, or production configuration without a separate approved requirement.
