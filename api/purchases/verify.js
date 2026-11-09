"use strict";
const crypto = require("crypto");
const {
  verifyApple,
  verifyGoogle,
  decodeAppleTransaction,
} = require("../lib/purchaseVerification");
const S = require("../lib/iapSecurity");
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return S.json(res, 405, { error: "method_not_allowed" });
  }
  try {
    const input = S.body(S.purchaseSchema, req);
    const bearer = /^Bearer ([^\s]{1,8192})$/.exec(
      req.headers.authorization || "",
    )?.[1];
    if (!bearer) throw new Error("unauthorized");
    const db = S.adminClient();
    const { data, error } = await db.auth.getUser(bearer);
    if (error || !data?.user?.id) throw new Error("unauthorized");
    const user = data.user.id;
    if (!(await S.rpc(db, "movo_iap_rate_limit", { p_user_id: user })))
      throw new Error("rate_limited");
    const key =
      input.platform === "apple"
        ? String(
            (await decodeAppleTransaction(input.jwsRepresentation)).transaction
              .originalTransactionId,
          )
        : crypto.createHash("sha256").update(input.purchaseToken).digest("hex");
    const result = await S.lease(db, input.platform, key, async (fence) => {
      const verified =
        input.platform === "apple"
          ? await verifyApple(input.jwsRepresentation, user)
          : await verifyGoogle(
              input.purchaseToken,
              input.productIdentifier,
              user,
            );
      if (verified.storeSubscriptionKey !== key)
        throw new Error("invalid_request");
      return S.commit(db, user, verified, fence);
    });
    const acknowledged = input.platform === "google" ? await S.acknowledge(db, key) : false;
    // Return committed DB state, never the pre-commit candidate that a tombstone rejected.
    return S.json(res, 200, {
      verified: true,
      ...result,
      acknowledged:
        acknowledged === true && ["active", "grace_period"].includes(result.status),
    });
  } catch (error) {
    return S.failure(res, error);
  }
};
