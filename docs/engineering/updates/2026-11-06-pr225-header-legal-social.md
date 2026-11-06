# 2026-11-06 — PR #225 Header, policy layout and configured social profiles

## Request and implementation
- Header alignment: standardize root and sub headers to a 10px vertical inset and consistent 10px bottom spacing. Home header reduces unnecessary vertical space; the greeting, adaptive icons, mascot and fixed bottom bar remain functional. Parent screen continues respecting iOS safe area.
- Legal documents and Help Center: consistent vertical spacing between all section cards, including the later canonical supplemental sections; consistent inner paragraph/heading rhythm and scroll clearance.
- Official social destinations: \`api/social-links.js\` only publishes validated HTTPS profile links read at runtime from Vercel environment. \`SocialLinks\` uses local adaptive SVG icons, does not invent URLs, hides completely when unconfigured, and is inserted after the legal/help content.

## Vercel runtime environment variables
- \`MOVO_SOCIAL_INSTAGRAM_URL\` — MOVO Instagram profile (instagram.com)
- \`MOVO_SOCIAL_FACEBOOK_URL\` — MOVO Facebook page/profile (facebook.com or fb.com)
- \`MOVO_SOCIAL_TWITTER_URL\` / \`MOVO_SOCIAL_X_URL\` — MOVO X/Twitter (x.com or twitter.com)
- \`MOVO_SOCIAL_THREADS_URL\` — MOVO Threads (threads.net or threads.com)
- \`MOVO_SOCIAL_TIKTOK_URL\` — MOVO TikTok (@handle)

Configure these as plain URL values on the Vercel MOVO project (Production and Preview as appropriate). No OAuth credentials or platform tokens are required. A link appears only after its variable is configured with an allowed real account URL. Vercel environment-variable changes apply to new deployments only: redeploy MOVO after saving or editing profile URLs, then allow the 5-minute endpoint cache to expire. Do not use fictitious or generic platform homepages.

## Security and regression QA
- Exact trusted domain allowlists reject unsafe protocols, lookalike domains, credentials, unexpected ports and generic homepages. Browser code independently validates links and uses \`noopener noreferrer\`.
- \`src/lib/socialLinksApi.test.js\` and \`src/components/SocialLinks.test.js\` cover insecure URL rejection, empty configuration, safe output, page integration and accessible links. \`src/screens/HeaderLegalSpacing.test.js\` covers headers and legal cards.
- No changes to MOVO customer finance records, backend transaction API, user consent, or legal text. The canonical public standalone terms/privacy HTML remains unchanged by this in-app UI addition.
