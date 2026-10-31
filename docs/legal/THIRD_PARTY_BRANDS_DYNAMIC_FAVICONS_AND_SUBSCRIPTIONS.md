# Third-Party Brand Icons, Dynamic Favicons, and Subscription Catalog

**Status:** Proposed legal/product disclosure for review. This file is not proof that the live Terms of Service or Privacy Policy has been updated. Confirm the canonical published policy locations and verify deployment before treating the wording as effective.

## Third-party names, marks, and icons

MOVO may display third-party service names and institution names to help users identify and categorize subscriptions, expenses, and financial institutions. Third-party names and marks remain the property of their respective owners. Display does not imply affiliation, sponsorship, endorsement, or partnership, or that MOVO can access, verify, cancel, or manage a user's account with a provider.

A disclaimer does not grant MOVO a license to use a logo, icon, or other protected artwork. MOVO must follow the applicable provider terms, official trademark/brand guidance, and applicable law. Where a provider's rules or the legal basis for a particular icon are unclear, MOVO should use a plain text label and a generic locally created icon unless and until permission or a documented lawful basis is established.

## Purpose and limits of displayed logos and favicons

Logos, icons, favicons, and institution names displayed in MOVO are visual identification aids only. They help users recognize and organize their own cards, bank accounts, e-wallets, subscriptions, expenses, and money flow. They do not mean that MOVO represents, is affiliated with, is endorsed by, or acts on behalf of the institution or brand owner.

A displayed logo or favicon is not used by MOVO to authorize, initiate, route, or process a payment; authenticate a user or financial institution; connect to a bank account; access an institution's systems; or collect credentials or financial information from the institution. The icon itself must not trigger data collection or financial actions. MOVO must not use these images to impersonate an institution, mislead users about an official relationship, or interfere with an institution's services or systems. Any financial information users choose to enter into MOVO is handled separately from decorative icon retrieval and must be governed by MOVO's actual privacy and security practices.

## Payments and payment gateway

For payment functionality offered by MOVO, PayMongo is the designated payment gateway. Third-party logos and favicons are not payment gateways and do not process payments. MOVO must not use a displayed bank, card, e-wallet, subscription-service, or other third-party logo to imply that the institution processes a MOVO payment or has partnered with MOVO. Any payment functionality must use the configured PayMongo integration and comply with the applicable PayMongo terms, security requirements, and relevant law. This statement describes the intended payment architecture and does not by itself verify that every payment flow is implemented or configured correctly.

## Dynamic Domain Favicons and Google

MOVO may attempt to retrieve a website favicon through Google's S2 favicon endpoint using a curated service/institution-to-domain mapping. The endpoint may return a website favicon, a simplified or low-resolution mark, a generic icon, an incorrect icon, or no image. It is not guaranteed to return an official logo or the provider's current approved brand asset.

The fact that an image is publicly retrievable through Google does not by itself grant MOVO permission to reuse the underlying artwork. MOVO does not represent that Google has endorsed MOVO, licensed every returned image, or confirmed the rights associated with an image. Provider-specific review is required; see `docs/legal/DYNAMIC_FAVICON_AND_THIRD_PARTY_BRAND_AUDIT.md`.

Where rights clearance is pending or uncertain, MOVO should show the provider's name and a generic local icon instead of the remote favicon. MOVO must not describe an unverified favicon as an official or verified logo.

## Third-party requests and privacy

When a user's browser or device requests a remote favicon, the request goes to the favicon provider and may expose technical information such as IP address, requested domain, device/browser request metadata, and timing. The precise information depends on the implementation and provider practices. MOVO should minimize request data, avoid sending user identifiers or financial information, and describe applicable third-party requests in the live Privacy Policy as required by law.

Favicon requests must never include account balances, transaction details, bank-account numbers, subscription prices, credentials, or other financial records. The implementation must not use a user's list of services to create an analytics or advertising profile.

## Catalog and domain mappings

The subscription and institution catalogs are informational convenience features. Listing a provider does not establish that the user has a subscription, that a paid plan is available in every region, or that MOVO has an official integration with the provider. Pricing, plans, availability, and billing terms vary by provider and region and should be confirmed by the user.

MOVO must not infer domains from arbitrary user-entered names. Only curated mappings with recorded official-domain provenance may initiate a favicon request. Unknown or manually entered services must use a generic icon unless and until reviewed.

## Accuracy, fallback, and rights-holder requests

MOVO does not guarantee that remote icons are accurate, current, available, or suitable for every use. If an icon is missing, inaccurate, mismatched, or disputed, MOVO should replace it with a generic local icon and readable name while reviewing the issue. Icon display must never affect financial calculations, account balances, subscription amounts, reminders, or automation.

Rights holders may contact MOVO through the published support channel to report concerns. MOVO should provide a prompt review/removal workflow. Contact details in this document must be confirmed against the canonical support contact before publication.

## No blanket legal assurance

This notice is a disclosure, not a license and not a statement that every catalog entry has been cleared. Provider-specific terms and brand policies must be reviewed and recorded before remote icons are enabled for that entry. If a policy is ambiguous, seek permission or use a text label and generic icon.

