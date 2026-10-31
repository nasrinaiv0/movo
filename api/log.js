const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const MAX_BODY_BYTES = 8192;
const KEY_RE = /^[a-f0-9]{32,128}$/i;
const SOURCES = new Set(['applepay', 'googlepay', 'bank', 'notification']);
function json(res, status, body) { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); return res.status(status).json(body); }
function sha256(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function cleanText(value, max) { return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max) : ''; }
function amountValue(value) { const amount = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^\d.]/g, '')); return Number.isFinite(amount) && amount > 0 && amount < 1e9 ? Math.round(amount * 100) / 100 : 0; }
function clients() {
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return null;
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  return { auth: createClient(url, anon, options), admin: createClient(url, service, options) };
}
function bearer(req) { const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || ''); return match ? match[1].trim() : ''; }
function accountFor(accounts, hint) {
  const normalized = cleanText(hint, 100).toLowerCase();
  if (!normalized) return accounts.length === 1 ? accounts[0] : null;
  const names = accounts.map((a) => ({ account: a, name: String(a.name || '').toLowerCase() }));
  const exact = names.filter((x) => x.name === normalized);
  if (exact.length === 1) return exact[0].account;
  if (exact.length > 1) return null;
  const partial = names.filter((x) => x.name && (normalized.includes(x.name) || x.name.includes(normalized)));
  if (partial.length === 1) return partial[0].account;
  if (partial.length > 1) return null;
  const institution = accounts.filter((a) => {
    const value = String(a.institution_name || '').toLowerCase();
    return value && (normalized === value || normalized.includes(value) || value.includes(normalized));
  });
  return institution.length === 1 ? institution[0] : null;
}
function idempotencyKey({ source, amount, merchant, card, occurredAt, reference }) {
  const stable = reference ? `${source}|ref:${reference.toLowerCase()}` : [source, amount.toFixed(2), merchant.toLowerCase(), card.toLowerCase(), String(Math.floor(Date.parse(occurredAt) / 60000))].join('|');
  return sha256(stable);
}
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'method_not_allowed' }); }
  if (Number(req.headers['content-length'] || 0) > MAX_BODY_BYTES) return json(res, 413, { error: 'payload_too_large' });
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) return json(res, 413, { error: 'payload_too_large' });
  const action = body.action || 'log', token = bearer(req), api = clients();
  if (!api) return json(res, 503, { error: 'automation_service_unavailable' });
  try {
    if (action === 'register') {
      const deviceKey = typeof body.deviceKey === 'string' ? body.deviceKey : '';
      if (!token || !KEY_RE.test(deviceKey)) return json(res, 400, { error: 'invalid_registration' });
      const { data: authData, error: authError } = await api.auth.auth.getUser(token);
      if (authError || !authData?.user?.id) return json(res, 401, { error: 'sign_in_required' });
      const tokenHash = sha256(deviceKey);
      const { data: existing, error: lookupError } = await api.admin.from('movo_automation_tokens').select('user_id').eq('token_hash', tokenHash).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing && existing.user_id !== authData.user.id) return json(res, 409, { error: 'key_already_registered' });
      const { error } = await api.admin.from('movo_automation_tokens').upsert({ token_hash: tokenHash, user_id: authData.user.id, label: 'iOS Shortcuts', active: true }, { onConflict: 'token_hash' });
      if (error) throw error;
      return json(res, 200, { success: true, registered: true });
    }
    if (action === 'revoke') {
      const deviceKey = typeof body.deviceKey === 'string' ? body.deviceKey : '';
      if (!token || !KEY_RE.test(deviceKey)) return json(res, 400, { error: 'invalid_revocation' });
      const { data: authData, error: authError } = await api.auth.auth.getUser(token);
      if (authError || !authData?.user?.id) return json(res, 401, { error: 'sign_in_required' });
      const { error } = await api.admin.from('movo_automation_tokens').update({ active: false }).eq('token_hash', sha256(deviceKey)).eq('user_id', authData.user.id);
      if (error) throw error;
      return json(res, 200, { success: true, revoked: true });
    }
    if (action !== 'log') return json(res, 400, { error: 'invalid_action' });
    if (!KEY_RE.test(token)) return json(res, 401, { error: 'invalid_device_key' });
    const tokenHash = sha256(token);
    const { data: registered, error: tokenError } = await api.admin.from('movo_automation_tokens').select('user_id,active').eq('token_hash', tokenHash).maybeSingle();
    if (tokenError) throw tokenError;
    if (!registered?.active) return json(res, 401, { error: 'device_not_registered' });
    const amount = amountValue(body.amount), merchant = cleanText(body.merchant, 160), card = cleanText(body.card || body.account, 100), reference = cleanText(body.reference, 120);
    const source = SOURCES.has(body.source) ? body.source : 'notification';
    if (!amount || !merchant) return json(res, 400, { error: 'invalid_transaction' });
    const parsedDate = body.occurredAt ? Date.parse(body.occurredAt) : Date.now();
    if (!Number.isFinite(parsedDate) || parsedDate < Date.now() - 366 * 86400000 || parsedDate > Date.now() + 86400000) return json(res, 400, { error: 'invalid_transaction_date' });
    const occurredAt = new Date(parsedDate).toISOString();
    const { data: accounts, error: accountsError } = await api.admin.from('financial_accounts').select('id,name,account_type,institution_name,currency,is_archived,display_order').eq('user_id', registered.user_id).eq('is_archived', false).order('display_order', { ascending: true });
    if (accountsError) throw accountsError;
    const account = accountFor(accounts || [], card);
    if (!account) return json(res, 409, { error: accounts?.length ? 'account_match_required' : 'account_required', message: accounts?.length ? 'Add the exact matching account name to the shortcut or resolve account matching in MOVO first.' : 'Add a financial account in MOVO before enabling automation.' });
    const requestId = idempotencyKey({ source, amount, merchant, card, occurredAt, reference });
    const sourceLabel = source === 'applepay' ? 'Apple Pay' : source === 'googlepay' ? 'Google Pay' : source === 'bank' ? 'bank notification' : 'notification';
    const note = [`Logged from ${sourceLabel}`, card ? `Account hint: ${card}` : '', reference ? `Ref ${reference}` : ''].filter(Boolean).join(' · ').slice(0, 1000);
    const { data: result, error: rpcError } = await api.admin.rpc('log_automation_transaction', { p_token_hash: tokenHash, p_request_id: requestId, p_user_id: registered.user_id, p_account_id: account.id, p_amount: amount, p_currency: account.currency || 'PHP', p_merchant: merchant, p_category: 'Other', p_occurred_at: occurredAt, p_note: note, p_external_reference: reference || null });
    if (rpcError) {
      if (String(rpcError.message || '').includes('rate_limited')) return json(res, 429, { error: 'rate_limited' });
      if (String(rpcError.message || '').includes('account_invalid')) return json(res, 409, { error: 'account_invalid' });
      throw rpcError;
    }
    await api.admin.from('movo_automation_tokens').update({ last_used_at: new Date().toISOString() }).eq('token_hash', tokenHash);
    return json(res, 200, { success: true, duplicate: Boolean(result?.duplicate), transactionId: result?.transaction_id || null });
  } catch (error) {
    console.error('[movo-automation] request failed', { message: String(error?.message || 'unknown').slice(0, 200) });
    return json(res, 500, { error: 'automation_request_failed' });
  }
};
module.exports._test = { sha256, cleanText, amountValue, accountFor, idempotencyKey };
