"use strict";
const assert = require("node:assert/strict");
process.env.APPLE_APP_ID = "123456789";
const {
  decodeAppleTransaction,
  verifyAppleNotification,
} = require("../../api/lib/purchaseVerification");
(async () => {
  const payload = {
    bundleId: "com.nasrinai.movo",
    environment: "Production",
    productId: "com.nasrinai.movo.pro.monthly",
    expiresDate: Date.now() + 86400000,
  };
  const encode = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  for (const header of [
    { alg: "none" },
    { alg: "ES256", x5c: [] },
    { alg: "HS256", x5c: ["YXR0YWNrZXI="] },
  ]) {
    const forged =
      encode(header) +
      "." +
      encode(payload) +
      "." +
      Buffer.from("forged").toString("base64url");
    await assert.rejects(decodeAppleTransaction(forged));
    await assert.rejects(verifyAppleNotification(forged));
  }
  console.log(
    "PASS: real Apple verifier rejects unsigned, missing-chain and substituted-algorithm payloads",
  );
})().catch(() => {
  console.error("FAIL: Apple crypto boundary");
  process.exitCode = 1;
});
