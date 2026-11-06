'use strict';
// Fail closed until store-console, webhook and real-device release checks are signed off.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method_not_allowed' }); }
  const enabled = process.env.MOVO_STORE_BILLING_ENABLED === 'true';
  return res.status(200).json({ enabled });
};
