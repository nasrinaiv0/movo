/**
 * Only known merchants use curated public favicons (64px, lazy-loaded).
 * Unknown/custom merchants never turn user text into network domains.
 * These marks are identification aids, not a brand affiliation or issued card.
 */
import { merchantLogoUrl } from './merchantFavicons';

const STYLES = Object.freeze({
  'starbucks': { bg: '#064d35', ink: '#f8e5b3', trim: '#bfa56c', logo: 'starbucks.ph' },
  '7-eleven': { bg: '#f9f8ef', ink: '#17513d', trim: '#ea702f', logo: '7-eleven.com.ph' },
  'petron': { bg: '#164881', ink: '#ffffff', trim: '#e6ae41', logo: 'petron.com' },
  'seaoil': { bg: '#0d4c86', ink: '#ffffff', trim: '#f9cc38', logo: 'seaoil.com.ph' },
  'shell': { bg: '#fff8e5', ink: '#9b242c', trim: '#f8c62a', logo: 'shell.com.ph' },
  'caltex': { bg: '#164f8c', ink: '#ffffff', trim: '#db4343', logo: 'caltex.com' },
  'tim hortons': { bg: '#802c30', ink: '#ffffff', trim: '#e8c998', logo: 'timhortons.com' },
  'coffee bean & tea leaf': { bg: '#413126', ink: '#fff5de', trim: '#d0b38b', logo: 'coffeebean.com' },
  'watsons': { bg: '#00897e', ink: '#ffffff', trim: '#a4e4db', logo: 'watsons.com.ph' },
  'landers': { bg: '#174d3c', ink: '#ffffff', trim: '#e8cb85', logo: 'landers.ph' },
  'sm advantage': { bg: '#1358a4', ink: '#ffffff', trim: '#efc75c', logo: 'smadvantage.com' },
  'robinsons rewards': { bg: '#0b6f51', ink: '#ffffff', trim: '#dfc06e' },
  'mercury drug suki': { bg: '#b32c40', ink: '#ffffff', trim: '#f7de9a' },
  'jollibee': { bg: '#b51d2d', ink: '#ffffff', trim: '#f3c14d', logo: 'jollibee.com.ph' },
  'mcdonald’s': { bg: '#ae2a27', ink: '#ffffff', trim: '#ffc72c', logo: 'mcdonalds.com.ph' },
});
const DEFAULT = Object.freeze({ bg: '#105f47', ink: '#ffffff', trim: '#9fd6bd' });

export const loyaltyTypeLabel = card => card?.type === 'other'
  ? (String(card.cardType || '').trim() || 'Other')
  : ({ loyalty: 'Loyalty', membership: 'Membership', rewards: 'Rewards', tokens: 'Tokens' }[card?.type] || 'Membership');

export function loyaltyCardStyle(name) {
  return STYLES[String(name || '').trim().toLowerCase()] || DEFAULT;
}

export function loyaltyLogoUrl(name) {
  const style = STYLES[String(name || '').trim().toLowerCase()];
  if (!style || !style.logo) return '';
  // Only approved, hard-coded domains. Never request a domain typed by the user.
  return merchantLogoUrl(name, { size: 64 });
}
