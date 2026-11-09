'use strict';
const { send, gate, clients, pointsEnabled } = require('../lib/referralAuth');

module.exports = async function handler(req, res) {
  if (!gate(req, res, 'GET')) return;
  try {
    const session = await clients(req);
    if (session.error) return send(res, session.status, { error: session.error });
    const { data, error } = await session.admin.rpc('movo_referral_points_status', { p_user_id: session.userId });
    if (error) return send(res, 503, { error: 'referral_status_unavailable' });
    return send(res, 200, { ...data, pointsEnabled: pointsEnabled() });
  } catch { return send(res, 503, { error: 'referral_status_unavailable' }); }
};
