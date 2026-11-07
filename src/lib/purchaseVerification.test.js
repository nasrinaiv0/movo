describe('MOVO store purchase verification', () => {
  const userId = '123e4567-e89b-42d3-a456-426614174000';
  let verifyApple;
  let verifyGoogle;
  let appAccountTokenForUser;
  let applePayload;
  let googleOrder;

  beforeEach(() => {
    jest.resetModules();
    process.env.APPLE_ROOT_CERTS_BASE64 = 'Y2VydA==';
    process.env.APPLE_APP_ID = '123456789';
    process.env.APPLE_IAP_SIGNING_KEY='test-key'; process.env.APPLE_IAP_KEY_ID='test-id'; process.env.APPLE_IAP_ISSUER_ID='test-issuer';
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'test@example.iam.gserviceaccount.com', private_key: 'test-key' });
    googleOrder = { state:'PROCESSED', lineItems:[{productId:'com.nasrinai.movo.proplus.monthly', total:{units:'1'}}] };
    applePayload = {
      bundleId: 'com.nasrinai.movo',
      productId: 'com.nasrinai.movo.pro.monthly',
      transactionId: '200000000000001',
      originalTransactionId: '200000000000000',
      appAccountToken: null,
      expiresDate: Date.now() + 86400000,
      revocationDate: null,
      type: 'Auto-Renewable Subscription',
    };
    jest.doMock('@apple/app-store-server-library', () => ({
      Environment: { PRODUCTION: 'Production', SANDBOX: 'Sandbox' },
      AppStoreServerAPIClient: class { async getTransactionInfo() { return { signedTransactionInfo: 'current-server-jws' }; } },
      SignedDataVerifier: class {
        async verifyAndDecodeTransaction() { return applePayload; }
      },
    }));
    jest.doMock('googleapis', () => ({
      google: {
        auth: { GoogleAuth: class {} },
        androidpublisher: () => ({
          orders: { get: async () => ({data:googleOrder}) },
          purchases: {
            subscriptionsv2: {
              get: async () => ({ data: {
                subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
                latestOrderId: 'GPA.1234-5678-9012-34567',
                acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
                externalAccountIdentifiers: { obfuscatedExternalAccountId: appAccountTokenForUser(userId) },
                lineItems: [{ productId: 'com.nasrinai.movo.proplus.monthly', expiryTime: new Date(Date.now() + 86400000).toISOString() }],
              } }),
            },
          },
        }),
      },
    }));
    ({ verifyApple, verifyGoogle, appAccountTokenForUser } = require('../../api/lib/purchaseVerification'));
    applePayload.appAccountToken = appAccountTokenForUser(userId);
  });

  afterEach(() => {
    delete process.env.APPLE_ROOT_CERTS_BASE64;
    delete process.env.APPLE_APP_ID;
    delete process.env.APPLE_IAP_SIGNING_KEY; delete process.env.APPLE_IAP_KEY_ID; delete process.env.APPLE_IAP_ISSUER_ID;
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    jest.dontMock('@apple/app-store-server-library');
    jest.dontMock('googleapis');
  });

  test('creates a stable non-PII UUID account token', () => {
    const token = appAccountTokenForUser(userId);
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(appAccountTokenForUser(userId)).toBe(token);
    expect(token).not.toContain(userId);
  });

  test('verifies Apple signed subscription and maps product to the server-owned tier', async () => {
    const result = await verifyApple('signed-jws', userId);
    expect(result).toMatchObject({
      platform: 'apple',
      productId: 'com.nasrinai.movo.pro.monthly',
      tier: 'pro',
      status: 'active',
      originalTransactionId: '200000000000000',
      environment: 'production',
    });
  });

  test('rejects an unbound Apple transaction', async () => {
    applePayload.appAccountToken = null;
    await expect(verifyApple('signed-jws', userId)).rejects.toThrow('purchase_account_mismatch');
  });

  test('rejects Apple transactions bound to another MOVO account', async () => {
    applePayload.appAccountToken = appAccountTokenForUser('another-user');
    await expect(verifyApple('signed-jws', userId)).rejects.toThrow('purchase_account_mismatch');
  });

  test('rejects non-subscription Apple products and mismatched bundle identifiers', async () => {
    applePayload.type = 'Non-Consumable';
    await expect(verifyApple('signed-jws', userId)).rejects.toThrow('unsupported_apple_product_type');
    applePayload.type = 'Auto-Renewable Subscription';
    applePayload.bundleId = 'com.example.other';
    await expect(verifyApple('signed-jws', userId)).rejects.toThrow('apple_bundle_mismatch');
  });

  test('verifies Google subscription token and hashes the token before persistence', async () => {
    const result = await verifyGoogle('private-google-token', 'com.nasrinai.movo.proplus.monthly', userId);
    expect(result).toMatchObject({
      platform: 'google',
      productId: 'com.nasrinai.movo.proplus.monthly',
      tier: 'pro_plus',
      status: 'active',
      needsAcknowledgement: true,
      environment: 'production',
    });
    expect(result.purchaseTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.purchaseTokenHash).not.toBe('private-google-token');
  });

  test('Apple free trials never qualify for paid referrals', async () => {
    applePayload.appAccountToken = appAccountTokenForUser(userId);
    applePayload.price = 1000; applePayload.offerDiscountType = 'FREE_TRIAL';
    expect((await verifyApple('signed',userId)).paidVerified).toBe(false);
    applePayload.offerDiscountType = undefined;
    expect((await verifyApple('signed',userId)).paidVerified).toBe(true);
  });
  test('Google zero-price, refunded and unrelated order items never qualify', async () => {
    const verify = () => verifyGoogle('token','com.nasrinai.movo.proplus.monthly',userId);
    expect((await verify()).paidVerified).toBe(true);
    googleOrder.lineItems[0].total.units='0';
    expect((await verify()).paidVerified).toBe(false);
    googleOrder.lineItems[0].total.units='1'; googleOrder.state='REFUNDED';
    expect((await verify()).paidVerified).toBe(false);
    googleOrder.state='PROCESSED'; googleOrder.lineItems[0].productId='unrelated';
    expect((await verify()).paidVerified).toBe(false);
  });

  test('rejects unknown store products', async () => {
    await expect(verifyGoogle('private-google-token', 'com.unknown.product', userId)).rejects.toThrow('unknown_store_product');
  });
});
