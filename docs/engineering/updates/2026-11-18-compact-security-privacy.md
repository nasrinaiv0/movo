# Compact Security & Privacy guide

The Security & Privacy guide at `/security` uses a compact responsive layout. A persistent Back to Home link opens the MOVO root route. Section links jump to data protections, storage, privacy choices and FAQs. Supporting feature descriptions are available in an expandable section.

- The guide retains its original review date and existing data-handling disclosures. The production offline-encryption notice now sits above the local and cloud storage comparison. The Privacy Policy, Terms of Service and account deletion links remain available.
- The page uses semantic headings, native expandable sections, keyboard focus indicators, a skip link and system light and dark themes. Reduced Motion disables the transitions. The existing public route and content security policy still apply.
- Local typecheck, strict production build and 1,543 tests passed. The contract test now checks the Home destination and section links. Chromium opened the guide with the configured security headers at 320, 390, 768 and 1440 px in both themes. It verified keyboard FAQ controls, the storage anchor offset, table fit and navigation to the built Home screen. At 390 px, the first protection section starts at 499 px from the top, down from 3,185 px. Verify the hosted preview and exact-head checks before merging.
- Scope is limited to the public guide and its test. Revert the implementation commit to restore the previous layout. This change requires no migration or configuration changes.
