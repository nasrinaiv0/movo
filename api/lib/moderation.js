'use strict';
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const REASONS = new Set(['harmful','deceptive','privacy','other']);
// Narrow baseline filter, not a substitute for human moderation or multilingual classifiers.
const HIGH_RISK_TEXT = /\b(?:kill yourself|kys|child porn|send nudes|rape you|send me your (?:password|pin|cvv|one.time code))\b/i;
function highRiskText(value) {
  return typeof value === 'string' && HIGH_RISK_TEXT.test(value.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' '));
}
function reportPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.messageId !== 'string' || !UUID.test(body.messageId) || !REASONS.has(body.reason)) return null;
  return { messageId: body.messageId.toLowerCase(), reason: body.reason };
}
async function submitAIReport(body, getSession, enabled) {
  if (!enabled) return { status: 503, body: { error: 'ai_reports_unavailable' } };
  const payload = reportPayload(body);
  if (!payload) return { status: 400, body: { error: 'invalid_report' } };
  try {
    const session = await getSession();
    if (session.error) return { status: session.status, body: { error: session.error } };
    if (!session.verified) return { status: 403, body: { error: 'verified_account_required' } };
    const { data, error } = await session.admin.rpc('movo_report_ai_message', { p_actor: session.userId, p_message_id: payload.messageId, p_reason: payload.reason });
    if (error || !data) return { status: 503, body: { error: 'ai_reports_unavailable' } };
    if (data.error === 'report_rate_limit') return { status: 429, body: { error: 'report_rate_limit' } };
    if (data.error === 'message_unavailable') return { status: 404, body: { error: 'message_unavailable' } };
    if (data.ok !== true || typeof data.reportId !== 'string' || !UUID.test(data.reportId)) return { status: 503, body: { error: 'ai_reports_unavailable' } };
    return { status: 200, body: { ok: true, reportId: data.reportId } };
  } catch { return { status: 503, body: { error: 'ai_reports_unavailable' } }; }
}
module.exports = { highRiskText, reportPayload, submitAIReport };
