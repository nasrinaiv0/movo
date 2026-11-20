'use strict';

const crypto = require('crypto');
const billing = require('../lib/iapSecurity');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return billing.json(res, 405, { error: 'method_not_allowed' });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return billing.json(res, 503, { error: 'retention_unavailable' });
  const actual = Buffer.from(req.headers.authorization || '');
  const expected = Buffer.from('Bearer ' + secret);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return billing.json(res, 401, { error: 'unauthorized' });
  }

  try {
    const db = billing.adminClient();
    await billing.rpc(db, 'movo_run_data_retention');
    return billing.json(res, 200, { completed: true });
  } catch {
    console.error('[movo-account] scheduled retention failed');
    return billing.json(res, 503, { error: 'retention_unavailable' });
  }
};
