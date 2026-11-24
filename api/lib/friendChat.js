'use strict';

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const CONTROL = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u;
const ACTIONS = new Set(['inbox', 'inbox_brief', 'open', 'read', 'send']);
const KINDS = new Set(['expense', 'income', 'transfer']);

function cleanText(value, limit) {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result && Array.from(result).length <= limit && !CONTROL.test(result) ? result : null;
}

function cardPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const { type, amount, currency, date } = input;
  if (!KINDS.has(type) || !Number.isFinite(amount) || amount <= 0 || amount > 1e12 ||
      typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency) ||
      typeof date !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const description = input.description === undefined ? '' : cleanText(input.description, 100);
  const category = input.category === undefined ? '' : cleanText(input.category, 50);
  if (description === null || category === null) return null;
  return { type, amount: Math.round(amount * 100) / 100, currency, date,
    ...(description ? { description } : {}), ...(category ? { category } : {}) };
}

function chatPayload(action, input) {
  if (!ACTIONS.has(action)) return { error: 'invalid_action' };
  if (action === 'inbox' || action === 'inbox_brief') return {};
  if (typeof input.connectionId !== 'string' || !UUID.test(input.connectionId)) return { error: 'friend_connection_required' };
  const connectionId = input.connectionId.toLowerCase();
  if (action !== 'send') return { connectionId };
  if (typeof input.clientId !== 'string' || !UUID.test(input.clientId)) return { error: 'invalid_message' };
  const clientId = input.clientId.toLowerCase();
  if (input.kind === 'text') {
    const body = cleanText(input.body, 2000);
    if (!body || Buffer.byteLength(body) > 6000) return { error: 'invalid_message' };
    return { connectionId, clientId, kind: 'text', body };
  }
  if (input.kind === 'transaction') {
    const card = cardPayload(input.card);
    return card ? { connectionId, clientId, kind: 'transaction', body: '', card } : { error: 'invalid_transaction_card' };
  }
  return { error: 'invalid_message' };
}

module.exports = { chatPayload, cardPayload };
