'use strict';

// Only these four actions can reach the recipient-decision RPC; identity and
// share content are never accepted from a caller-supplied object.
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const DECISION_ACTIONS = new Set(['decisions', 'accept_share', 'decline_share', 'confirm_share_import']);

function isDecisionAction(action) {
  return DECISION_ACTIONS.has(action);
}
function decisionPayload(action, input) {
  if (!isDecisionAction(action)) return { error: 'invalid_action' };
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      typeof input.connectionId !== 'string' || !UUID.test(input.connectionId))
    return { error: 'friend_connection_required' };
  const connectionId = input.connectionId.toLowerCase();
  if (action === 'decisions') return { connectionId };
  if (typeof input.messageId !== 'string' || !UUID.test(input.messageId))
    return { error: 'shared_transaction_unavailable' };
  return { connectionId, messageId: input.messageId.toLowerCase() };
}
module.exports = { isDecisionAction, decisionPayload };
