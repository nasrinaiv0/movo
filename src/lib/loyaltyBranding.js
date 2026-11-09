/**
 * Only known merchants use curated public favicons (64px, lazy-loaded).
 * Unknown/custom merchants never turn user text into network domains.
 * These marks are identification aids, not a brand affiliation or issued card.
 *
 * Card faces (2026-11-09) follow the layout of the owner's Philippine membership-card references: brand colours,
 * a program title, the member number and one flat motif. The motifs are MOVO's own vector shapes; no merchant
 * artwork, mascot or logo file is reproduced (logos only come from the curated favicon list).
 *   rings   — concentric rings in a corner (coffee houses)
 *   band    — a diagonal band across the right side (supermarkets, fuel, pharmacies, retail)
 *   stripes — thin parallel stripes along the top (convenience stores, drugstores)
 *   foil    — a metallic edge and corner flourish (premium and "gold" memberships)
 *   split   — a two-tone face divided on the diagonal (fast food, airlines, toys)
 * Text sits on the motif too, so `ink` must stay readable on both `bg` and `accent`.
 * `program` is the program title from the reference card, shown when the person has not typed their own.
 * `logo` names the curated domain the face may show; entries without it use MOVO's icon.
 */
import { merchantLogoUrl } from './merchantFavicons';

const STYLES = Object.freeze({
  'starbucks': { program: 'Starbucks Rewards', bg: '#00543c', ink: '#f3e6c4', trim: '#c8a96a', accent: '#0b6b4d', motif: 'rings', title: 'serif', logo: 'starbucks.ph' },
  '7-eleven': { program: 'CLiQQ Rewards', bg: '#f7f7f1', ink: '#0b6b3a', trim: '#f47920', accent: '#e11b22', motif: 'stripes', logo: '7-eleven.com.ph' },
  'sm advantage': { program: 'Advantage Card', bg: '#123d8f', ink: '#ffffff', trim: '#e7c35a', accent: '#1d58c4', motif: 'band', logo: 'smadvantage.com' },
  'jollibee': { program: 'Happy Plus', bg: '#d71f2b', ink: '#ffffff', trim: '#f9c22e', accent: '#b5121d', motif: 'split', logo: 'jollibee.com.ph' },
  'mercury drug suki': { program: 'Suki Card', bg: '#f6f3ec', ink: '#c8102e', trim: '#c9a24a', accent: '#c8102e', motif: 'stripes', logo: 'mercurydrug.com' },
  's&r membership': { bg: '#10275a', ink: '#ffffff', trim: '#d4af37', accent: '#c8102e', motif: 'foil' },
  'landers': { bg: '#171717', ink: '#e8c96a', trim: '#d6b25e', accent: '#2a2a2a', motif: 'foil', title: 'serif', logo: 'landers.ph' },
  'puregold perks': { program: 'Perks Card', bg: '#0f7a3a', ink: '#ffffff', trim: '#f4c430', accent: '#0b6330', motif: 'stripes', logo: 'puregold.com.ph' },
  'robinsons rewards': { program: 'Go Rewards', bg: '#121a3a', ink: '#ffffff', trim: '#00a3e0', accent: '#c2410c', motif: 'band' },
  'allrewards': { bg: '#3b1f5c', ink: '#ffffff', trim: '#c9a45c', accent: '#4c2a74', motif: 'foil', title: 'serif' },
  'rustan’s frequent shopper': { program: 'Frequent Shopper', bg: '#13213f', ink: '#ecdcae', trim: '#c9a45c', accent: '#1b2d55', motif: 'foil', title: 'serif' },
  'metro rewards club': { program: 'Rewards Club', bg: '#c8102e', ink: '#ffffff', trim: '#1d3b70', accent: '#a50d26', motif: 'band' },
  'shakey’s supercard': { program: 'SuperCard', bg: '#5a0f16', ink: '#f6d58b', trim: '#e4b94e', accent: '#73151e', motif: 'foil' },
  'max’s all access': { program: 'All Access', bg: '#b0121d', ink: '#fff3d6', trim: '#e6c27a', accent: '#8e0e17', motif: 'band', title: 'serif' },
  'coffee bean & tea leaf': { program: 'Swirl Rewards', bg: '#4b2142', ink: '#f5e6d0', trim: '#c9a27a', accent: '#5e2b53', motif: 'rings', logo: 'coffeebean.com' },
  'the bistro group bff': { program: 'BFF Card', bg: '#1c1c1c', ink: '#dcbf92', trim: '#b8915a', accent: '#272727', motif: 'foil', title: 'serif' },
  'watsons': { program: 'Watsons Club', bg: '#007f79', ink: '#ffffff', trim: '#c6d82f', accent: '#006c67', motif: 'band', logo: 'watsons.com.ph' },
  'southstar drug': { bg: '#1f6fb2', ink: '#ffffff', trim: '#0b3a75', accent: '#1a5f99', motif: 'band' },
  'national book store': { program: 'Laking National', bg: '#d7262e', ink: '#ffffff', trim: '#ffffff', accent: '#b81d24', motif: 'band' },
  'ace hardware': { bg: '#e4002b', ink: '#ffffff', trim: '#ffffff', accent: '#c00024', motif: 'band' },
  'toy kingdom': { program: 'Amazing Card', bg: '#f6c400', ink: '#a5001a', trim: '#1e64c8', accent: '#f8bb00', motif: 'split' },
  'petron': { program: 'Value Card', bg: '#0b3d91', ink: '#ffffff', trim: '#e2231a', accent: '#0a347c', motif: 'band', logo: 'petron.com' },
  'seaoil': { bg: '#0d4c86', ink: '#ffffff', trim: '#f9cc38', accent: '#0b3f70', motif: 'band', logo: 'seaoil.com.ph' },
  'shell': { program: 'Go+', bg: '#fbce07', ink: '#a50f16', trim: '#dd1d21', accent: '#f7c000', motif: 'split', logo: 'shell.com.ph' },
  'caltex': { bg: '#f5f6f8', ink: '#00447c', trim: '#e31937', accent: '#cdeeee', motif: 'band', logo: 'caltex.com' },
  'cebu pacific getgo': { program: 'GetGo', bg: '#fdd023', ink: '#0b3d91', trim: '#00a6d6', accent: '#f6bd00', motif: 'split', logo: 'cebupacificair.com' },
  'tim hortons': { bg: '#802c30', ink: '#ffffff', trim: '#e8c998', accent: '#6c2428', motif: 'rings', logo: 'timhortons.com' },
  'mcdonald’s': { bg: '#c8102e', ink: '#ffffff', trim: '#ffc72c', accent: '#a50d26', motif: 'split', logo: 'mcdonalds.com.ph' },
});
const DEFAULT = Object.freeze({ bg: '#105f47', ink: '#ffffff', trim: '#9fd6bd', accent: '#0d4f3b', motif: 'rings' });
const key = name => String(name || '').trim().toLowerCase().replace(/'/g, '’');

export const loyaltyTypeLabel = card => card?.type === 'other'
  ? (String(card.cardType || '').trim() || 'Other')
  : ({ loyalty: 'Loyalty', membership: 'Membership', rewards: 'Rewards', tokens: 'Tokens' }[card?.type] || 'Membership');

export function loyaltyCardStyle(name) {
  return STYLES[key(name)] || DEFAULT;
}

export function loyaltyLogoUrl(name) {
  const style = STYLES[key(name)];
  if (!style || !style.logo) return '';
  // Only approved, hard-coded domains. Never request a domain typed by the user.
  return merchantLogoUrl(name, { size: 64 });
}
