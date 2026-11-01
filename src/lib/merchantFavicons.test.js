import { merchantLogoUrl } from './merchantFavicons';

const domainOf = (u) => new URL(u).searchParams.get('domain');

test('matches curated merchants at the start of the line, as whole words', () => {
  expect(domainOf(merchantLogoUrl('Jollibee - SM North'))).toBe('jollibee.com.ph');
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
