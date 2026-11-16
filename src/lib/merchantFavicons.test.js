import { merchantLogoUrl } from './merchantFavicons';

const domainOf = (u) => new URL(u).searchParams.get('domain');

test('matches curated merchants at the start of the line, as whole words', () => {
  expect(domainOf(merchantLogoUrl('Jollibee - SM North'))).toBe('jollibee.com');
  expect(domainOf(merchantLogoUrl('grab'))).toBe('grab.com');
  expect(domainOf(merchantLogoUrl('GrabFood order'))).toBe('grab.com');
  expect(domainOf(merchantLogoUrl('7-Eleven'))).toBe('7-eleven.com.ph');
});

test('falls back to subscriptions and banks', () => {
  expect(domainOf(merchantLogoUrl('Netflix'))).toBe('netflix.com');
  expect(domainOf(merchantLogoUrl('BDO'))).toBe('bdo.com.ph');
  expect(domainOf(merchantLogoUrl('PayMaya'))).toBe('maya.ph');
});

test('never guesses a domain from unknown text', () => {
  expect(merchantLogoUrl('Aling Nena Sari-sari')).toBe('');
  expect(merchantLogoUrl('Smarty Pants Cafe')).toBe('');
  expect(merchantLogoUrl('')).toBe('');
});

test('sends only the curated domain and size', () => {
  const u = new URL(merchantLogoUrl('Meralco bill 2,450'));
  expect(u.origin + u.pathname).toBe('https://www.google.com/s2/favicons');
  expect([...u.searchParams.keys()].sort()).toEqual(['domain', 'sz']);
});

test('MR DIY branches resolve to the curated domain whatever the branch suffix or letter case', () => {
  const { merchantLogoUrl } = require('./merchantFavicons');
  expect(merchantLogoUrl('Mr Diy Zmta')).toContain('domain=mrdiy.com');
  expect(merchantLogoUrl('MR. DIY SM North')).toContain('domain=mrdiy.com');
  expect(merchantLogoUrl('Mr Diyer')).toBeFalsy();
});

test('logos are requested large enough to stay sharp on phone screens', () => {
  const sizeOf = (u) => new URL(u).searchParams.get('sz');
  expect(sizeOf(merchantLogoUrl('Mang Inasal'))).toBe('128');
  expect(sizeOf(merchantLogoUrl('Mang Inasal', { size: 44 }))).toBe('128');
  expect(sizeOf(merchantLogoUrl('Mang Inasal', { size: 32 }))).toBe('32');
  // Brands whose Philippine site only publishes a tiny icon use their own main site.
  expect(domainOf(merchantLogoUrl("McDonald's Katipunan"))).toBe('mcdonalds.com');
  expect(domainOf(merchantLogoUrl('McDo - Ortigas'))).toBe('mcdonalds.com');
  expect(domainOf(merchantLogoUrl('KFC'))).toBe('kfc.com');
  expect(domainOf(merchantLogoUrl('Meralco'))).toBe('www.meralco.com.ph');
});
