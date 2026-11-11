'use strict';
// Never return secret values or missing-key details from a public endpoint.
function billingConfigurationIssues(env = process.env, platform = 'all') {
  // Per-provider checks keep Google Play independent of App Store credentials.
  if (!['all', 'apple', 'google'].includes(platform)) return ['platform'];
  const checkApple = platform === 'all' || platform === 'apple';
  const checkGoogle = platform === 'all' || platform === 'google';
  const issues = [];
  const required = ['SUPABASE_SERVICE_ROLE_KEY',
    ...(checkApple ? ['APPLE_IAP_SIGNING_KEY', 'APPLE_IAP_KEY_ID', 'APPLE_IAP_ISSUER_ID'] : []),
    ...(checkGoogle ? ['GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL'] : [])];
  for (const key of required) if (!String(env[key] || '').trim()) issues.push(key);
  if (checkApple) {
    const appId = Number(env.APPLE_APP_ID);
    if (!Number.isSafeInteger(appId) || appId <= 0) issues.push('APPLE_APP_ID');
  }
  if (checkGoogle) {
    if (!/^https:\/\//.test(env.GOOGLE_PLAY_RTDN_AUDIENCE || '')) issues.push('GOOGLE_PLAY_RTDN_AUDIENCE');
    if (!/^projects\/[^/\s]+\/subscriptions\/[^/\s]+$/.test(env.GOOGLE_PLAY_RTDN_SUBSCRIPTION || '')) issues.push('GOOGLE_PLAY_RTDN_SUBSCRIPTION');
  }
  if (checkGoogle) {
    try {
      const credentials = JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || 'null');
      if (!credentials || typeof credentials.client_email !== 'string' || !credentials.client_email.includes('@') || typeof credentials.private_key !== 'string' || !credentials.private_key.includes('PRIVATE KEY')) throw new Error();
    } catch { issues.push('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON'); }
  }
  if (!/^[a-f0-9]{64}$/i.test(env.MOVO_IAP_TOKEN_ENCRYPTION_KEY || '')) issues.push('MOVO_IAP_TOKEN_ENCRYPTION_KEY');
  if (typeof env.CRON_SECRET !== 'string' || env.CRON_SECRET.length < 32) issues.push('CRON_SECRET');
  if (!/^https:\/\//.test(env.SUPABASE_URL || env.REACT_APP_SUPABASE_URL || '')) issues.push('SUPABASE_URL');
  return issues;
}
module.exports = { billingConfigurationIssues };
