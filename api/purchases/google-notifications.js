"use strict";
const crypto = require("crypto");
const { google } = require("googleapis");
const { verifyGoogle } = require("../lib/purchaseVerification");
const S = require("../lib/iapSecurity");
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return S.json(res, 405, { error: "method_not_allowed" });
  }
  try {
    const audience = process.env.GOOGLE_PLAY_RTDN_AUDIENCE;
    const email = process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL;
    const subscription = process.env.GOOGLE_PLAY_RTDN_SUBSCRIPTION;
    if (!audience || !email || !subscription)
      throw new Error("iap_unavailable");
    const bearer = /^Bearer ([^\s]{1,8192})$/.exec(
      req.headers.authorization || "",
    )?.[1];
    if (!bearer) throw new Error("unauthorized");
    let claims;
    try {
      claims = (
        await new google.auth.OAuth2().verifyIdToken({
          idToken: bearer,
          audience,
        })
      ).getPayload();
    } catch {
      throw new Error("unauthorized");
    }
    if (
      !claims ||
      claims.email_verified !== true ||
      claims.email !== email ||
      claims.aud !== audience ||
      !["https://accounts.google.com", "accounts.google.com"].includes(
        claims.iss,
      )
    )
      throw new Error("unauthorized");
    const input = S.body(S.pubsubSchema, req);
    if (input.subscription !== subscription) throw new Error("unauthorized");
    const db = S.adminClient();
    if (await S.duplicate(db, "google", input.message.messageId))
      return S.json(res, 200, { received: true, duplicate: true });
    let raw;
    try {
      raw = JSON.parse(
        Buffer.from(input.message.data, "base64").toString("utf8"),
      );
    } catch {
      throw new Error("invalid_request");
    }
    const parsed = S.rtdnSchema.safeParse(raw);
    if (!parsed.success) throw new Error("invalid_request");
    const event = parsed.data;
    if (event.testNotification) return S.json(res, 200, { received: true });
    const token =
      event.subscriptionNotification?.purchaseToken ||
      event.voidedPurchaseNotification.purchaseToken;
    const key = crypto.createHash("sha256").update(token).digest("hex");
    await S.lease(db, "google", key, async (fence) => {
      let existing = await S.owner(db, "google", key);
      const revoked =
        !!event.voidedPurchaseNotification ||
        event.subscriptionNotification?.notificationType === 12;
      if (!existing) {
        const { data: current } =
          await S.publisher().purchases.subscriptionsv2.get(
            { packageName: S.BUNDLE_ID, token },
            { timeout: 15000 },
          );
        // An unknown-owner test token has no account to award. Wait for
        // authenticated client verification; never invent a paid owner.
        if (current.testPurchase) return { ignoredUnclaimedTest: true };
        if (current.linkedPurchaseToken) {
          existing = await S.owner(
            db,
            "google",
            crypto
              .createHash("sha256")
              .update(current.linkedPurchaseToken)
              .digest("hex"),
          );
          if (existing)
            existing.product_id = current.lineItems?.find((item) =>
              require("../lib/purchaseVerification").getProduct(item.productId),
            )?.productId;
        }
      }
      let verified;
      if (existing)
        verified = await verifyGoogle(token, null, existing.user_id, { skipPaymentCheck: revoked });
      else {
        // Even revocations must query server truth; do not turn an unauthenticated client claim into a tombstone.
        await S.publisher().purchases.subscriptionsv2.get(
          { packageName: S.BUNDLE_ID, token },
          { timeout: 15000 },
        );
        if (!revoked) throw new Error("iap_owner_unknown");
        verified = {
          platform: "google",
          storeSubscriptionKey: key,
          storeTransactionId: key,
          environment: "production",
        };
      }
      if (revoked) {
        verified.status = "revoked";
        verified.paidVerified = false;
        verified.needsAcknowledgement = false;
        verified.eventAt = new Date(
          Number(event.eventTimeMillis),
        ).toISOString();
      }
      await S.commit(
        db,
        existing?.user_id || null,
        verified,
        fence,
        input.message.messageId,
      );
    });
    // Durable outbox also retries after a process crash or a duplicate delivery.
    await S.acknowledge(db, key);
    return S.json(res, 200, { received: true });
  } catch (error) {
    return S.failure(res, error);
  }
};
