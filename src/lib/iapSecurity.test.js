/** @jest-environment node */
const crypto = require("crypto");
jest.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: jest.fn(), GoogleAuth: jest.fn() },
    androidpublisher: jest.fn(),
  },
}));
jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));
const S = require("../../api/lib/iapSecurity");
describe("IAP request boundary and encrypted acknowledgement outbox", () => {
  afterEach(() => delete process.env.MOVO_IAP_TOKEN_ENCRYPTION_KEY);
  test("rejects client tier, user, expiry and platform confusion", () => {
    const valid = {
      platform: "google",
      purchaseToken: "token",
      productIdentifier: "known",
    };
    expect(S.purchaseSchema.safeParse(valid).success).toBe(true);
    for (const extra of [
      { tier: "pro_plus" },
      { userId: "victim" },
      { expiresAt: "2099-01-01" },
      { jwsRepresentation: "jws" },
    ])
      expect(S.purchaseSchema.safeParse({ ...valid, ...extra }).success).toBe(
        false,
      );
    expect(
      S.purchaseSchema.safeParse({ ...valid, purchaseToken: "x".repeat(4097) })
        .success,
    ).toBe(false);
  });
  test("requires RTDN package and one event kind", () => {
    const base = {
      version: "1",
      packageName: S.BUNDLE_ID,
      eventTimeMillis: String(Date.now()),
      testNotification: { version: "1" },
    };
    expect(S.rtdnSchema.safeParse(base).success).toBe(true);
    expect(
      S.rtdnSchema.safeParse({ ...base, packageName: undefined }).success,
    ).toBe(false);
    expect(
      S.rtdnSchema.safeParse({
        ...base,
        subscriptionNotification: {
          version: "1",
          notificationType: 12,
          purchaseToken: "t",
        },
      }).success,
    ).toBe(false);
  });
  test("encrypts tokens and rejects ciphertext substitution and tampering", () => {
    process.env.MOVO_IAP_TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
    const token = "private-google-purchase-token";
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const encrypted = S.encryptToken(token, hash);
    expect(encrypted).not.toContain(token);
    expect(S.decryptToken(encrypted, hash)).toBe(token);
    expect(() => S.decryptToken(encrypted, "cd".repeat(32))).toThrow();
    const bytes = Buffer.from(encrypted, "base64");
    bytes[29] ^= 1;
    expect(() => S.decryptToken(bytes.toString("base64"), hash)).toThrow();
  });
  test("fails closed without encryption configuration", () => {
    expect(() => S.encryptToken("token", "hash")).toThrow(
      "iap_ack_not_configured",
    );
  });
  test("never includes raw store SDK errors in client responses", () => {
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    S.failure(res, new Error("GET /tokens/secret-token failed stack trace"));
    expect(res.status).toHaveBeenCalledWith(503);
    expect(
      JSON.stringify(res.json.mock.calls) + JSON.stringify(spy.mock.calls),
    ).not.toContain("secret-token");
    spy.mockRestore();
  });
});
