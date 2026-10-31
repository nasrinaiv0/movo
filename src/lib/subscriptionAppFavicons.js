/**
 * Subscription app favicon registry.
 *
 * UI components should use getSubscriptionFaviconUrl(appName) rather than
 * embedding long provider URLs. Only curated domains are eligible; never
 * derive a domain from arbitrary user-entered text.
 *
 * Uses Google S2 Dynamic Domain Favicons. Returned images may not be the
 * official or high-resolution logo. UI must show the app name and use a
 * generic fallback on missing/incorrect image loads. See the legal disclosure
 * in docs/legal/THIRD_PARTY_BRANDS_DYNAMIC_FAVICONS_AND_SUBSCRIPTIONS.md.
 */

export const SUBSCRIPTION_APP_FAVICONS = {
  // Social, messaging, and creator platforms
  Facebook: { domain: 'facebook.com', category: 'social' },
  Instagram: { domain: 'instagram.com', category: 'social' },
  WhatsApp: { domain: 'whatsapp.com', category: 'messaging' },
  Messenger: { domain: 'messenger.com', category: 'messaging' },
  Threads: { domain: 'threads.net', category: 'social' },
  TikTok: { domain: 'tiktok.com', category: 'social' },
  Snapchat: { domain: 'snapchat.com', category: 'social' },
  X: { domain: 'x.com', category: 'social' },
  'LinkedIn Premium': { domain: 'linkedin.com', category: 'professional' },
  Pinterest: { domain: 'pinterest.com', category: 'social' },
  'Reddit Premium': { domain: 'reddit.com', category: 'social' },
  'Discord Nitro': { domain: 'discord.com', category: 'messaging' },
  'Telegram Premium': { domain: 'telegram.org', category: 'messaging' },
  'Twitch Subscriptions': { domain: 'twitch.tv', category: 'creator' },
  Patreon: { domain: 'patreon.com', category: 'creator' },
  Substack: { domain: 'substack.com', category: 'creator' },
  'Ko-fi Membership': { domain: 'ko-fi.com', category: 'creator' },

  // Video, music, and entertainment
  Netflix: { domain: 'netflix.com', category: 'streaming' },
  'YouTube Premium': { domain: 'youtube.com', category: 'streaming' },
  Spotify: { domain: 'spotify.com', category: 'music' },
  'Apple Music': { domain: 'music.apple.com', category: 'music' },
  'Amazon Prime Video': { domain: 'primevideo.com', category: 'streaming' },
  'Amazon Prime': { domain: 'amazon.com', category: 'membership' },
  'Disney+': { domain: 'disneyplus.com', category: 'streaming' },
  'Max': { domain: 'max.com', category: 'streaming' },
  Hulu: { domain: 'hulu.com', category: 'streaming' },
  'Paramount+': { domain: 'paramountplus.com', category: 'streaming' },
  'Peacock': { domain: 'peacocktv.com', category: 'streaming' },
  'Apple TV+': { domain: 'tv.apple.com', category: 'streaming' },
  Crunchyroll: { domain: 'crunchyroll.com', category: 'streaming' },
  'SoundCloud Go': { domain: 'soundcloud.com', category: 'music' },
  Deezer: { domain: 'deezer.com', category: 'music' },
  Tidal: { domain: 'tidal.com', category: 'music' },
  'YouTube Music': { domain: 'music.youtube.com', category: 'music' },
  'Viu Premium': { domain: 'viu.com', category: 'streaming' },
  iQIYI: { domain: 'iq.com', category: 'streaming' },
  WeTV: { domain: 'wetv.vip', category: 'streaming' },

  // AI services
  ChatGPT: { domain: 'chatgpt.com', category: 'ai' },
  Claude: { domain: 'claude.ai', category: 'ai' },
  Gemini: { domain: 'gemini.google.com', category: 'ai' },
  'Perplexity Pro': { domain: 'perplexity.ai', category: 'ai' },
  'Microsoft Copilot': { domain: 'copilot.microsoft.com', category: 'ai' },
  Midjourney: { domain: 'midjourney.com', category: 'ai' },
  'GitHub Copilot': { domain: 'github.com', category: 'developer' },
  Cursor: { domain: 'cursor.com', category: 'developer' },
  'Grammarly Premium': { domain: 'grammarly.com', category: 'productivity' },
  'QuillBot Premium': { domain: 'quillbot.com', category: 'productivity' },

  // Productivity, design, and cloud
  'Microsoft 365': { domain: 'microsoft.com', category: 'productivity' },
  'Google One': { domain: 'one.google.com', category: 'cloud' },
  'iCloud+': { domain: 'icloud.com', category: 'cloud' },
  Dropbox: { domain: 'dropbox.com', category: 'cloud' },
  Canva: { domain: 'canva.com', category: 'design' },
  'Adobe Creative Cloud': { domain: 'adobe.com', category: 'design' },
  'Figma Professional': { domain: 'figma.com', category: 'design' },
  Notion: { domain: 'notion.so', category: 'productivity' },
  Evernote: { domain: 'evernote.com', category: 'productivity' },
  Todoist: { domain: 'todoist.com', category: 'productivity' },
  'Zoom Workplace': { domain: 'zoom.us', category: 'productivity' },
  'Slack Pro': { domain: 'slack.com', category: 'productivity' },
  'Atlassian Cloud': { domain: 'atlassian.com', category: 'productivity' },
  '1Password': { domain: '1password.com', category: 'security' },
  NordVPN: { domain: 'nordvpn.com', category: 'security' },
  ExpressVPN: { domain: 'expressvpn.com', category: 'security' },

  // Gaming
  'PlayStation Plus': { domain: 'playstation.com', category: 'gaming' },
  'Xbox Game Pass': { domain: 'xbox.com', category: 'gaming' },
  'Nintendo Switch Online': { domain: 'nintendo.com', category: 'gaming' },
  'Roblox Premium': { domain: 'roblox.com', category: 'gaming' },
  'EA Play': { domain: 'ea.com', category: 'gaming' },
  'Ubisoft+': { domain: 'ubisoft.com', category: 'gaming' },
  'Apple Arcade': { domain: 'apple.com', category: 'gaming' },
  'Google Play Pass': { domain: 'play.google.com', category: 'gaming' },

  // News, learning, fitness, and lifestyle
  'The New York Times': { domain: 'nytimes.com', category: 'news' },
  'The Washington Post': { domain: 'washingtonpost.com', category: 'news' },
  Medium: { domain: 'medium.com', category: 'reading' },
  'Kindle Unlimited': { domain: 'amazon.com', category: 'reading' },
  Audible: { domain: 'audible.com', category: 'audio' },
  'Duolingo Super': { domain: 'duolingo.com', category: 'learning' },
  'Coursera Plus': { domain: 'coursera.org', category: 'learning' },
  Skillshare: { domain: 'skillshare.com', category: 'learning' },
  MasterClass: { domain: 'masterclass.com', category: 'learning' },
  Strava: { domain: 'strava.com', category: 'fitness' },
  'Fitbit Premium': { domain: 'fitbit.com', category: 'fitness' },
  'Peloton App': { domain: 'onepeloton.com', category: 'fitness' },
  Headspace: { domain: 'headspace.com', category: 'wellness' },
  Calm: { domain: 'calm.com', category: 'wellness' },
};

const FAVICON_ENDPOINT = 'https://www.google.com/s2/favicons';

/**
 * Build a Dynamic Domain Favicon URL for a known subscription app.
 * @param {string} appName Exact curated catalog display name
 * @param {{ size?: number }} options
 * @returns {string|null}
 */
export function getSubscriptionFaviconUrl(appName, { size = 128 } = {}) {
  if (!appName || typeof appName !== 'string') return null;
  const entry = SUBSCRIPTION_APP_FAVICONS[appName.trim()];
  if (!entry) return null;
  const safeSize = [16, 32, 48, 64, 128].includes(Number(size) * 1)
    ? Number(size)
    : 128;
  const params = new URLSearchParams({ domain: entry.domain, sz: String(safeSize) });
  return `${FAVICON_ENDPOINT}?${params.toString()}`;
}

export function getSubscriptionFaviconEntry(appName) {
  if (!appName || typeof appName !== 'string') return null;
  return SUBSCRIPTION_APP_FAVICONS[appName.trim()] || null;
}
