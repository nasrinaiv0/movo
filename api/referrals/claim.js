'use strict';
const { send, gate, clients } = require('../lib/referralAuth');
const { normalizeReferralCode, CLAIM_ERRORS } = require('../lib/referralCode');

const STATUS = { too_many_attempts: 429, verified_account_required: 403 };

/** Links the signed-in (new) account to the friend whose short code it entered. Never awards anything itself. */
module.exports = async function handler(req, res) {
  if (!gate(req, res, 'POST')) return;
  const code = normalizeReferralCode(req.body?.code);
  if (!code) return send(res, 400, { error: 'invalid_referral_code' });
  try {
    const session = await clients(req);
    if (session.error) return send(res, session.status, { error: session.error });
    const { data, error } = await session.admin.rpc('movo_claim_referral_code', { p_user_id: session.userId, p_code: code });
    if (error) return send(res, 503, { error: 'referral_service_unavailable' });
    if (data?.claimed !== true) {
      const reason = CLAIM_ERRORS.has(data?.error) ? data.error : 'referral_not_eligible';
      return send(res, STATUS[reason] || 409, { error: reason });
    }
    return send(res, 200, { claimed: true });
  } catch { return send(res, 503, { error: 'referral_service_unavailable' }); }
};
