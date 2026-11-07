'use strict';

async function getPlan(admin, userId) {
  const { data, error } = await admin.rpc('movo_plan_status', { p_user_id: userId });
  if (error || !data) throw new Error('plan_status_unavailable');
  return data;
}
async function hasPlan(admin, userId, minimum = 'pro') {
  const plan = await getPlan(admin, userId);
  return plan.active === true && Date.parse(plan.expiresAt) > Date.now()
    && (minimum === 'pro_plus' ? plan.tier === 'pro_plus' : ['pro', 'pro_plus'].includes(plan.tier));
}
module.exports = { getPlan, hasPlan };
