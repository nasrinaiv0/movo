import { INSTITUTIONS, searchInstitutions, institutionLogoUrl } from './institutions';

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

  test('resolves owner-approved logos by name or alias, never for unknown names', () => {
    expect(new URL(institutionLogoUrl('BDO')).searchParams.get('domain')).toBe('bdo.com.ph');
    expect(new URL(institutionLogoUrl('China Bank')).searchParams.get('domain')).toBe('chinabank.ph');
    expect(institutionLogoUrl('My Local Credit Union')).toBe('');
  });

  test('catalog entries have stable ids and country metadata', () => {
    expect(INSTITUTIONS.length).toBeGreaterThanOrEqual(10);
    expect(INSTITUTIONS.every(item => item.id && item.country && item.name && Array.isArray(item.aliases))).toBe(true);
  });
});

describe('expanded institution list', () => {
  const { INSTITUTIONS, INSTITUTION_COUNTRIES, searchInstitutions, institutionLogoUrl } = require('./institutions');
  test('every listed bank, e-wallet and lender has a curated logo domain', () => {
    const missing = INSTITUTIONS.filter(i => !institutionLogoUrl(i.name)).map(i => `${i.country}:${i.name}`);
    expect(missing).toEqual([]);
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
    expect(new URL(institutionLogoUrl('EastWest Bank')).searchParams.get('domain')).toBe('eastwestbanker.com');
  });
});
