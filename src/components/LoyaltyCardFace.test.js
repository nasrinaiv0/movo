import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LoyaltyCardFace from './LoyaltyCardFace';
import { loyaltyCardStyle, loyaltyLogoUrl } from '../lib/loyaltyBranding';
import { LOYALTY_PROVIDERS } from '../lib/loyaltyCards';

const lum = hex => {
  const c = hex.replace('#', '').match(/../g).map(h => parseInt(h, 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const providers = LOYALTY_PROVIDERS.filter(name => name !== 'Other');

test('merchant reward card displays a small approved logo and points, never peso balance', () => {
  const html = renderToStaticMarkup(<LoyaltyCardFace card={{ type: 'loyalty', name: '7-Eleven', points: '25.5', memberNumber: '12345678', pointsUnit: 'points' }} />);
  expect(html).toContain('loyalty-card-face');
  expect(html).toContain('7-eleven.com.ph');
  expect(html).toContain('25.5');
  expect(html).toContain('•••• 5678');
  expect(html).not.toContain('₱');
});

test('Other card uses the custom label and never fetches an untrusted merchant', () => {
  const html = renderToStaticMarkup(<LoyaltyCardFace card={{ type: 'other', name: 'Unknown Store', cardType: 'Gift club', points: '0' }} />);
  expect(html).toContain('Gift club');
  expect(html).not.toContain('google.com');
  expect(html).toContain('0');
});

test('every listed merchant from the owner references has its own card layout', () => {
  ['Mercury Drug Suki', 'S&R Membership', 'Puregold Perks', 'AllRewards', 'Rustan’s Frequent Shopper', 'Metro Rewards Club',
    'Shakey’s SuperCard', 'Max’s All Access', 'The Bistro Group BFF', 'Southstar Drug', 'National Book Store', 'ACE Hardware',
    'Toy Kingdom', 'Cebu Pacific GetGo'].forEach(name => expect(providers).toContain(name));
  const fallback = loyaltyCardStyle('Some store nobody listed');
  providers.forEach(name => {
    const style = loyaltyCardStyle(name);
    expect(style).not.toBe(fallback);
    expect(['rings', 'band', 'stripes', 'foil', 'split']).toContain(style.motif);
    [style.bg, style.ink, style.trim, style.accent].forEach(color => expect(color).toMatch(/^#[0-9a-f]{6}$/));
  });
  // Straight apostrophes typed by a person find the same card.
  expect(loyaltyCardStyle("Max's All Access")).toBe(loyaltyCardStyle('Max’s All Access'));
});

test('card text stays readable on the card colour and on the motif it crosses (WCAG 4.5:1)', () => {
  providers.forEach(name => {
    const style = loyaltyCardStyle(name);
    expect([name, contrast(style.ink, style.bg) >= 4.5]).toEqual([name, true]);
    // Stripes sit below the text; every other motif can sit behind it.
    if (style.motif !== 'stripes') expect([name, contrast(style.ink, style.accent) >= 4.5]).toEqual([name, true]);
  });
});

test('logos come only from the curated list, and only for merchants marked with that domain', () => {
  providers.forEach(name => {
    const style = loyaltyCardStyle(name);
    const url = loyaltyLogoUrl(name);
    if (style.logo) expect([name, url]).toEqual([name, expect.stringContaining(`domain=${encodeURIComponent(style.logo)}`)]);
    else expect([name, url]).toEqual([name, '']);
  });
});

test('the layout: program title (the person’s own name wins), motif, short date and no gradients or artwork', () => {
  const html = renderToStaticMarkup(<LoyaltyCardFace card={{ type: 'membership', name: 'Jollibee', program: 'Jollibee', memberNumber: '99887766', points: '40', expiryDate: '2027-06-30' }} />);
  expect(html).toContain('data-motif="split"');
  expect(html).toContain('>Happy Plus<');
  expect(html).toContain('loyalty-card-expiry-label');
  expect(html).toContain('06/27');
  expect(html).not.toMatch(/gradient|<img[^>]+(?!google)\.(png|jpe?g|svg)/);
  const own = renderToStaticMarkup(<LoyaltyCardFace card={{ type: 'membership', name: 'Jollibee', program: 'Family Card', points: '0' }} />);
  expect(own).toContain('>Family Card<');
  expect(own).not.toContain('Happy Plus');
});
