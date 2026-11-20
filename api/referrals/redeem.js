'use strict';
const { send, gate, clients } = require('../lib/referralAuth');

const STATUS = {
  not_enough_points: 409,
  store_plan_active: 409,
  redemption_request_conflict: 409,
  verified_account_required: 403,
  invalid_months: 400,
  invalid_reward_tier: 400,
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function handler(req, res) {
  if (!gate(req, res, 'POST', { points: true })) return;
  if (req.headers['x-movo-referral-rewards'] !== '2') return send(res, 409, { error: 'referral_update_required' });
  const { months, tier, requestId } = req.body || {};
  if (!Number.isInteger(months) || months < 1 || months > 12) return send(res, 400, { error: 'invalid_months' });
  if (!['pro', 'pro_plus'].includes(tier)) return send(res, 400, { error: 'invalid_reward_tier' });
  if (typeof requestId !== 'string' || !uuid.test(requestId)) {
    return send(res, 400, { error: 'invalid_redemption_request' });
  }
  try {
    const session = await clients(req);
    if (session.error) return send(res, session.status, { error: session.error });
    const { data, error } = await session.admin.rpc('movo_redeem_referral_points', {
      p_user_id: session.userId, p_months: months, p_tier: tier, p_request_id: requestId,
    });
    if (error) {
      const reason = Object.keys(STATUS).find(code => String(error.message || '').includes(code));
      return send(res, reason ? STATUS[reason] : 503, { error: reason || 'redeem_unavailable' });
    }
    return send(res, 200, data);
  } catch { return send(res, 503, { error: 'redeem_unavailable' }); }
};
