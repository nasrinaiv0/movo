# MOVO — tasks requiring owner, legal, or store-console action

These tasks cannot be completed by changing application code alone. They remain release gates.

## Business and legal identity
- [ ] Decide the legal operator (individual/sole proprietor or registered entity).
- [ ] Complete applicable DTI or SEC registration and local permits.
- [ ] Complete BIR registration, tax setup, books, and compliant invoicing.
- [ ] Confirm DTI Philippine E-Commerce Trustmark applicability and complete any required registration.
- [ ] Name the Data Protection Officer and complete applicable NPC registration.
- [ ] Complete a formal Privacy Impact Assessment and approve retention schedules.
- [ ] Have Philippine counsel review Terms, Privacy Policy, subscription terms, refunds, consumer disclosures, and AI/financial disclaimers.
- [ ] Execute data-processing agreements and cross-border transfer reviews with relevant providers.
- [ ] Confirm the correct Apple and Google developer-account legal entity and financial-app classification.

## Store console and credentials
- [ ] Accept Apple and Google developer agreements and complete tax/banking profiles.
- [ ] Create subscription products, groups/base plans, localizations, and pricing.
- [ ] Configure Apple Server API credentials, app ID, root certificates, and notification URL.
- [ ] Configure Google Play service account, API access, Pub/Sub notifications, and notification URL.
- [ ] Add all production secrets to Vercel; never commit credentials.
- [ ] Complete App Store privacy labels and Google Play Data Safety / Financial Features declarations based on actual SDK data flows.
- [ ] Provide reviewer credentials and complete store metadata/screenshots.
- [ ] Upload signed iOS and Android builds and complete TestFlight / Play internal testing.

## Operational sign-off
- [ ] Publish support, privacy, account-deletion, refund, and subscription-management URLs.
- [ ] Approve incident response, breach notification, backups, restore drills, and customer complaint workflows.
- [ ] Complete real-device security and accessibility testing.
- [ ] Obtain formal legal/privacy/security sign-off before public release.

## Explicit scope note
Historical logo approval did not establish rights-holder permission. Superseded for App Store preparation on 2026-11-21: iOS uses original-only artwork, and the archive excludes unverified logo/wallpaper/tutorial/mascot-file packs. Name/trademark clearance, asset/software provenance, a single store record and actual metadata/screenshots remain submission gates. See ../app-store/APP_REVIEW_PACKET.md and submission-evidence.json. Web/Android legacy artwork is not thereby legally cleared.
