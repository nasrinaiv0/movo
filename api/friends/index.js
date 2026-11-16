'use strict';

const { createHash, randomBytes } = require('node:crypto');
const { clients, gate, send } = require('../lib/referralAuth');
const { SOCIAL_ACTIONS, socialPayload } = require('../lib/friendSocial');

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CONNECTION_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const INVITE_ACTIONS = new Set(['create', 'accept', 'preview', 'revoke', 'remove']);
const ERRORS = { invite_unavailable: 404, own_invite: 409, friend_limit: 409,
  friend_handle_taken: 409, friend_request_received: 409, already_friends: 409, friend_rate_limit: 429,
  friend_request_unavailable: 404, friend_connection_required: 404 };

function upstreamError(res, action, error) {
  const code = /^[A-Z0-9]{5,10}$/.test(error?.code || '') ? error.code : 'UNKNOWN';
  console.warn('[movo-friends] request failed', { action, code });
  return send(res, 503, { error: code === 'PGRST202' ? 'friends_update_pending' : 'friends_unavailable' });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  // Native transports can supply parsed JSON or its serialized representation.
  let body = req.body || {};
  if (req.method === 'POST') {
    if (!gate(req, res, 'POST', { maxBytes: 92000 })) return;
    if (typeof body === 'string') {
      if (Buffer.byteLength(body) > 92000) return send(res, 413, { error: 'payload_too_large' });
      try { body = JSON.parse(body); } catch { return send(res, 400, { error: 'invalid_action' }); }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'invalid_action' });
    if (Buffer.byteLength(JSON.stringify(body)) > (body.action === 'set_avatar' ? 92000 : 32768)) {
      return send(res, 413, { error: 'payload_too_large' });
    }
  }
  const action = req.method === 'GET' ? 'list' : body.action;
  const social = SOCIAL_ACTIONS.has(action);
  if (req.method === 'POST' && !social && !INVITE_ACTIONS.has(action)) return send(res, 400, { error: 'invalid_action' });
  const payload = social ? socialPayload(action, body) : null;
  if (payload?.error) return send(res, ERRORS[payload.error] || 400, payload);
  const token = action === 'create' ? randomBytes(32).toString('base64url') : body.token;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (['preview', 'accept'].includes(action) && (typeof token !== 'string' || !TOKEN_PATTERN.test(token))) {
    return send(res, 400, { error: 'invite_unavailable' });
  }
  if (['create', 'accept'].includes(action) && (!name || Array.from(name).length > 40 || /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u.test(name))) {
    return send(res, 400, { error: 'invalid_friend_name' });
  }
  if (action === 'remove' && (typeof body.connectionId !== 'string' || !CONNECTION_PATTERN.test(body.connectionId))) {
    return send(res, 400, { error: 'invalid_connection' });
  }
  try {
    const session = await clients(req);
    if (session.error) return send(res, session.status, { error: session.error });
    if (!session.verified) return send(res, 403, { error: 'verified_account_required' });
    const args = { p_actor: session.userId, p_action: action };
    if (social) {
      const { data, error } = await session.admin.rpc('movo_friend_social', { ...args, p_data: payload });
      if (error || !data) return upstreamError(res, action, error);
      return send(res, data.error ? ERRORS[data.error] || 400 : 200, data);
    }
    if (['create', 'preview', 'accept'].includes(action)) {
      args.p_token_hash = createHash('sha256').update(token, 'ascii').digest('hex');
    }
    if (['create', 'accept'].includes(action)) args.p_name = name;
    if (action === 'remove') args.p_connection = body.connectionId;
    const { data, error } = await session.admin.rpc('movo_friends', args);
    if (error || !data) return upstreamError(res, action, error);
    if (data.error) return send(res, ERRORS[data.error] || 400, { error: data.error });
    return send(res, 200, action === 'create' ? { token, expiresAt: data.expiresAt } : data);
  } catch (error) {
    return upstreamError(res, action, error);
  }
};
