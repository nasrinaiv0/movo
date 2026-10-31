import { getSubscriptionFaviconEntry, getSubscriptionFaviconUrl, SUBSCRIPTION_APP_FAVICONS } from './subscriptionAppFavicons';

describe('subscription app favicon registry', () => {
  test('contains a broad curated catalog across categories', () => {
    expect(Object.keys(SUBSCRIPTION_APP_FAVICONS).length).toBeGreaterThanOrEqual(75);
    expect(getSubscriptionFaviconEntry('Instagram')).toMatchObject({ domain: 'instagram.com', category: 'social' });
    expect(getSubscriptionFaviconEntry('Netflix')).toMatchObject({ domain: 'netflix.com', category: 'streaming' });
    expect(getSubscriptionFaviconEntry('ChatGPT')).toMatchObject({ domain: 'chatgpt.com', category: 'ai' });
  });

  test('fails closed for known providers until provider-specific review is recorded', () => {
    expect(getSubscriptionFaviconUrl('Instagram')).toBeNull();
    expect(getSubscriptionFaviconUrl('Netflix')).toBeNull();
  });

  test('generates a compact URL only after the exact entry has an approved review status', () => {
    const entry = SUBSCRIPTION_APP_FAVICONS.Instagram;
    const previousStatus = entry.reviewStatus;
    try {
      entry.reviewStatus = 'APPROVED_POLICY_REVIEW';
      const url = new URL(getSubscriptionFaviconUrl('Instagram'));
      expect(url.origin + url.pathname).toBe('https://www.google.com/s2/favicons');
      expect(url.searchParams.get('domain')).toBe('instagram.com');
      expect(url.searchParams.get('sz')).toBe('128');
    } finally {
      if (previousStatus === undefined) delete entry.reviewStatus;
      else entry.reviewStatus = previousStatus;
    }
  });

  test('unknown or manually entered services do not trigger guessed domains', () => {
    expect(getSubscriptionFaviconUrl('My Local Streaming App')).toBeNull();
    expect(getSubscriptionFaviconUrl('')).toBeNull();
    expect(getSubscriptionFaviconUrl(null)).toBeNull();
  });

  test('unsupported sizes use a safe default after approval', () => {
    const entry = SUBSCRIPTION_APP_FAVICONS.Netflix;
    const previousStatus = entry.reviewStatus;
    try {
      entry.reviewStatus = 'APPROVED_BY_COUNSEL';
      const url = new URL(getSubscriptionFaviconUrl('Netflix', { size: 999 }));
      expect(url.searchParams.get('sz')).toBe('128');
    } finally {
      if (previousStatus === undefined) delete entry.reviewStatus;
      else entry.reviewStatus = previousStatus;
    }
  });

  test('every catalog entry has a domain and category and remains blocked until reviewed', () => {
    for (const entry of Object.values(SUBSCRIPTION_APP_FAVICONS)) {
      expect(entry.domain).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.reviewStatus).toBeUndefined();
    }
  });
});
