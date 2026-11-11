import { MERCHANT_FAVICONS } from './merchantFavicons';
import { INSTITUTION_FAVICONS } from './institutionFavicons';
import { SUBSCRIPTION_APP_FAVICONS } from './subscriptionAppFavicons';
import { merchantLogoUrl } from './merchantFavicons';

const domainOf = (u) => new URL(u).searchParams.get('domain');
const approve = (entry, fn) => { const previous=entry.reviewStatus; try { entry.reviewStatus='APPROVED_BY_COUNSEL'; fn(); } finally { if(previous===undefined) delete entry.reviewStatus; else entry.reviewStatus=previous; } };

test('matches curated merchants at the start of the line, as whole words', () => {
  expect(merchantLogoUrl('Jollibee - SM North')).toBe('');
  expect(merchantLogoUrl('grab')).toBe('');
  approve(MERCHANT_FAVICONS.Jollibee, () => expect(domainOf(merchantLogoUrl('Jollibee - SM North'))).toBe('jollibee.com.ph'));
  approve(MERCHANT_FAVICONS.GrabFood, () => expect(domainOf(merchantLogoUrl('GrabFood order'))).toBe('grab.com'));
  approve(MERCHANT_FAVICONS['7-Eleven'], () => expect(domainOf(merchantLogoUrl('7-Eleven'))).toBe('7-eleven.com.ph'));
});

test('falls back to subscriptions and banks', () => {
  expect(merchantLogoUrl('Netflix')).toBe('');
  expect(merchantLogoUrl('BDO')).toBe('');
  approve(SUBSCRIPTION_APP_FAVICONS.Netflix, () => expect(domainOf(merchantLogoUrl('Netflix'))).toBe('netflix.com'));
  approve(INSTITUTION_FAVICONS['BDO Unibank'], () => expect(domainOf(merchantLogoUrl('BDO'))).toBe('bdo.com.ph'));
});

test('never guesses a domain from unknown text', () => {
  expect(merchantLogoUrl('Aling Nena Sari-sari')).toBe('');
  expect(merchantLogoUrl('Smarty Pants Cafe')).toBe('');
  expect(merchantLogoUrl('')).toBe('');
});

test('sends only the curated domain and size', () => {
  expect(merchantLogoUrl('Meralco bill 2,450')).toBe('');
  approve(MERCHANT_FAVICONS.Meralco, () => {
    const u=new URL(merchantLogoUrl('Meralco bill 2,450'));
    expect(u.origin + u.pathname).toBe('https://www.google.com/s2/favicons');
    expect([...u.searchParams.keys()].sort()).toEqual(['domain', 'sz']);
  });
});


test('legacy owner approval does not authorize remote merchant icon',()=>{ MERCHANT_FAVICONS.Jollibee.reviewStatus='APPROVED_BY_OWNER'; try { expect(merchantLogoUrl('Jollibee')).toBe(''); } finally { delete MERCHANT_FAVICONS.Jollibee.reviewStatus; } });
