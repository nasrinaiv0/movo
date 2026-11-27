# Adaptive MOVO Friends workspace

Contributor: Codex. Existing draft PR #347.

Friends now uses full pages for Chats, Conversation, Friend Profile, My Profile, Discovery, QR Invitations/Review and Settings. These pages reuse MOVO's existing navigation, profiles, chat, discovery, summary permissions and transaction-import contracts. NasrinAI keeps its separate place in the five-tab navigation. Legacy implementation and test filenames remain available; the semantic workspace entry points to one canonical implementation.

The original MOVO design uses matte surfaces, restrained green, consistent typography and spacing, visible focus and accessible controls. Conversations have one header, grouped bubbles, date/unread separators, an inline attachment action and an expandable privacy explanation. A container-based inbox rail adapts to the space available to the app. Reduced-motion preferences are respected; only new arrivals animate. Drafts and reading position survive profile visits within the workspace.

Owner/session cancellation prevents stale replies and confirmations from changing another account. Revoked connections clear their selected details and drafts. Accepting an invitation refreshes the inbox immediately. The existing consent, recipient-owned account selection and retry behavior remain in use for transaction imports.

## Local validation

- 279 suites / **1,845 tests**, typecheck and production build pass.
- Seven portable-server/offline checks pass.
- Original transaction-import browser checks pass in **18 configurations** across three time zones.
- **73 workspace screenshots** cover 320/390/768/1280 widths, light/dark, 200% text, RTL, narrow panes, reduced motion and recovery cases.
- Six affected implementation components pass the installed React-app lint rules.
- No dependency added. Main compressed JavaScript increases by approximately 4.9 KB compared with the rebuilt baseline.

[Approved rendered contact sheet](../../audits/assets/2026-11-27-friends-workspace/after.png).

These are isolated component/browser and local database tests. Fresh exact-head CI and native/device/release acceptance remain pending. The PR stays draft. Rollback is a source revert on the existing branch.
