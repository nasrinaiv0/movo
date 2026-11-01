/**
 * Merchant logo registry for transaction rows.
 *
 * Only curated names map to a domain; a domain is never derived from what the person typed. The merchant text is
 * matched on this device (whole words at the start, case-insensitive), and only the curated domain is sent to the
 * Google S2 favicon endpoint, with no referrer, amount or account detail. Owner-approved on 2026-11-01 for
 * identification only (see docs/legal/THIRD_PARTY_BRANDS_DYNAMIC_FAVICONS_AND_SUBSCRIPTIONS.md); set
 * reviewStatus: 'BLOCKED' on an entry to stop its remote icon.
 */
import { APPROVED_STATUSES, OWNER_APPROVAL } from './institutionFavicons';
import { institutionLogoUrl } from './institutions';
import { SUBSCRIPTION_APP_FAVICONS } from './subscriptionAppFavicons';

export const MERCHANT_FAVICONS = {
  // Food and delivery
  Grab: { domain: 'grab.com' }, 'GrabFood': { domain: 'grab.com' }, Foodpanda: { domain: 'foodpanda.ph' },
  Jollibee: { domain: 'jollibee.com.ph' }, "McDonald's": { domain: 'mcdonalds.com.ph' }, McDonalds: { domain: 'mcdonalds.com.ph' },
  Starbucks: { domain: 'starbucks.ph' }, KFC: { domain: 'kfc.com.ph' }, Chowking: { domain: 'chowking.com' },
  'Mang Inasal': { domain: 'manginasal.com' }, Greenwich: { domain: 'greenwich.com.ph' },
  // Shopping and groceries
  '7-Eleven': { domain: '7-eleven.com.ph' }, '7 Eleven': { domain: '7-eleven.com.ph' }, Shopee: { domain: 'shopee.ph' },
  Lazada: { domain: 'lazada.com.ph' }, Puregold: { domain: 'puregold.com.ph' }, 'Mercury Drug': { domain: 'mercurydrug.com' },
  Uniqlo: { domain: 'uniqlo.com' }, IKEA: { domain: 'ikea.com' }, Amazon: { domain: 'amazon.com' }, Apple: { domain: 'apple.com' },
  // Bills and utilities
  Meralco: { domain: 'meralco.com.ph' }, Globe: { domain: 'globe.com.ph' }, Smart: { domain: 'smart.com.ph' },
  PLDT: { domain: 'pldthome.com' }, Converge: { domain: 'convergeict.com' }, Maynilad: { domain: 'mayniladwater.com.ph' },
  'Manila Water': { domain: 'manilawater.com' },
  // Transport, fuel and travel
  Angkas: { domain: 'angkas.com' }, Uber: { domain: 'uber.com' }, Shell: { domain: 'shell.com.ph' }, Petron: { domain: 'petron.com' },
  Caltex: { domain: 'caltex.com' }, 'Cebu Pacific': { domain: 'cebupacificair.com' }, 'Philippine Airlines': { domain: 'philippineairlines.com' },
  Airbnb: { domain: 'airbnb.com' }, Agoda: { domain: 'agoda.com' }, 'Booking.com': { domain: 'booking.com' },
};

const ENDPOINT = 'https://www.google.com/s2/favicons';
const norm = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const KEYS = Object.keys(MERCHANT_FAVICONS).map(k => [norm(k), k]).sort((a, b) => b[0].length - a[0].length);
const SUBS = Object.keys(SUBSCRIPTION_APP_FAVICONS).map(k => [norm(k), k]).sort((a, b) => b[0].length - a[0].length);

/** The curated name a merchant line starts with, as whole words: "Jollibee - SM North" → "Jollibee". */
function match(text, keys) {
  const t = norm(text);
  if (!t) return null;
  const hit = keys.find(([k]) => t === k || (t.startsWith(k) && /[\s\-–—,.:#(]/.test(t.charAt(k.length))));
  return hit ? hit[1] : null;
}

const url = (domain, size) => `${ENDPOINT}?${new URLSearchParams({ domain, sz: String([16, 32, 48, 64, 128].includes(size) ? size : 64) })}`;
const approved = (entry) => APPROVED_STATUSES.includes(entry.reviewStatus || OWNER_APPROVAL);

/** Logo URL for a transaction's merchant (curated merchants, subscriptions, then banks/e-wallets), or ''. */
export function merchantLogoUrl(merchant, { size = 64 } = {}) {
  const m = match(merchant, KEYS);
  if (m && approved(MERCHANT_FAVICONS[m])) return url(MERCHANT_FAVICONS[m].domain, size);
  const s = match(merchant, SUBS);
  if (s && approved(SUBSCRIPTION_APP_FAVICONS[s])) return url(SUBSCRIPTION_APP_FAVICONS[s].domain, size);
  return institutionLogoUrl(merchant, { size }) || '';
}
