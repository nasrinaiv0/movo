'use strict';
const { send, gate, clients } = require('../lib/referralAuth');

const STATUS = { not_enough_points: 409, verified_account_required: 403, invalid_months: 400 };

/** Converts referral points to Pro: every 500 points is one month (1–12 months per request). The server checks the
 * balance, spends the points and queues the months after any current plan; the browser only says how many months. */
module.exports = async function handler(req, res) {
  if (!gate(req, res, 'POST', { points: true })) return;
  const months = req.body?.months;
  if (!Number.isInteger(months) || months < 1 || months > 12) return send(res, 400, { error: 'invalid_months' });
  try {
    const session = await clients(req);
    if (session.error) return send(res, session.status, { error: session.error });
    const { data, error } = await session.admin.rpc('movo_redeem_referral_points', { p_user_id: session.userId, p_months: months });
    if (error) {
      const reason = Object.keys(STATUS).find(code => String(error.message || '').includes(code));
      return send(res, reason ? STATUS[reason] : 503, { error: reason || 'redeem_unavailable' });
    }
    return send(res, 200, data);
  } catch { return send(res, 503, { error: 'redeem_unavailable' }); }
};
