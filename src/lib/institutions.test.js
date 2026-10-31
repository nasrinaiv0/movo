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

  test('does not request remote institution logos until the domain has a legal review status', () => {
    expect(institutionLogoUrl('BDO Unibank')).toBe('');
  });

  test('catalog entries have stable ids and country metadata', () => {
    expect(INSTITUTIONS.length).toBeGreaterThanOrEqual(10);
    expect(INSTITUTIONS.every(item => item.id && item.country && item.name && Array.isArray(item.aliases))).toBe(true);
  });
});
