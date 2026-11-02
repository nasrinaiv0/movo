const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const MAX_BODY_BYTES = 8192;
const KEY_RE = /^[a-f0-9]{32,128}$/i;
const { parseVoice, guessCategory } = require('./_lib/voice');
// Every channel that may post here; stored as transactions.source (see migration 20261102010000).
const SOURCES = new Set(['applepay', 'googlepay', 'bank', 'notification', 'siri_shortcut', 'android_assistant']);
const SOURCE_LABELS = { applepay: 'Apple Pay', googlepay: 'Google Pay', bank: 'bank notification', notification: 'notification', siri_shortcut: 'Siri', android_assistant: 'Android assistant' };
const VOICE_SOURCES = new Set(['siri_shortcut', 'android_assistant']);
// Every reply carries a short human sentence in `message`, so a Shortcut can show it as-is and never claims success
// for a request that failed.
const ERROR_MESSAGES = {
  method_not_allowed: 'Use POST to send payments to MOVO.',
  payload_too_large: 'That request was too large for MOVO.',
  automation_service_unavailable: 'MOVO automation is unavailable right now. Add this payment in the app.',
  invalid_registration: 'This device could not be registered. Open MOVO and try again.',
  sign_in_required: 'Sign in to MOVO to register this device.',
  key_already_registered: 'This device key belongs to another MOVO account. Reset the key in MOVO.',
  invalid_revocation: 'That device key could not be revoked.',
  invalid_action: 'MOVO did not recognise that request.',
  invalid_device_key: 'This shortcut has no valid MOVO device key. Copy a fresh prompt from MOVO.',
  device_not_registered: 'This device is not registered with MOVO. Open Automatic logging in MOVO and try again.',
  invalid_transaction: 'MOVO did not get a valid amount for this payment, so nothing was logged.',
  invalid_transaction_date: 'The payment date was not valid, so nothing was logged.',
  account_required: 'Add an account in MOVO first, then this payment can be logged.',
  account_match_required: 'MOVO could not tell which account this was. Choose a default account in Automatic logging.',
  account_invalid: 'That account is archived or not yours, so nothing was logged.',
  clarification_required: 'Say one amount and what it was for, for example “I spent 150 pesos on lunch”.',
  rate_limited: 'Too many payments in a short time. MOVO will accept more in a minute.',
  automation_request_failed: 'MOVO could not log this payment. Open MOVO to add it.',
};
function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  const out = body && body.error ? { ...body, success: false, message: body.message || ERROR_MESSAGES[body.error] || ERROR_MESSAGES.automation_request_failed } : body;
  return res.status(status).json(out);
}
function sha256(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function cleanText(value, max) { return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max) : ''; }
function amountValue(value) { if (typeof value === 'number') return Number.isFinite(value) && value > 0 && value < 1e9 ? Math.round(value * 100) / 100 : 0; let raw = String(value ?? '').trim().replace(/[^\d.,-]/g, ''); if (!raw || raw.startsWith('-')) return 0; if (/,\d{2}$/.test(raw) && !/\.\d{2}$/.test(raw)) raw = raw.replace(/\./g, '').replace(',', '.'); const amount = Number(raw.replace(/,/g, '')); return Number.isFinite(amount) && amount > 0 && amount < 1e9 ? Math.round(amount * 100) / 100 : 0; }
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
function idempotencyKey({ source, amount, merchant, card, occurredAt, reference, type = 'expense' }) {
  // Per device retry key. Cross-channel duplicates are matched separately in the database (log_automation_transaction_v2).
  const kind = type === 'income' ? 'income|' : '';
  const stable = reference ? `${kind}${source}|ref:${reference.toLowerCase()}|${amount.toFixed(2)}|${merchant.toLowerCase()}|${card.toLowerCase()}` : kind + [source, amount.toFixed(2), merchant.toLowerCase(), card.toLowerCase(), String(Math.floor(Date.parse(occurredAt) / 60000))].join('|');
  return sha256(stable);
}
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'method_not_allowed' }); }
  if (Number(req.headers['content-length'] || 0) > MAX_BODY_BYTES) return json(res, 413, { error: 'payload_too_large' });
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) return json(res, 413, { error: 'payload_too_large' });
  const action = body.action || 'log', token = bearer(req), api = clients();
  let stage = 'request_received';
  if (!api) { console.error('[movo-automation] request failed', { stage, reason: 'service_not_configured' }); return json(res, 503, { error: 'automation_service_unavailable' }); }
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
      // Optional default account for unmatched card names; it must be one of this person's open accounts.
      let defaultAccountId = null;
      if (typeof body.defaultAccountId === 'string' && /^[0-9a-f-]{36}$/i.test(body.defaultAccountId)) {
        const { data: owned, error: ownedError } = await api.admin.from('financial_accounts').select('id').eq('id', body.defaultAccountId).eq('user_id', authData.user.id).eq('is_archived', false).maybeSingle();
        if (ownedError) throw ownedError;
        if (!owned) return json(res, 409, { error: 'account_invalid' });
        defaultAccountId = owned.id;
      }
      const { error } = await api.admin.from('movo_automation_tokens').upsert({ token_hash: tokenHash, user_id: authData.user.id, label: body.platform === 'android' ? 'Android automation' : 'iOS Shortcuts', active: true, default_account_id: defaultAccountId }, { onConflict: 'token_hash' });
      if (error) throw error;
      return json(res, 200, { success: true, registered: true, defaultAccount: Boolean(defaultAccountId), message: 'This device is registered with MOVO.' });
    }
    if (action === 'revoke') {
      // Possession of a device key may revoke only that same key; no account session is needed.
      if (!KEY_RE.test(token)) return json(res, 400, { error: 'invalid_revocation' });
      const { error } = await api.admin.from('movo_automation_tokens')
        .update({ active: false }).eq('token_hash', sha256(token));
      if (error) throw error;
      return json(res, 200, { success: true, revoked: true, message: 'The old device key was revoked.' });
    }
    if (action !== 'log') return json(res, 400, { error: 'invalid_action' });
    stage = 'authenticate_device';
    if (!KEY_RE.test(token)) return json(res, 401, { error: 'invalid_device_key' });
    const tokenHash = sha256(token);
    const { data: registered, error: tokenError } = await api.admin.from('movo_automation_tokens').select('user_id,active,default_account_id').eq('token_hash', tokenHash).maybeSingle();
    if (tokenError) throw tokenError;
    if (!registered?.active) return json(res, 401, { error: 'device_not_registered' });
    stage = 'validate_transaction';
    const source = SOURCES.has(body.source) ? body.source : 'notification';
    // Voice paths may send the spoken sentence instead of fields; it is parsed here, never trusted blindly.
    let voice = null;
    if (typeof body.text === 'string' && body.text.trim() && (body.amount === undefined || body.amount === null || body.amount === '')) {
      voice = parseVoice(body.text);
      if (!voice.ok) return json(res, 422, { error: 'clarification_required', reason: voice.reason, message: 'Say one amount and what it was for, for example “I spent 150 pesos on lunch”.' });
    }
    const amount = voice ? voice.amount : amountValue(body.amount);
    // Wallet sometimes reports a payment without a merchant name; keep the payment rather than dropping it.
    const merchant = voice ? cleanText(voice.merchant, 160) : (cleanText(body.merchant, 160) || (amountValue(body.amount) ? `${SOURCE_LABELS[source].replace(/^./, c => c.toUpperCase())} purchase` : ''));
    const card = cleanText(voice ? (body.card || body.account || voice.accountHint) : (body.card || body.account), 100);
    const reference = cleanText(body.reference, 120);
    const type = (voice && voice.type) || (body.type === 'income' ? 'income' : 'expense');
    const requestedCurrency = typeof body.currency === 'string' && /^[A-Z]{3}$/.test(body.currency.trim().toUpperCase()) ? body.currency.trim().toUpperCase() : (voice && voice.currency) || '';
    if (!amount || !merchant) return json(res, 400, { error: 'invalid_transaction' });
    const parsedDate = body.occurredAt ? Date.parse(body.occurredAt) : voice ? Date.parse(voice.occurredAt) : Date.now();
    if (!Number.isFinite(parsedDate) || parsedDate < Date.now() - 366 * 86400000 || parsedDate > Date.now() + 86400000) return json(res, 400, { error: 'invalid_transaction_date' });
    const occurredAt = new Date(parsedDate).toISOString();
    stage = 'match_account';
    const { data: accounts, error: accountsError } = await api.admin.from('financial_accounts').select('id,name,account_type,institution_name,currency,is_archived,display_order').eq('user_id', registered.user_id).eq('is_archived', false).order('display_order', { ascending: true });
    if (accountsError) throw accountsError;
    const account = accountFor(accounts || [], card) || (registered.default_account_id && (accounts || []).find(a => a.id === registered.default_account_id)) || null;
    if (!account) return json(res, 409, { error: accounts?.length ? 'account_match_required' : 'account_required', message: accounts?.length ? ERROR_MESSAGES.account_match_required : ERROR_MESSAGES.account_required });
    const requestId = idempotencyKey({ source, amount, merchant, card, occurredAt, reference, type });
    const note = [`Logged from ${SOURCE_LABELS[source]}`, card ? `Account hint: ${card}` : '', reference ? `Ref ${reference}` : ''].filter(Boolean).join(' · ').slice(0, 1000);
    const category = cleanText(body.category, 40) || guessCategory(`${merchant} ${voice ? body.text : ''}`, type);
    stage = 'persist_transaction';
    // One shared, idempotent path for every channel: request retries, cross-source duplicates, RLS-equivalent
    // ownership checks and rate limits all live in log_automation_transaction_v2.
    let { data: result, error: rpcError } = await api.admin.rpc('log_automation_transaction_v2', { p_token_hash: tokenHash, p_request_id: requestId, p_user_id: registered.user_id, p_account_id: account.id, p_transaction_type: type, p_amount: amount, p_currency: requestedCurrency || account.currency || 'PHP', p_merchant: merchant, p_category: category, p_occurred_at: occurredAt, p_note: note, p_source: source, p_external_reference: reference || null });
    // Rollout safety: until migration 20261102010000 is applied, v2 does not exist and the old constraint only
    // accepts 'notification'. Expenses still log through the earlier function (without the channel name).
    if (rpcError && type === 'expense' && /PGRST202|could not find the function|does not exist/i.test(`${rpcError.code || ''} ${rpcError.message || ''}`)) {
      ({ data: result, error: rpcError } = await api.admin.rpc('log_automation_transaction', { p_token_hash: tokenHash, p_request_id: requestId, p_user_id: registered.user_id, p_account_id: account.id, p_amount: amount, p_currency: requestedCurrency || account.currency || 'PHP', p_merchant: merchant, p_category: category, p_occurred_at: occurredAt, p_note: note, p_source: 'notification', p_external_reference: reference || null }));
    }
    if (rpcError) {
      const message = String(rpcError.message || '');
      if (message.includes('rate_limited')) return json(res, 429, { error: 'rate_limited' });
      if (message.includes('account_invalid')) return json(res, 409, { error: 'account_invalid' });
      if (message.includes('token_invalid')) return json(res, 401, { error: 'device_not_registered' });
      if (message.includes('invalid_transaction') || message.includes('invalid_request')) return json(res, 400, { error: 'invalid_transaction' });
      throw rpcError;
    }
    const { error: usageError } = await api.admin.from('movo_automation_tokens').update({ last_used_at: new Date().toISOString() }).eq('token_hash', tokenHash);
    if (usageError) console.error('[movo-automation] usage timestamp update failed', { message: String(usageError.message || 'unknown').slice(0, 160) });
    console.info('[movo-automation] transaction persisted', { source, type, duplicate: Boolean(result?.duplicate), matchedBy: result?.matched_by || null, transactionIdPresent: Boolean(result?.transaction_id) });
    const cur = requestedCurrency || account.currency || 'PHP';
    const spoken = result?.duplicate ? `Already in MOVO: ${cur} ${amount.toFixed(2)} at ${merchant}. Not added twice.` : `Logged ${type === 'income' ? 'income ' : ''}${cur} ${amount.toFixed(2)} at ${merchant} in ${account.name}.`;
    return json(res, 200, { success: true, duplicate: Boolean(result?.duplicate), matchedBy: result?.matched_by || null, transactionId: result?.transaction_id || null, type, amount, currency: requestedCurrency || account.currency || 'PHP', merchant, source, message: spoken });
  } catch (error) {
    console.error('[movo-automation] request failed', { stage, message: String(error?.message || 'unknown').slice(0, 200) });
    return json(res, 500, { error: 'automation_request_failed' });
  }
};
module.exports._test = { sha256, cleanText, amountValue, accountFor, idempotencyKey, SOURCES };
