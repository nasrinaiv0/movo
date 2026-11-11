import { INSTITUTION_FAVICONS } from './institutionFavicons';
import { INSTITUTIONS, searchInstitutions, institutionLogoUrl, institutionLogoCandidates, cardNetworkLogoUrl } from './institutions';

describe('country-aware institution catalog', () => {
  test('returns Philippine banks for the Philippines and matches aliases', () => {
    expect(searchInstitutions('PH', 'BDO', 'bank').map(item => item.name)).toContain('BDO Unibank');
    expect(searchInstitutions('PH', 'PNB', 'bank').map(item => item.name)).toContain('Philippine National Bank');
  });

  test('filters institutions by selected country', () => {
    expect(searchInstitutions('PH', 'Chase', 'bank')).toHaveLength(0);
    expect(searchInstitutions('US', 'Chase', 'bank').map(item => item.name)).toContain('Chase');
  });

  test('keeps e-wallets categorized separately from banks', () => {
    expect(searchInstitutions('PH', 'GCash', 'bank')).toHaveLength(0);
    expect(searchInstitutions('PH', 'GCash', 'e_wallet').map(item => item.kind)).toEqual(['ewallet']);
    expect(searchInstitutions('PH', 'Maya', 'e_wallet').map(item => item.name)).toContain('Maya');
  });

  test('supports case-insensitive search and does not require a catalog match for manual entry', () => {
    expect(searchInstitutions('PH', 'metroBANK', 'bank').map(item => item.name)).toContain('Metrobank');
    expect(searchInstitutions('PH', 'My local cooperative', 'bank')).toHaveLength(0);
  });

  test('unreviewed banks, aliases and manual entries show local fallback', () => {
    expect(institutionLogoUrl('BDO')).toBe('');
    expect(institutionLogoUrl('China Bank')).toBe('');
    expect(institutionLogoUrl('My Local Credit Union')).toBe('');
  });

  test('catalog entries have stable ids and country metadata', () => {
    expect(INSTITUTIONS.length).toBeGreaterThanOrEqual(10);
    expect(INSTITUTIONS.every(item => item.id && item.country && item.name && Array.isArray(item.aliases))).toBe(true);
  });
});

describe('expanded institution list', () => {
  const { INSTITUTIONS, INSTITUTION_COUNTRIES, searchInstitutions, institutionLogoUrl } = require('./institutions');
  test('unreviewed institutions never initiate external icon requests', () => {
    expect(INSTITUTIONS.every(i => institutionLogoUrl(i.name) === '')).toBe(true);
  });
  test('ids are unique and every country in the list is selectable', () => {
    expect(new Set(INSTITUTIONS.map(i => i.id)).size).toBe(INSTITUTIONS.length);
    for (const i of INSTITUTIONS) expect(INSTITUTION_COUNTRIES).toContain(i.country);
  });
  test('search finds new banks, digital banks, e-wallets and lenders', () => {
    expect(searchInstitutions('PH', 'east', 'bank').map(i => i.name)).toContain('EastWest Bank');
    expect(searchInstitutions('PH', 'tonik', 'bank').map(i => i.name)).toContain('Tonik');
    expect(searchInstitutions('PH', 'atome', 'card').map(i => i.name)).toContain('Atome');
    expect(searchInstitutions('PH', 'shopee', 'e_wallet').map(i => i.name)).toContain('ShopeePay');
    expect(searchInstitutions('PH', 'shopee', 'bank')).toEqual([]);
    expect(searchInstitutions('MY', '', 'bank').length).toBeGreaterThanOrEqual(4);
    expect(institutionLogoUrl('EastWest Bank')).toBe('');
    expect(institutionLogoUrl('Asia United Bank (AUB)')).toBe('');
    expect(institutionLogoUrl('AUB')).toBe('');
  });
});


test('requires explicit rights review for bank card products and aliases', () => {
  expect(institutionLogoUrl('AUB Platinum Credit Card')).toBe('');
  const entry=INSTITUTION_FAVICONS['Asia United Bank (AUB)'];
  const saved=entry.reviewStatus;
  try { entry.reviewStatus='APPROVED_BY_COUNSEL';
    expect(new URL(institutionLogoUrl('AUB Platinum Credit Card')).searchParams.get('domain')).toBe('aub.com.ph');
    expect(institutionLogoCandidates('Asia United Bank (AUB) Credit')).toHaveLength(1);
  } finally { if(saved === undefined) delete entry.reviewStatus; else entry.reviewStatus=saved; }
});

test('never loads payment-network artwork lacking rights review', () => {
  expect(cardNetworkLogoUrl('Mastercard')).toBe('');
  expect(cardNetworkLogoUrl('American Express')).toBe('');
  expect(cardNetworkLogoUrl('Unknown Network')).toBe('');
});
