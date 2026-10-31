import { getSubscriptionFaviconEntry, getSubscriptionFaviconUrl, SUBSCRIPTION_APP_FAVICONS } from './subscriptionAppFavicons';

describe('subscription app favicon registry', () => {
  test('contains a broad curated catalog across categories', () => {
    expect(Object.keys(SUBSCRIPTION_APP_FAVICONS).length).toBeGreaterThanOrEqual(75);
    expect(getSubscriptionFaviconEntry('Instagram')).toMatchObject({ domain: 'instagram.com', category: 'social' });
    expect(getSubscriptionFaviconEntry('Netflix')).toMatchObject({ domain: 'netflix.com', category: 'streaming' });
    expect(getSubscriptionFaviconEntry('ChatGPT')).toMatchObject({ domain: 'chatgpt.com', category: 'ai' });
  });

  test('generates a compact dynamic favicon URL from curated domain metadata', () => {
    const url = new URL(getSubscriptionFaviconUrl('Instagram'));
    expect(url.origin + url.pathname).toBe('https://www.google.com/s2/favicons');
    expect(url.searchParams.get('domain')).toBe('instagram.com');
    expect(url.searchParams.get('sz')).toBe('128');
  });

  test('unknown or manually entered services do not trigger guessed domains', () => {
    expect(getSubscriptionFaviconUrl('My Local Streaming App')).toBeNull();
    expect(getSubscriptionFaviconUrl('')).toBeNull();
    expect(getSubscriptionFaviconUrl(null)).toBeNull();
  });

  test('unsupported sizes use a safe default', () => {
    const url = new URL(getSubscriptionFaviconUrl('Netflix', { size: 999 }));
    expect(url.searchParams.get('sz')).toBe('128');
  });

  test('every catalog entry has a domain and category', () => {
    for (const entry of Object.values(SUBSCRIPTION_APP_FAVICONS)) {
      expect(entry.domain).toBeTruthy();
      expect(entry.category).toBeTruthy();
    }
  });
});
