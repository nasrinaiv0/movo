'use strict';

const { createClient } = require('@supabase/supabase-js');
const { classifyNasrinAIKeyFormat } = require('./key-format.cjs');

const MAX_MESSAGE_CHARS = 1600;
const MAX_UPSTREAM_CONTEXT_CHARS = 3800;
const MAX_CONTEXT_TRANSACTIONS = 40;
const MAX_RESPONSE_CHARS = 12000;
const DEFAULT_NASRINAI_URL = 'https://nasrinai.com';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.end(JSON.stringify(body));
}

function allowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // native/server-to-server clients still need bearer auth
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  const configured = String(process.env.MOVO_ALLOWED_ORIGINS || 'https://movo.nasrinai.com,https://movo-lime.vercel.app')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (process.env.NODE_ENV !== 'production') configured.push('http://localhost:3000');
  return parsed.protocol === 'https:' && configured.includes(parsed.origin)
    || process.env.NODE_ENV !== 'production' && parsed.origin === 'http://localhost:3000';
}

function safeText(value, max = 4000) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
    : '';
}

function selectRelevantTransactions(transactions, message, accounts = []) {
  const stopWords = new Set(['about','after','again','also','amount','and','are','can','could','did','does','for','from','have','help','how','into','last','most','much','my','please','show','spending','summarize','that','the','their','then','this','transactions','what','when','which','with','would','your']);
  const tokens = String(message || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  const terms = [...new Set(tokens.filter((word) => !stopWords.has(word)))].slice(0, 8);
  const rows = Array.isArray(transactions) ? transactions : [];
  const matched = terms.length ? rows.filter((row) => {
    const account = accounts.find((item) => item.id === row.account_id);
    const haystack = [row.merchant, row.category, row.transaction_type, account?.name].join(' ').toLowerCase();
    return terms.some((term) => haystack.includes(term));
  }) : [];
  const selected = matched.length ? matched : rows;
  return selected.slice(0, MAX_CONTEXT_TRANSACTIONS);
}

function safeFieldText(value, max = 100) {
  return safeText(value, max).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function finiteNumber(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeCurrency(value) {
  const currency = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function safeTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function safeDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function safeTransactionType(value) {
  const type = safeFieldText(value, 20).toLowerCase();
  return ['income', 'expense', 'transfer'].includes(type) ? type : null;
}

function buildFinancialContext(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const accounts = Array.isArray(source.accounts) ? source.accounts : [];
  const transactions = Array.isArray(source.transactions) ? source.transactions : [];
  const budgets = Array.isArray(source.budgets) ? source.budgets : [];

  const safeAccounts = accounts.slice(0, 50).map((a) => ({
    name: safeFieldText(a?.name, 100),
    type: safeFieldText(a?.account_type, 30),
    // Unknown currency stays unknown; never silently label an amount as PHP.
    currency: safeCurrency(a?.currency),
    opening_balance: finiteNumber(a?.opening_balance),
    archived: Boolean(a?.is_archived)
  }));

  const safeTransactions = transactions.slice(0, MAX_CONTEXT_TRANSACTIONS)
    .map((t) => ({
      date: safeTimestamp(t?.occurred_at),
      description: safeFieldText(t?.merchant, 120),
      category: safeFieldText(t?.category, 60),
      type: safeTransactionType(t?.transaction_type),
      amount: finiteNumber(t?.amount),
      currency: safeCurrency(t?.currency),
      account: safeFieldText((accounts.find((a) => a?.id === t?.account_id) || {}).name || 'Account', 100)
    }))
    // Do not turn invalid/missing amounts into zero or pass unknown transaction
    // types to the model as if they were recognized ledger entries.
    .filter((transaction) => transaction.amount !== null && transaction.type !== null);

  const safeBudgets = budgets.slice(0, 50).map((b) => ({
    category: safeFieldText(b?.category, 60),
    monthly_limit: finiteNumber(b?.monthly_limit),
    currency: safeCurrency(b?.currency),
    starts_on: safeDateOnly(b?.starts_on),
    active: Boolean(b?.is_active)
  }));

  return { accounts: safeAccounts, recent_transactions: safeTransactions, budgets: safeBudgets };
}

// Send the actual question separately from bounded finance context. The upstream
// MOVO scope treats context as transient data and suppresses platform retrieval.
function buildContextPayload(context) {
  const compact = {
    accounts: (context.accounts || []).slice(0, 12),
    recent_transactions: (context.recent_transactions || []).slice(0, MAX_CONTEXT_TRANSACTIONS),
    budgets: (context.budgets || []).slice(0, 12)
  };
  const assemble = () => JSON.stringify(compact);
  while (assemble().length > MAX_UPSTREAM_CONTEXT_CHARS) {
    if (compact.recent_transactions.length) compact.recent_transactions.pop();
    else if (compact.budgets.length) compact.budgets.pop();
    else if (compact.accounts.length) compact.accounts.pop();
    else break;
  }
  return assemble();
}

// Never attach upstream conversation identifiers. A server-only scope flag
// makes the upstream API reject non-service use and disables external context.
function buildUpstreamBody(message, context) {
  return {
    message: safeText(message, MAX_MESSAGE_CHARS),
    context_scope: 'movo',
    context: buildContextPayload(context)
  };
}

function hasConfirmedMovoScope(payload) {
  return payload?.context_scope === 'movo' || payload?.data?.context_scope === 'movo';
}

// Upstream error bodies may contain provider details, so expose only known,
// stable application error codes. Never persist/log the upstream message/body.
const SAFE_UPSTREAM_ERROR_CODES = new Set([
  'ai_unavailable',
  'budget_reached',
  'budget_reconciliation_unavailable',
  'budget_reconciliation_conflict',
  'invalid_context',
  'invalid_context_scope',
  'invalid_request',
  'forbidden',
  'unauthenticated',
  'not_found',
  'model_unavailable',
  'attachment_unsupported',
  'service_unavailable',
  'internal'
]);

function classifyUpstreamErrorCode(payload) {
  const candidate = payload?.error?.code;
  if (typeof candidate !== 'string') return 'unclassified';
  const normalized = candidate.toLowerCase();
  return SAFE_UPSTREAM_ERROR_CODES.has(normalized) ? normalized : 'unclassified';
}

function safeRetryAfterSeconds(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.min(600, Math.ceil(parsed));
}

function extractReply(data) {
  const candidates = [
    data?.reply, data?.text, data?.response, data?.message,
    data?.message?.content, data?.message?.text, data?.message?.body,
    data?.data?.reply, data?.data?.text, data?.data?.response,
    data?.data?.message?.content, data?.data?.message?.text,
    data?.assistant?.content, data?.data?.assistant?.content
  ];
  const found = candidates.find((v) => typeof v === 'string' && v.trim());
  return found ? safeText(found, MAX_RESPONSE_CHARS) : '';
}

function createUserClient(url, anonKey, token) {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: 'Bearer ' + token, 'X-Client-Info': 'movo-nasrinai-proxy' } }
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (!allowedOrigin(req)) return json(res, 403, { error: 'origin_not_allowed' });
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }
  const authHeader = String(req.headers.authorization || '');
  const match = /^Bearer ([\w.-]{20,4096})$/.exec(authHeader);
  if (!match) return json(res, 401, { error: 'sign_in_required' });
  if (req.method === 'POST' && req.body?.consent !== true) {
    return json(res, 400, { error: 'financial_context_consent_required' });
  }
  const rawMessage = req.body?.message;
  if (req.method === 'POST' && req.body?.action !== 'transcribe' && typeof rawMessage === 'string' && rawMessage.trim().length > MAX_MESSAGE_CHARS) {
    return json(res, 400, { error: 'message_too_long' });
  }
  const message = safeText(rawMessage, MAX_MESSAGE_CHARS);
  if (req.method === 'POST' && req.body?.action !== 'transcribe' && !message) return json(res, 400, { error: 'message_required' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  const nasrinKey = String(process.env.NASRINAI_API_KEY || '').trim();
  const nasrinBase = String(process.env.NASRINAI_BASE_URL || DEFAULT_NASRINAI_URL).replace(/\/+$/, '');
  if (!supabaseUrl || !anonKey) {
    return json(res, 503, { error: 'movo_auth_not_configured', message: 'MOVO sign-in is not configured on the server.' });
  }
  if (!nasrinKey) {
    return json(res, 503, {
      error: 'nasrinai_not_configured',
      message: 'NasrinAI is temporarily unavailable. Please contact support.'
    });
  }
  if (req.method === 'POST' && !nasrinKey) {
    return json(res, 503, { error: 'nasrinai_not_configured', message: 'NasrinAI chat is not configured on the MOVO server yet.' });
  }

  try {
    const token = match[1];
    const db = createUserClient(supabaseUrl, anonKey, token);
    const { data: authData, error: authError } = await db.auth.getUser(token);
    if (authError || !authData?.user?.id) return json(res, 401, { error: 'invalid_session' });
    const userId = authData.user.id;

    // Model-backed STT for MOVO hands-free chat. Audio is transient and is
    // forwarded only to the configured NasrinAI service; never persisted/logged.
    if (req.method === 'POST' && req.body?.action === 'transcribe') {
      const encoded = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64 : '';
      const mime = typeof req.body?.mime === 'string' && /^audio\/(webm|mp4|ogg|wav|mpeg)(;|$)/i.test(req.body.mime) ? req.body.mime.split(';')[0] : '';
      if (!mime || !encoded || encoded.length > 3_200_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
        return json(res, 400, { error: 'invalid_audio' });
      }
      const audio = Buffer.from(encoded, 'base64');
      if (!audio.length || audio.length > 2_400_000) return json(res, 413, { error: 'audio_too_large' });
      let stt;
      try {
        stt = await fetch(nasrinBase + '/v1/transcriptions?name=' + encodeURIComponent(mime.includes('webm') ? 'movo-voice.webm' : mime.includes('mp4') ? 'movo-voice.m4a' : 'movo-voice.wav'), {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + nasrinKey, 'Content-Type': mime, Accept: 'application/json', 'X-Client-Info': 'movo-voice-stt' },
          body: audio,
          signal: AbortSignal.timeout(20000)
        });
      } catch (err) {
        return json(res, 502, { error: err?.name === 'TimeoutError' ? 'transcription_timeout' : 'transcription_unavailable' });
      }
      if (!stt.ok) return json(res, stt.status === 429 ? 429 : 502, { error: stt.status === 429 ? 'transcription_busy' : 'transcription_unavailable' });
      const result = await stt.json().catch(() => null);
      const text = safeText(result?.text, MAX_MESSAGE_CHARS);
      return text ? json(res, 200, { text }) : json(res, 200, { text: '' });
    }

    if (req.method === 'GET') {
      const requested = safeText(req.query?.conversationId, 64);
      let query = db.from('movo_ai_conversations')
        .select('id,user_id,title,created_at,updated_at')
        .eq('user_id', userId);
      if (requested) query = query.eq('id', requested);
      else query = query.order('updated_at', { ascending: false }).limit(1);
      const conversationResult = await query.maybeSingle();
      if (conversationResult.error) throw new Error('conversation_lookup_failed');
      const conversation = conversationResult.data;
      if (!conversation && requested) return json(res, 404, { error: 'conversation_not_found' });
      if (!conversation) return json(res, 200, { conversationId: null, title: null, messages: [] });
      const messagesResult = await db.from('movo_ai_messages')
        .select('id,role,content,created_at')
        .eq('user_id', userId).eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true }).limit(200);
      if (messagesResult.error) throw new Error('message_history_lookup_failed');
      return json(res, 200, {
        conversationId: conversation.id,
        title: conversation.title,
        messages: (messagesResult.data || []).map((item) => ({ role: item.role, content: item.content, createdAt: item.created_at }))
      });
    }

    const requestedConversationId = safeText(req.body?.conversationId, 64);
    let conversation = null;
    if (requestedConversationId) {
      const found = await db.from('movo_ai_conversations')
        .select('id,user_id,title')
        .eq('id', requestedConversationId).eq('user_id', userId).maybeSingle();
      if (found.error) throw new Error('conversation_lookup_failed');
      conversation = found.data;
      if (!conversation) return json(res, 404, { error: 'conversation_not_found' });
    } else {
      const title = message.replace(/\s+/g, ' ').slice(0, 80) || 'New conversation';
      const created = await db.from('movo_ai_conversations')
        .insert({ user_id: userId, title })
        .select('id,user_id,title').single();
      if (created.error || !created.data) throw new Error('conversation_create_failed');
      conversation = created.data;
    }

    const [accountResult, transactionResult, budgetResult] = await Promise.all([
      db.from('financial_accounts')
        .select('id,name,account_type,currency,opening_balance,is_archived')
        .eq('user_id', userId)
        .order('display_order', { ascending: true }).limit(50),
      db.from('transactions')
        .select('account_id,transaction_type,amount,currency,merchant,category,occurred_at')
        .eq('user_id', userId)
        .order('occurred_at', { ascending: false }).limit(250),
      db.from('budgets')
        .select('category,monthly_limit,currency,starts_on,is_active')
        .eq('user_id', userId).eq('is_active', true)
        .order('starts_on', { ascending: false }).limit(50)
    ]);
    if (accountResult.error || transactionResult.error || budgetResult.error) {
      throw new Error('financial_context_lookup_failed');
    }
    const context = buildFinancialContext({
      accounts: accountResult.data || [],
      transactions: selectRelevantTransactions(transactionResult.data || [], message, accountResult.data || []),
      budgets: budgetResult.data || []
    });

    // Remove empty newly-created conversations on failed upstream requests.
    // Existing conversations are never deleted by this helper.
    const cleanupNewConversation = async () => {
      if (requestedConversationId) return;
      const cleanup = await db.from('movo_ai_conversations')
        .delete().eq('id', conversation.id).eq('user_id', userId);
      if (cleanup.error) console.error('[movo-nasrinai-upstream]', 'empty_conversation_cleanup_failed');
    };
    // Never attach an upstream conversation ID. The upstream receives the
    // current question and bounded finance context through its enforced MOVO
    // scope, with no prior provider conversation history.
    const voiceMode = req.body?.voiceMode === true;
    const upstreamBody = buildUpstreamBody(message, context);\n    if (voiceMode) Object.assign(upstreamBody, { stream: true, voice: true, speak_voice: 'openai:cedar' });
    const upstreamStartedAt = Date.now();
    let upstream;
    let responseText = '';
    let payload = null;
    try {
      upstream = await fetch(nasrinBase + '/v1/chat', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + nasrinKey,
          'Content-Type': 'application/json',
          Accept: voiceMode ? 'application/x-ndjson' : 'application/json',
          'X-Client-Info': voiceMode ? 'movo-financial-voice' : 'movo-financial-copilot'
        },
        body: JSON.stringify(upstreamBody),
        signal: AbortSignal.timeout(25000)
      });
      responseText = await upstream.text();
      if (voiceMode && upstream.ok) {
        const events = responseText.split(/\r?\n/).filter(Boolean).slice(0, 5000).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
        const done = [...events].reverse().find((event) => event.type === 'done');
        if (events.some((event) => event.type === 'error')) payload = { error: { code: 'voice_reply_failed' } };
        else if (done) {
          const audioParts = [];
          let audioBytes = 0;
          for (const event of events.filter((item) => item.type === 'audio' && typeof item.data === 'string').sort((a,b) => a.seq-b.seq)) {
            if (audioParts.length >= 40 || event.data.length > 1_500_000 || audioBytes + event.data.length > 8_000_000) break;
            audioParts.push({ mime: typeof event.mime === 'string' && /^audio\/(mpeg|wav|mp4|webm)$/i.test(event.mime) ? event.mime : 'audio/mpeg', data: event.data });
            audioBytes += event.data.length;
          }
          payload = { ...done, reply: extractReply(done), audioParts };
        }
      } else {
        try { payload = responseText ? JSON.parse(responseText) : null; } catch { payload = null; }
      }
    } catch (error) {
      await cleanupNewConversation();
      const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      console.error('[movo-nasrinai-upstream]', timeout ? 'timeout' : 'network_error');
      return json(res, 502, {
        error: timeout ? 'nasrinai_timeout' : 'nasrinai_unreachable',
        message: timeout
          ? 'NasrinAI took too long to respond. Please try again.'
          : 'MOVO could not connect to NasrinAI. Please try again shortly.'
      });
    }
    const elapsedMs = Date.now() - upstreamStartedAt;
    if (!upstream.ok) {
      await cleanupNewConversation();
      // Log only status, a strict allowlisted application error code, retry
      // metadata and latency. Never log prompts, financial context, keys,
      // provider messages, response bodies, or arbitrary upstream error fields.
      const upstreamErrorCode = classifyUpstreamErrorCode(payload);
      const retryAfterSeconds = safeRetryAfterSeconds(upstream.headers?.get?.('retry-after'));
      console.error(
        '[movo-nasrinai-upstream]',
        'http_' + upstream.status,
        'error_code_' + upstreamErrorCode,
        'key_format_' + classifyNasrinAIKeyFormat(nasrinKey),
        ...(retryAfterSeconds ? ['retry_after_seconds_' + retryAfterSeconds] : []),
        'latency_ms_' + elapsedMs
      );
      if (upstream.status === 401 || upstream.status === 403) {
        return json(res, 502, {
          error: 'nasrinai_auth_rejected',
          message: 'MOVO could not authenticate with NasrinAI. Please contact support.'
        });
      }
      if (upstream.status === 429) {
        if (retryAfterSeconds) res.setHeader('Retry-After', String(retryAfterSeconds));
        return json(res, 429, {
          error: 'nasrinai_rate_limited',
          message: 'NasrinAI is temporarily busy. Please try again shortly.'
        });
      }
      if (upstream.status === 400 || upstream.status === 413 || upstream.status === 422) {
        return json(res, 502, {
          error: 'nasrinai_request_rejected',
          message: 'NasrinAI rejected the request format. The issue has been recorded for troubleshooting.'
        });
      }
      return json(res, 502, {
        error: 'nasrinai_request_failed',
        message: 'NasrinAI could not answer right now. Please try again shortly.'
      });
    }
    if (!payload || typeof payload !== 'object') {
      await cleanupNewConversation();
      console.error('[movo-nasrinai-upstream]', 'invalid_json_response', 'http_' + upstream.status, 'latency_ms_' + elapsedMs);
      return json(res, 502, { error: 'invalid_nasrinai_response', message: 'NasrinAI returned an unreadable response.' });
    }
    if (!hasConfirmedMovoScope(payload)) {
      await cleanupNewConversation();
      console.error('[movo-nasrinai-upstream]', 'scope_unconfirmed', 'http_' + upstream.status, 'latency_ms_' + elapsedMs);
      return json(res, 502, {
        error: 'nasrinai_scope_unconfirmed',
        message: 'MOVO could not verify isolated context processing by NasrinAI. No reply was accepted; please try again later.'
      });
    }
    const reply = extractReply(payload);
    if (!reply) {
      await cleanupNewConversation();
      console.error('[movo-nasrinai-upstream]', 'missing_reply', 'http_' + upstream.status, 'latency_ms_' + elapsedMs);
      return json(res, 502, { error: 'invalid_nasrinai_response', message: 'NasrinAI returned an unreadable response.' });
    }
    console.info('[movo-nasrinai-upstream]', 'success', 'latency_ms_' + elapsedMs);
    // Persist the turn only after NasrinAI successfully produced a reply.
    // Failed/rate-limited upstream calls must not leave a misleading user-only
    // message in MOVO history.
    const userMessage = await db.from('movo_ai_messages').insert({
      conversation_id: conversation.id, user_id: userId, role: 'user', content: message
    });
    if (userMessage.error) throw new Error('message_save_failed');

    const conversationUpdate = await db.from('movo_ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation.id).eq('user_id', userId);
    if (conversationUpdate.error) throw new Error('conversation_update_failed');
    const assistantMessage = await db.from('movo_ai_messages').insert({
      conversation_id: conversation.id, user_id: userId, role: 'assistant', content: reply
    });
    if (assistantMessage.error) throw new Error('reply_save_failed');

    return json(res, 200, {
      conversationId: conversation.id,
      title: conversation.title,
      reply,
      ...(voiceMode && Array.isArray(payload.audioParts) ? { audioParts: payload.audioParts } : {}),
      privacy: { scope: 'current_user_only', dataShared: 'minimum_financial_context' }
    });
  } catch (error) {
    // Intentionally log only a stable code, never the prompt, token, or records.
    const code = String(error?.message || 'request_failed').replace(/[^a-z0-9_]/gi, '').slice(0, 60);
    console.error('[movo-nasrinai-chat]', code || 'request_failed');
    return json(res, 500, { error: 'chat_request_failed', message: 'The chat request failed. Please try again.' });
  }
};

module.exports.buildFinancialContext = buildFinancialContext;
module.exports.selectRelevantTransactions = selectRelevantTransactions;
module.exports.buildUpstreamBody = buildUpstreamBody;
module.exports.buildContextPayload = buildContextPayload;
module.exports.hasConfirmedMovoScope = hasConfirmedMovoScope;
module.exports.classifyUpstreamErrorCode = classifyUpstreamErrorCode;
module.exports.safeRetryAfterSeconds = safeRetryAfterSeconds;
module.exports.extractReply = extractReply;
module.exports.allowedOrigin = allowedOrigin;
