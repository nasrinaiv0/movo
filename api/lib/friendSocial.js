'use strict';

const SOCIAL_ACTIONS = new Set(['directory', 'set_directory', 'search', 'request', 'accept_request', 'decline_request',
  'outgoing_requests', 'cancel_request', 'report_message', 'summary', 'share_summary', 'revoke_summary', 'avatar', 'set_avatar', 'block', 'unblock', 'report']);
const WORKSPACE_ACTIONS = new Set(['outgoing_requests', 'cancel_request', 'report_message']);
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const HANDLE = /^[a-z0-9_]{3,24}$/;
const PHOTO = /^data:image\/jpeg;base64,\/[a-zA-Z0-9+/]+={0,2}$/;
const BUCKETS = ['Food', 'Shopping', 'Bills', 'Transportation', 'Others'];
const HIGH_RISK_TEXT = /(?:\b(?:kill yourself|kys|child porn|send nudes|rape you)\b)/i;
const UNSAFE_TEXT = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u;

function amount(value, signed = false) {
  return Number.isFinite(value) && Math.abs(value) <= 1e12 && (signed || value >= 0)
    ? Math.round(value * 100) / 100 : undefined;
}

function spendingRows(rows) {
  if (!Array.isArray(rows) || rows.length > BUCKETS.length) return null;
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    if (!BUCKETS.includes(row?.key) || seen.has(row.key) || !Number.isInteger(row.percent) || row.percent < 0 || row.percent > 100) return null;
    seen.add(row.key);
    result.push({ key: row.key, percent: row.percent });
  }
  return result;
}

function selectedSections(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const sections = {};
  for (const key of ['income', 'expenses', 'savings']) {
    if (!(key in input)) continue;
    const value = amount(input[key], key === 'savings');
    if (value === undefined) return null;
    sections[key] = value;
  }
  if ('flow' in input) {
    if (!Array.isArray(input.flow) || input.flow.length !== 5) return null;
    sections.flow = input.flow.map(value => amount(value, true));
    if (sections.flow.includes(undefined)) return null;
  }
  if ('planning' in input) {
    const { bills, debt, owed } = input.planning || {};
    const fields = { bills: amount(bills), debt: amount(debt), owed: amount(owed) };
    if (Object.values(fields).includes(undefined)) return null;
    sections.planning = fields;
  }
  if ('budgets' in input) {
    const { budgets, onTrack, plans, progress } = input.budgets || {};
    if (![budgets, onTrack, plans, progress].every(value => Number.isInteger(value) && value >= 0 && value <= 100000)
      || onTrack > budgets || progress > 100 || (!plans && progress)) return null;
    sections.budgets = { budgets, onTrack, plans, progress };
  }
  if ('spending' in input) {
    sections.spending = spendingRows(input.spending);
    if (!sections.spending) return null;
  }
  return sections;
}

function summaryPayload(input) {
  if (!input || typeof input.month !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(input.month)) return null;
  const summary = { month: input.month };
  if (input.note !== undefined) {
    if (typeof input.note !== 'string' || Array.from(input.note).length > 500 || UNSAFE_TEXT.test(input.note.replace(/\n/g, '')) || HIGH_RISK_TEXT.test(input.note.normalize('NFKC').replace(/\s+/g, ' '))) return null;
    if (input.note.trim()) summary.note = input.note.trim();
  }
  if (input.totals !== undefined) {
    const { currency, income, expenses } = input.totals || {};
    if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency) ||
      ![income, expenses].every(value => Number.isFinite(value) && value >= 0 && value <= 1e12)) return null;
    summary.totals = { currency, income: Math.round(income * 100) / 100, expenses: Math.round(expenses * 100) / 100 };
  }
  if (input.categories !== undefined && (!Array.isArray(input.categories) || input.categories.length)) {
    summary.categories = spendingRows(input.categories);
    if (!summary.categories) return null;
  }
  if (input.sections !== undefined) {
    const sections = selectedSections(input.sections);
    if (!sections || summary.totals || summary.categories || typeof input.currency !== 'string' || !/^[A-Z]{3}$/.test(input.currency)) return null;
    summary.currency = input.currency;
    summary.sections = sections;
    if (['savings', 'planning', 'budgets'].some(key => key in sections)) {
      if (typeof input.asOf !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(input.asOf)) return null;
      const date = new Date(input.asOf);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.asOf) return null;
      summary.asOf = input.asOf;
    }
  }
  return summary.note || summary.totals || summary.categories || Object.keys(summary.sections || {}).length ? summary : null;
}

function socialPayload(action, body) {
  const { discoverable, requestId, connectionId, photo } = body;
  if (['search', 'request', 'set_directory'].includes(action)) {
    const handle = typeof body.handle === 'string' ? body.handle.trim().toLowerCase() : '';
    if (!HANDLE.test(handle) || (action === 'set_directory' && (typeof discoverable !== 'boolean' || /^(?:movo_?support|movo_?admin|admin|support|kys|childporn|rapeyou)$/.test(handle)))) {
      return { error: 'invalid_friend_handle' };
    }
    return action === 'set_directory' ? { handle, discoverable } : { handle };
  }
  if (action === 'accept_request' || action === 'decline_request' || action === 'cancel_request') {
    return typeof requestId === 'string' && UUID.test(requestId) ? { requestId } : { error: 'friend_request_unavailable' };
  }
  if (action === 'report_message') {
    return typeof connectionId === 'string' && UUID.test(connectionId) && typeof body.messageId === 'string' && UUID.test(body.messageId)
      ? { connectionId, messageId: body.messageId } : { error: 'friend_message_unavailable' };
  }
  if (action === 'unblock') {
    const { blockId } = body;
    return typeof blockId === 'string' && UUID.test(blockId) ? { blockId } : { error: 'friend_request_unavailable' };
  }
  if (action === 'block' || action === 'report') {
    if (typeof connectionId === 'string' && UUID.test(connectionId)) return { connectionId };
    if (typeof requestId === 'string' && UUID.test(requestId)) return { requestId };
    return { error: 'friend_request_unavailable' };
  }
  if (['summary', 'share_summary', 'revoke_summary'].includes(action)) {
    if (typeof connectionId !== 'string' || !UUID.test(connectionId)) return { error: 'friend_connection_required' };
    if (action !== 'share_summary') return { connectionId };
    const summary = summaryPayload(body.summary);
    return summary ? { connectionId, summary } : { error: 'invalid_friend_summary' };
  }
  if (action === 'set_avatar') {
    if (photo === '') return { photo };
    if (typeof photo !== 'string' || photo.length > 90000 || !PHOTO.test(photo)) return { error: 'invalid_profile_photo' };
    const bytes = Buffer.from(photo.slice('data:image/jpeg;base64,'.length), 'base64');
    if (bytes.length < 8 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff ||
      bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return { error: 'invalid_profile_photo' };
    return { photo };
  }
  return {};
}

module.exports = { SOCIAL_ACTIONS, WORKSPACE_ACTIONS, socialPayload };
