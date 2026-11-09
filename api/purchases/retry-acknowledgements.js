"use strict";
const crypto = require("crypto");
const S = require("../lib/iapSecurity");
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return S.json(res, 405, { error: "method_not_allowed" });
  }
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 32) throw new Error("iap_unavailable");
    const actual = Buffer.from(req.headers.authorization || "");
    const expected = Buffer.from("Bearer " + secret);
    if (
      actual.length !== expected.length ||
      !crypto.timingSafeEqual(actual, expected)
    )
      throw new Error("unauthorized");
    const db = S.adminClient();
    const { data, error } = await db
      .from("movo_iap_ack_jobs")
      .select("purchase_token_hash")
      .is("completed_at", null)
      .lte("next_attempt_at", new Date().toISOString())
      .order("next_attempt_at", { ascending: true })
      .limit(25);
    if (error) throw new Error("iap_database_unavailable");
    let failed = 0;
    await Promise.all(
      data.map(async (job) => {
        try {
          await S.acknowledge(db, job.purchase_token_hash);
        } catch {
          failed++;
          await db
            .from("movo_iap_ack_jobs")
            .update({
              next_attempt_at: new Date(Date.now() + 600000).toISOString(),
            })
            .eq("purchase_token_hash", job.purchase_token_hash);
        }
      }),
    );
    return S.json(res, failed ? 503 : 200, {
      processed: data.length - failed,
      failed,
    });
  } catch (error) {
    return S.failure(res, error);
  }
};
