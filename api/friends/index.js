'use strict';

const { createHash, randomBytes } = require('node:crypto');
const { clients, gate, send } = require('../lib/referralAuth');

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CONNECTION_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const INVITE_ACTIONS = new Set(['create', 'accept', 'preview', 'revoke', 'remove']);
const ERRORS = { invite_unavailable: 404, own_invite: 409, friend_limit: 409, invalid_friend_name: 400 };

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  if (req.method === 'POST' && !gate(req, res, 'POST')) return;
  const body = req.body || {};
  const action = req.method === 'GET' ? 'list' : body.action;
  if (req.method === 'POST' && !INVITE_ACTIONS.has(action)) return send(res, 400, { error: 'invalid_action' });
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
    if (['create', 'preview', 'accept'].includes(action)) {
      args.p_token_hash = createHash('sha256').update(token, 'ascii').digest('hex');
    }
    if (['create', 'accept'].includes(action)) args.p_name = name;
    if (action === 'remove') args.p_connection = body.connectionId;
    const { data, error } = await session.admin.rpc('movo_friends', args);
    if (error || !data) return send(res, 503, { error: 'friends_unavailable' });
    if (data.error) return send(res, ERRORS[data.error] || 400, { error: data.error });
    return send(res, 200, action === 'create' ? { token, expiresAt: data.expiresAt } : data);
  } catch {
    return send(res, 503, { error: 'friends_unavailable' });
  }
};
