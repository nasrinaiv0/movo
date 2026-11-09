"use strict";
const crypto = require("crypto");
const { z } = require("zod");
const { createClient } = require("@supabase/supabase-js");
const { google } = require("googleapis");
const BUNDLE_ID = "com.nasrinai.movo";
const purchaseSchema = z.discriminatedUnion("platform", [
  z
    .object({
      platform: z.literal("apple"),
      jwsRepresentation: z.string().min(1).max(20000),
    })
    .strict(),
  z
    .object({
      platform: z.literal("google"),
      purchaseToken: z.string().min(1).max(4096),
      productIdentifier: z.string().min(1).max(200),
    })
    .strict(),
]);
const appleSchema = z
  .object({ signedPayload: z.string().min(1).max(100000) })
  .strict();
const pubsubSchema = z
  .object({
    message: z
      .object({
        messageId: z.string().min(1).max(200),
        data: z.string().min(1).max(100000),
        publishTime: z.string().optional(),
        attributes: z.record(z.string().max(256), z.string().max(4096)).optional(),
        orderingKey: z.string().optional(),
      })
      .strict(),
    subscription: z.string().min(1).max(500),
    deliveryAttempt: z.number().int().optional(),
  })
  .strict();
const rtdnSchema = z
  .object({
    version: z.string(),
    packageName: z.literal(BUNDLE_ID),
    eventTimeMillis: z.string().regex(/^\d{1,16}$/),
    subscriptionNotification: z
      .object({
        version: z.string(),
        notificationType: z.number().int(),
        purchaseToken: z.string().min(1).max(4096),
        subscriptionId: z.string().max(200).optional(),
      })
      .strict()
      .optional(),
    voidedPurchaseNotification: z
      .object({
        purchaseToken: z.string().min(1).max(4096),
        orderId: z.string(),
        productType: z.number().int(),
        refundType: z.number().int().optional(),
      })
      .strict()
      .optional(),
    testNotification: z.object({ version: z.string() }).strict().optional(),
  })
  .strict()
  .refine(
    (v) =>
      [
        v.subscriptionNotification,
        v.voidedPurchaseNotification,
        v.testNotification,
      ].filter(Boolean).length === 1,
  );
function body(schema, req) {
  if (Buffer.byteLength(JSON.stringify(req.body || null), "utf8") > 110000)
    throw new Error("invalid_request");
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new Error("invalid_request");
  return parsed.data;
}
function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("iap_unavailable");
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
async function rpc(db, name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error)
    throw new Error(
      ["purchase_already_linked", "iap_busy", "iap_lease_expired"].find((c) =>
        String(error.message).includes(c),
      ) || "iap_database_unavailable",
    );
  return data;
}
function json(res, status, value) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(value);
}
function failure(res, error) {
  const code = error?.message;
  const invalid = [
    "invalid_request",
    "purchase_account_mismatch",
    "sandbox_purchase_rejected",
    "apple_transaction_verification_failed",
    "apple_notification_verification_failed",
    "apple_bundle_mismatch",
    "google_product_mismatch",
    "unknown_store_product",
    "invalid_google_purchase_token",
    "invalid_apple_transaction",
    "unsupported_apple_product_type",
  ];
  const status =
    code === "unauthorized"
      ? 401
      : code === "purchase_already_linked"
        ? 409
        : code === "rate_limited"
          ? 429
          : invalid.includes(code)
            ? 400
            : 503;
  if (status === 429 || status === 503) res.setHeader("Retry-After", "30");
  // Never log SDK error messages: they may contain URLs with raw purchase tokens.
  console.warn("[movo-iap]", {
    code: status === 503 ? "service_unavailable" : code,
  });
  return json(res, status, {
    error: status === 503 ? "verification_unavailable" : code,
  });
}
async function lease(db, platform, key, fn) {
  const fence = await rpc(db, "movo_iap_acquire", {
    p_platform: platform,
    p_key: key,
  });
  try {
    return await fn(fence);
  } finally {
    // Fence predicate prevents an expired request from releasing a successor's lock.
    await db
      .from("movo_iap_leases")
      .delete()
      .eq("platform", platform)
      .eq("subscription_key", key)
      .eq("fence", fence);
  }
}
async function duplicate(db, platform, id) {
  const { data, error } = await db
    .from("movo_iap_events")
    .select("event_id")
    .eq("platform", platform)
    .eq("event_id", id)
    .maybeSingle();
  if (error) throw new Error("iap_database_unavailable");
  return !!data;
}
async function owner(db, platform, key) {
  const { data, error } = await db
    .from("movo_store_entitlements")
    .select("user_id,product_id")
    .eq("platform", platform)
    .eq("store_subscription_key", key)
    .maybeSingle();
  if (error) throw new Error("iap_database_unavailable");
  return data;
}
function encryptionKey() {
  const value = process.env.MOVO_IAP_TOKEN_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("iap_ack_not_configured");
  return Buffer.from(value, "hex");
}
function encryptToken(token, hash) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(hash));
  const bytes = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString("base64");
}
function decryptToken(value, hash) {
  const data = Buffer.from(value, "base64");
  const cipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    data.subarray(0, 12),
  );
  cipher.setAAD(Buffer.from(hash));
  cipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([
    cipher.update(data.subarray(28)),
    cipher.final(),
  ]).toString("utf8");
}
function publisher() {
  const credentials = JSON.parse(
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || "null",
  );
  if (!credentials) throw new Error("iap_unavailable");
  return google.androidpublisher({
    version: "v3",
    auth: new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    }),
  });
}
async function acknowledge(db, hash) {
  const { data: job, error } = await db
    .from("movo_iap_ack_jobs")
    .select("*")
    .eq("purchase_token_hash", hash)
    .maybeSingle();
  if (error) throw new Error("iap_database_unavailable");
  if (!job || job.completed_at) return true;
  const token = decryptToken(job.encrypted_token, hash);
  const api = publisher();
  // Idempotent recovery when Play accepted acknowledgement but the DB update failed.
  const { data } = await api.purchases.subscriptionsv2.get(
    { packageName: BUNDLE_ID, token },
    { timeout: 15000 },
  );
  if (
    ![
      "SUBSCRIPTION_STATE_ACTIVE",
      "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    ].includes(data.subscriptionState)
  ) {
    const deferred = await db
      .from("movo_iap_ack_jobs")
      .update({ next_attempt_at: new Date(Date.now() + 3600000).toISOString() })
      .eq("purchase_token_hash", hash);
    if (deferred.error) throw new Error("iap_database_unavailable");
    return false;
  }
  if (data.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") {
    await api.purchases.subscriptions.acknowledge(
      {
        packageName: BUNDLE_ID,
        subscriptionId: job.product_id,
        token,
        requestBody: {},
      },
      { timeout: 15000 },
    );
  }
  const saved = await db
    .from("movo_iap_ack_jobs")
    .update({ completed_at: new Date().toISOString(), encrypted_token: "" })
    .eq("purchase_token_hash", hash);
  if (saved.error) throw new Error("iap_database_unavailable");
  return true;
}
async function commit(db, user, verified, fence, eventId = null) {
  const { purchaseToken, ...safe } = verified;
  safe.referralPointsEnabled = process.env.MOVO_REFERRAL_POINTS_ENABLED === "true";
  if (
    verified.platform === "google" &&
    verified.needsAcknowledgement &&
    ["active", "grace_period"].includes(verified.status)
  ) {
    safe.encryptedToken = encryptToken(
      purchaseToken,
      verified.purchaseTokenHash,
    );
  }
  return rpc(db, "movo_iap_commit", {
    p_user_id: user,
    p_verified: safe,
    p_fence: fence,
    p_event_id: eventId,
  });
}
module.exports = {
  BUNDLE_ID,
  purchaseSchema,
  appleSchema,
  pubsubSchema,
  rtdnSchema,
  body,
  adminClient,
  rpc,
  json,
  failure,
  lease,
  duplicate,
  owner,
  commit,
  acknowledge,
  publisher,
  encryptToken,
  decryptToken,
};
