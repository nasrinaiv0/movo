'use strict';
const { billingConfigurationIssues } = require('../lib/billingReadiness');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method_not_allowed' }); }
  const enabled = process.env.MOVO_STORE_BILLING_ENABLED === 'true' && billingConfigurationIssues().length === 0;
  return res.status(200).json({ enabled });
};
