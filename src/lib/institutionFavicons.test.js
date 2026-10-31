import { getInstitutionFaviconEntry, getInstitutionFaviconUrl } from './institutionFavicons';

describe('institution favicon registry', () => {
  test('maps a known institution name to its reviewed domain metadata', () => {
    expect(getInstitutionFaviconEntry('BDO Unibank')).toMatchObject({
      domain: 'bdo.com.ph',
      countryCode: 'PH',
    });
  });

  test('generates the dynamic favicon URL without exposing long URLs in components', () => {
    const url = new URL(getInstitutionFaviconUrl('BPI'));
    expect(url.origin + url.pathname).toBe('https://www.google.com/s2/favicons');
    expect(url.searchParams.get('domain')).toBe('bpi.com.ph');
    expect(url.searchParams.get('sz')).toBe('128');
  });

  test('returns null for unknown/manual names instead of guessing a domain', () => {
    expect(getInstitutionFaviconUrl('My Local Credit Union')).toBeNull();
  });

  test('does not return a favicon for an institution from another selected country', () => {
    expect(getInstitutionFaviconUrl('BDO Unibank', { countryCode: 'US' })).toBeNull();
  });

  test('uses a safe default when an unsupported favicon size is requested', () => {
    const url = new URL(getInstitutionFaviconUrl('Metrobank', { size: 999 }));
    expect(url.searchParams.get('sz')).toBe('128');
  });

  test('handles blank and non-string input safely', () => {
    expect(getInstitutionFaviconUrl('')).toBeNull();
    expect(getInstitutionFaviconUrl(null)).toBeNull();
  });
});
