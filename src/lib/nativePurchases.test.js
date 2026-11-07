global.TextEncoder = require('util').TextEncoder;

jest.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: jest.fn() } }));
jest.mock('@capgo/native-purchases', () => ({
  PURCHASE_TYPE: { SUBS: 'subs' },
  NativePurchases: {
    configure: jest.fn().mockResolvedValue(undefined),
    isBillingSupported: jest.fn().mockResolvedValue({ isBillingSupported: true }),
    getProducts: jest.fn().mockResolvedValue({ products: [] }),
    purchaseProduct: jest.fn(),
    restorePurchases: jest.fn().mockResolvedValue(undefined),
    getPurchases: jest.fn(),
    getUnfinishedTransactions: jest.fn().mockResolvedValue({ transactions: [] }),
    finishTransaction: jest.fn().mockResolvedValue(undefined),
    acknowledgePurchase: jest.fn().mockResolvedValue(undefined),
    manageSubscriptions: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('./supabaseClient', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('./platform', () => ({ apiUrl: (value) => value, isNativeApp: () => true }));

describe('native store purchase lifecycle', () => {
  let NativePurchases;
  let Capacitor;
  let restoreStorePurchases;
  let getStoreProducts;
  let purchaseStoreProduct;
  const session = { access_token: 'session-token', user: { id: '123e4567-e89b-42d3-a456-426614174000' } };

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
    ({ NativePurchases } = require('@capgo/native-purchases'));
    ({ Capacitor } = require('@capacitor/core'));
    ({ restoreStorePurchases, purchaseStoreProduct, getStoreProducts } = require('./nativePurchases'));
  });

  afterEach(() => jest.restoreAllMocks());

  test('restores native entitlements, verifies each purchase, then finishes the StoreKit transaction', async () => {
    Capacitor.getPlatform.mockReturnValue('ios');
    NativePurchases.getPurchases.mockResolvedValue({
      purchases: [{
        productIdentifier: 'com.nasrinai.movo.pro.monthly',
        jwsRepresentation: 'apple-signed-transaction',
        transactionId: '200000000000001',
        needsFinish: true,
      }],
    });
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ verified: true, tier: 'pro', status: 'active' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        tier: 'pro', active: true,
        entitlements: [{ status: 'active', expiresAt: new Date(Date.now() + 86400000).toISOString() }],
      }) });

    const result = await restoreStorePurchases(session);
    expect(NativePurchases.configure).toHaveBeenCalledWith({ autoFinishTransactions: false });
    expect(NativePurchases.restorePurchases).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/purchases/verify');
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      platform: 'apple', jwsRepresentation: 'apple-signed-transaction',
    });
    expect(NativePurchases.finishTransaction).toHaveBeenCalledWith({ transactionId: '200000000000001' });
    expect(result.restoredCount).toBe(1);
    expect(result.entitlement.tier).toBe('pro');
  });

  test('does not open checkout when the release gate is closed', async () => {
    Capacitor.getPlatform.mockReturnValue('ios');
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ enabled: false }) });
    await expect(purchaseStoreProduct('com.nasrinai.movo.pro.monthly', session)).rejects.toThrow('Subscriptions are not available yet');
    expect(NativePurchases.purchaseProduct).not.toHaveBeenCalled();
  });

  test('maps Google Play base-plan identifiers to configured MOVO product IDs', async () => {
    Capacitor.getPlatform.mockReturnValue('android');
    NativePurchases.getProducts.mockResolvedValue({ products: [{
      identifier: 'annual',
      planIdentifier: 'com.nasrinai.movo.proplus.annual',
      title: 'MOVO Max Annual',
      priceString: '1999.00',
    }] });
    const products = await getStoreProducts();
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      productIdentifier: 'com.nasrinai.movo.proplus.annual',
      basePlanId: 'annual',
      priceString: '1999.00',
    });
  });

  test('purchases Google subscription with the configured base plan and avoids duplicate acknowledgement', async () => {
    Capacitor.getPlatform.mockReturnValue('android');
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: { subtle: { digest: async () => new Uint8Array(32).buffer } },
    });
    NativePurchases.purchaseProduct.mockResolvedValue({
      productIdentifier: 'com.nasrinai.movo.proplus.annual',
      purchaseToken: 'google-private-token',
      isAcknowledged: false,
    });
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: true }) }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ verified: true, acknowledged: true, tier: 'pro_plus', status: 'active' }),
    });

    const result = await purchaseStoreProduct('com.nasrinai.movo.proplus.annual', session);
    expect(NativePurchases.purchaseProduct).toHaveBeenCalledWith(expect.objectContaining({
      productIdentifier: 'com.nasrinai.movo.proplus.annual',
      productType: 'subs',
      planIdentifier: 'annual',
      autoAcknowledgePurchases: false,
    }));
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(NativePurchases.acknowledgePurchase).not.toHaveBeenCalled();
    expect(result.tier).toBe('pro_plus');
  });
});
