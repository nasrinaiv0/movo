'use strict';

const crypto = require('crypto');
const billing = require('../lib/iapSecurity');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return billing.json(res, 405, { error: 'method_not_allowed' });
  }

  // A source merge or an existing cron secret does not approve age-based deletion.
  if (process.env.MOVO_DATA_RETENTION_ENABLED !== 'true') return billing.json(res, 503, { error: 'retention_unavailable' });

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
    if (process.env.MOVO_AI_MODERATION_RETENTION_ENABLED === 'true') await billing.rpc(db, 'movo_prune_ai_moderation', { p_limit: 200 });
    return billing.json(res, 200, { completed: true });
  } catch {
    console.error('[movo-account] scheduled retention failed');
    return billing.json(res, 503, { error: 'retention_unavailable' });
  }
};
