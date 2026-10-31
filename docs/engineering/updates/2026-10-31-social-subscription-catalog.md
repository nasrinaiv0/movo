# MOVO Subscription Catalog Expansion — Social & Digital Services

**Date:** 2026-10-31  
**Repository:** `nasrinaiv0/movo`  
**Status:** Implementation handoff/specification; UI integration, official asset review, and automated tests are not yet verified.

## Goal

Expand MOVO's existing subscription tracker with recognizable social-media and digital-service subscriptions, including Meta products. Keep these as user-entered expense/subscription records: MOVO must not imply it is integrated with, endorsed by, or able to read billing data from the listed providers unless a separately verified integration exists.

## First catalog expansion

Use a centralized catalog rather than scattering names, colors, or logo URLs throughout UI code. Categories and examples:

- **Social & messaging:** Facebook, Instagram, WhatsApp, Messenger, Threads, TikTok, Snapchat, X, LinkedIn, Pinterest, Reddit, Discord, Telegram.
- **Video & streaming:** YouTube Premium, Netflix, Disney+, Max, Prime Video, Hulu, Spotify, Apple Music.
- **Cloud, productivity & AI:** iCloud+, Google One, Microsoft 365, Dropbox, Canva, Adobe Creative Cloud, ChatGPT, Claude, Gemini.
- **Gaming & memberships:** PlayStation Plus, Xbox Game Pass, Nintendo Switch Online, Twitch subscriptions.
- **Other digital services:** add regionally relevant services only after catalog review.

This is a suggested seed list, not a claim that every service is a paid subscription in every country. Some listed products have free tiers, one-time purchases, creator memberships, or region-dependent billing. The user must select/confirm the actual plan and price; do not prefill a price or billing cadence as fact.

## Existing catalog audit required

Before modifying the current list:
1. Locate the existing subscription/service catalog, any category constants, UI rendering, icon resolver, form validation, search/filter, and tests.
2. Preserve all existing entries and their saved-record compatibility. Do not duplicate entries under alternate spellings.
3. Add missing services only; normalize display name, category, optional official URL, asset source, and asset-review status.
4. Confirm subscription entries still feed the existing MOVO expense calculations correctly and do not alter the user's separate bank-account/savings treatment.
5. Add regression tests for existing items, new social entries, search/category filtering, unknown services, and missing-logo fallback.

## Official logos and asset handling

**Do not scrape Google Images, use random logo-CDN URLs, or redraw proprietary marks.** Prefer the rights holder's official brand/resource center and use the exact asset and usage rules they publish. Keep a manifest such as:

```json
{
  "id": "instagram",
  "name": "Instagram",
  "category": "social",
  "officialUrl": "https://www.instagram.com/",
  "logoAsset": "/brands/instagram.svg",
  "assetSource": "official brand resource URL",
  "assetReviewStatus": "pending",
  "lastReviewed": null
}
```

The above is a schema example, not confirmation that the referenced local file exists or that permission has been obtained. Each real asset entry must record its source, date checked, license/terms review, and any approval requirement.

### Meta-specific guidance

Official starting points:
- Meta Brand Resource Center: https://www.meta.com/brand/resources/
- Facebook logo guidance and download: https://www.meta.com/brand/resources/facebook/logo/
- Instagram assets and guidance: https://www.meta.com/brand/resources/instagram/instagram-brand/

Meta's current guidance says to use official assets rather than logos found elsewhere. Facebook logo guidance requires the current supplied asset and prohibits altering it. Instagram guidance prohibits presentation that implies partnership, sponsorship, or endorsement. Meta's corporate logo is not a substitute for the Facebook product logo; Meta states that use of the corporate Meta logo requires approval. Review each product's current guidelines and any download/approval terms before shipping assets.

**Important:** A disclaimer in MOVO's Terms of Service does not itself grant permission to use a logo. If permission/terms are unclear, use a neutral text label or a generic category icon until reviewed. Do not remotely hotlink assets to a third-party CDN at runtime; store approved assets locally with attribution/source records so the UI remains reliable and privacy-preserving.

## UI behavior

- Add a searchable catalog section under the existing subscription app picker; preserve the current interaction and visual language.
- Group results by category, including Social & Messaging.
- Use official approved logos only where asset review is complete. Maintain consistent icon box size without recoloring, cropping, distorting, or adding effects to a brand mark.
- For services with pending/unavailable assets, show a generic icon plus the exact service name.
- Let users add a custom service without requiring a logo.
- Do not suggest that MOVO can verify a subscription or connect to a provider account simply because a service appears in the catalog.
- Preserve accessibility: meaningful accessible name, visible text label, keyboard operation, adequate contrast, and a reliable fallback if an image fails to load.

## Terms of Service / trademark disclosure

A prior draft PR, **#77**, describes third-party trademark/logo language. At the time of this update, PR #77 is open and draft, so its content must not be assumed to be live in production. Verify the current main-branch Terms of Service and the eventual merged version before claiming this disclosure is published.

Suggested disclosure for legal review:

> **Third-party names and trademarks.** Names, logos, and other marks displayed in MOVO are the property of their respective owners. They are shown only to help users identify and categorize subscriptions or expenses. Unless expressly stated otherwise, MOVO is not affiliated with, sponsored by, endorsed by, or partnered with these third parties, and their inclusion does not imply authorization or integration. MOVO does not claim ownership of third-party marks. Use of any logo remains subject to the applicable rights holder's terms and brand guidelines. Rights holders may contact support@nasrinai.com regarding concerns or requests for review/removal.

This language is a proposal, not legal advice and not a substitute for permissions required by a rights holder. Do not promise removal within a particular period unless an operational process supports that promise. Ensure the same statement appears in the relevant Terms of Service section and, where appropriate, a concise in-product attribution/disclaimer.

## Acceptance criteria

- [ ] Inventory of current catalog documented; additions are deduplicated.
- [ ] Facebook, Instagram, WhatsApp, Messenger, Threads and other approved seed services are searchable and correctly categorized.
- [ ] Each shipped logo is sourced from an official resource and has a recorded review status; otherwise a generic icon is shown.
- [ ] No brand mark is distorted, recolored, or presented as a MOVO partner badge.
- [ ] No third-party logo is loaded from an unreviewed remote CDN at runtime.
- [ ] Terms disclaimer is verified on the target branch and visible in the app; PR #77 status is checked before relying on it.
- [ ] Subscription creation, editing, deletion, recurring amounts, currency handling, filters, and existing records remain compatible.
- [ ] Unit/integration tests pass; production behavior is not marked verified solely because tests pass.
- [ ] Any legal/brand permission uncertainty is recorded as a blocker rather than silently treated as approval.

## Implementation handoff

This document alone does not implement the catalog, add logo binaries, modify the Terms of Service, or prove that tests pass. Inspect the source of truth and existing UI before coding; keep changes scoped to subscription catalog/UI/assets, legal copy only if needed, tests, and documentation. Do not change authentication, financial-data storage, Supabase schema/RLS, production settings, or secrets as part of this feature without a separate approved scope.
