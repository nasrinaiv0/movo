# Private Friends and compact Profile

## November 16, 2026

- Profile highlights the account and its plan, gives edit a visible affordance, and puts Friends and Refer MOVO beside each other. Existing balance visibility, account totals, settings, exports and legal actions are retained. Amounts use the selected currency and two decimals. The profile and Friends layouts use the existing theme and respect reduced motion.
- For an invitation, choose the display name to share and generate a QR or share the HTTPS link. iOS uses the system share sheet for AirDrop and Android uses the Android Sharesheet for Quick Share when available. The recipient can open the native app or use the web flow, review the sender's chosen name, choose a display name and explicitly accept. A QR scan or link open never creates a friendship by itself.
- Guests can sign in before accepting. Accepted connections appear on both accounts. Anyone in a connection can remove it. The invite creator can replace or revoke an unused link. Invites are single use and expire after 24 hours. Each account can maintain 200 connections.

## Data, security and privacy

- New requests use the same server-side Supabase session verification pattern as Referrals. Authenticated callers can use only their own account. The API ignores caller-provided account IDs and denies anonymous or unverified users.
- The database stores one invite hash per owner. The HTTP URL carries the random token in its fragment so normal URL requests and referrers do not contain it. The API accepts a token in POST, hashes it with SHA-256 and never logs it. Only verified holders of an active link can see its chosen name.
- The database uses RLS with no client grants. A canonical UUID pair and transactional locks enforce consent, one-use invites, idempotent retries and unique friendships. Names use explicit, short display labels. Friends excludes financial records, account email, contacts and photos. Friend deletion and account deletion remove the corresponding relationship.
- The privacy disclosure is synchronized between Profile and the public policy. Joining or sharing as a friend has no dependency on referral rewards or a paid plan.

## Verification

- Disposable PostgreSQL migration history and existing finance authorization suite, with friend-specific assertions for cross-account access, expiry, revocation, reuse, reciprocal deduplication and deletion.
- Mobile Chromium with isolated fixture accounts exercised Profile, QR generation, the landing page and deliberate acceptance in light and dark at 375 px and 320 px. The Friends tab selector uses a distinct filled surface for the active tab.
- React and API regressions cover intentional acceptance, QR creation and revocation, web/native link validation, system share payloads and verified-account authorization.
- Signed-device checks require two MOVO test accounts and current builds. Verify AirDrop on two iPhones, Android Quick Share where offered, a cross-platform QR, accepted and reused links, and removal from both accounts. On an older app the landing page can continue on web.
- Apply the migration in the preview database and run two-account acceptance before enabling the feature in production. For rollback, revert the app and endpoint while retaining the additive database tables and stored connections.

## Store review

Friends ships as invite-only contact connections with manually chosen short names. Store disclosures should describe the display names and account links before a store release. Real device or signed provisioning claims require separate evidence.
