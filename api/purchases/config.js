'use strict';
const { billingConfigurationIssues } = require('../lib/billingReadiness');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method_not_allowed' }); }
  // Unknown provider inputs fail closed; legacy requests require all providers.
  const platform = req.query?.platform ?? 'all';
  if (typeof platform !== 'string' || !['all', 'apple', 'google'].includes(platform)) {
    return res.status(400).json({ enabled: false });
  }
  const enabled = process.env.MOVO_STORE_BILLING_ENABLED === 'true'
    && billingConfigurationIssues(process.env, platform).length === 0;
  return res.status(200).json({ enabled });
};
