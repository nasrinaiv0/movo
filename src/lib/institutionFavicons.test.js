import { getInstitutionFaviconEntry, getInstitutionFaviconUrl, INSTITUTION_FAVICONS } from './institutionFavicons';

describe('institution favicon registry', () => {
  test('maps a known institution name to its curated domain metadata', () => {
    expect(getInstitutionFaviconEntry('BDO Unibank')).toMatchObject({
      domain: 'bdo.com.ph',
      countryCode: 'PH',
    });
  });

  test('owner approval enables curated institutions; a BLOCKED entry stays off', () => {
    expect(new URL(getInstitutionFaviconUrl('BDO Unibank')).searchParams.get('domain')).toBe('bdo.com.ph');
    expect(new URL(getInstitutionFaviconUrl('bpi')).searchParams.get('domain')).toBe('bpi.com.ph');
    const entry = INSTITUTION_FAVICONS.BPI;
    try {
      entry.reviewStatus = 'BLOCKED';
      expect(getInstitutionFaviconUrl('BPI')).toBeNull();
    } finally {
      delete entry.reviewStatus;
    }
  });

  test('generates a dynamic favicon URL only after the exact entry has an approved review status', () => {
    const entry = INSTITUTION_FAVICONS.BPI;
    const previousStatus = entry.reviewStatus;
    try {
      entry.reviewStatus = 'APPROVED_POLICY_REVIEW';
      const url = new URL(getInstitutionFaviconUrl('BPI'));
      expect(url.origin + url.pathname).toBe('https://www.google.com/s2/favicons');
      expect(url.searchParams.get('domain')).toBe('bpi.com.ph');
      expect(url.searchParams.get('sz')).toBe('128');
    } finally {
      if (previousStatus === undefined) delete entry.reviewStatus;
      else entry.reviewStatus = previousStatus;
    }
  });

  test('returns null for unknown/manual names instead of guessing a domain', () => {
    expect(getInstitutionFaviconUrl('My Local Credit Union')).toBeNull();
  });

  test('does not return a favicon for an institution from another selected country', () => {
    expect(getInstitutionFaviconUrl('BDO Unibank', { countryCode: 'US' })).toBeNull();
  });

  test('uses a safe default when an unsupported favicon size is requested after approval', () => {
    const entry = INSTITUTION_FAVICONS.Metrobank;
    const previousStatus = entry.reviewStatus;
    try {
      entry.reviewStatus = 'APPROVED_POLICY_REVIEW';
      const url = new URL(getInstitutionFaviconUrl('Metrobank', { size: 999 }));
      expect(url.searchParams.get('sz')).toBe('128');
    } finally {
      if (previousStatus === undefined) delete entry.reviewStatus;
      else entry.reviewStatus = previousStatus;
    }
  });

  test('handles blank and non-string input safely', () => {
    expect(getInstitutionFaviconUrl('')).toBeNull();
    expect(getInstitutionFaviconUrl(null)).toBeNull();
  });

  test('every institution entry has a curated domain and country', () => {
    for (const entry of Object.values(INSTITUTION_FAVICONS)) {
      expect(entry.domain).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
      expect(entry.countryCode).toBeTruthy();
    }
  });
});
