"use strict";
const {
  verifyAppleNotification,
  decodeAppleTransaction,
  verifyApple,
  getProduct,
  appleEntitlement,
} = require("../lib/purchaseVerification");
const S = require("../lib/iapSecurity");
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return S.json(res, 405, { error: "method_not_allowed" });
  }
  try {
    const input = S.body(S.appleSchema, req);
    const event = await verifyAppleNotification(input.signedPayload);
    if (
      typeof event.notificationUUID !== "string" ||
      event.notificationUUID.length > 200 ||
      !event.notificationUUID
    )
      throw new Error("invalid_request");
    const db = S.adminClient();
    if (await S.duplicate(db, "apple", event.notificationUUID))
      return S.json(res, 200, { received: true, duplicate: true });
    if (!event.data?.signedTransactionInfo) {
      if (event.notificationType === "TEST")
        return S.json(res, 200, { received: true });
      throw new Error("invalid_request");
    }
    const jws = event.data.signedTransactionInfo;
    const { transaction: tx } = await decodeAppleTransaction(jws);
    const key = String(tx.originalTransactionId || "");
    if (!key) throw new Error("invalid_request");
    await S.lease(db, "apple", key, async (fence) => {
      const existing = await S.owner(db, "apple", key);
      const revoked = ["REFUND", "REVOKE"].includes(event.notificationType);
      let verified;
      if (existing)
        verified = revoked
          ? appleEntitlement(tx, "production", existing.user_id)
          : await verifyApple(jws, existing.user_id);
      else {
        if (!revoked) throw new Error("iap_owner_unknown");
        if (!getProduct(tx.productId) || !tx.transactionId)
          throw new Error("invalid_request");
        verified = {
          platform: "apple",
          storeSubscriptionKey: key,
          storeTransactionId: String(tx.transactionId),
          environment: "production",
        };
      }
      // Turning off auto-renew is not expiration or revocation. Honor
      // verified paid time; a newer notification can re-enable renewal.
      if (event.notificationType === "DID_CHANGE_RENEWAL_STATUS" &&
          event.subtype === "AUTO_RENEW_DISABLED" && verified.status === "active") {
        verified.status = "canceled";
      }
      // The signed notification time orders status transitions; the underlying
      // transaction might have been signed before the cancellation request.
      verified.eventAt = new Date(event.signedDate).toISOString();
      if (revoked) {
        verified.status = "revoked";
        verified.paidVerified = false;
      }
      await S.commit(
        db,
        existing?.user_id || null,
        verified,
        fence,
        event.notificationUUID,
      );
    });
    return S.json(res, 200, { received: true });
  } catch (error) {
    return S.failure(res, error);
  }
};
