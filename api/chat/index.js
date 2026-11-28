'use strict';

const { clients, gate, send } = require('../lib/referralAuth');
const { chatPayload } = require('../lib/friendChat');

const RESPONSES = {
  invalid_action: 400, invalid_message: 400, invalid_transaction_card: 400,
  friend_connection_required: 404, message_duplicate: 409, message_rate_limit: 429,
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  if (!gate(req, res, req.method, { maxBytes: 8192 })) return;
  let body = req.method === 'GET' ? { action: 'inbox' } : req.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > 8192) return send(res, 413, { error: 'payload_too_large' });
    try { body = JSON.parse(body); } catch { return send(res, 400, { error: 'invalid_message' }); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'invalid_message' });
  if (Buffer.byteLength(JSON.stringify(body)) > 8192) return send(res, 413, { error: 'payload_too_large' });
  const action = req.method === 'GET' ? 'inbox' : body.action;
  // Explicit disabled-by-default rollout gate; previews cannot silently
  // activate recipient import against an older or production database.
  const decisionAction = ['decisions','accept_share','decline_share'].includes(action);
  if (decisionAction && process.env.MOVO_ATOMIC_FRIEND_IMPORT_ENABLED !== 'true')
    return send(res, 503, { error: 'chat_update_pending' });
  const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  let payload;
  if (decisionAction) {
    if (typeof body.connectionId !== 'string' || !uuid.test(body.connectionId))
      return send(res, 400, { error: 'friend_connection_required' });
    if (action !== 'decisions' && (typeof body.messageId !== 'string' || !uuid.test(body.messageId)))
      return send(res, 400, { error: 'shared_transaction_unavailable' });
    payload = { connectionId: body.connectionId.toLowerCase(),
      ...(action === 'decisions' ? {} : { messageId: body.messageId.toLowerCase() }) };
  } else payload = chatPayload(action, body);
  if (payload.error) return send(res, RESPONSES[payload.error] || 400, payload);
  try {
    const session = await clients(req);
    if (session.error) return send(res, session.status, { error: session.error });
    if (!session.verified) return send(res, 403, { error: 'verified_account_required' });
    const { data, error } = await session.admin.rpc(decisionAction ? 'movo_friend_transaction_decision' : 'movo_friend_chat', {
      p_actor: session.userId, p_action: action, p_data: payload,
    });
    if (error || !data) {
      console.warn('[movo-friend-chat] request failed', { action, code: error?.code || 'UNKNOWN' });
      return send(res, 503, { error: error?.code === 'PGRST202' ? 'chat_update_pending' : 'chat_unavailable' });
    }
    return send(res, data.error ? RESPONSES[data.error] || 400 : 200,
      decisionAction && action === 'decisions' && !data.error ? { ...data, atomicImport: true } : data);
  } catch {
    return send(res, 503, { error: 'chat_unavailable' });
  }
};
