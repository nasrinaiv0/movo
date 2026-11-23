import { CapacitorHttp } from '@capacitor/core';
import { apiUrl, isNativeApp } from './platform';

/** Server verifies the bearer session; no userId is ever trusted from the device. */
export async function chatRequest(session, action = 'inbox', payload = {}, signal) {
  if (!session?.access_token) throw Object.assign(new Error('Sign in required'), { code: 'sign_in_required' });
  const headers = { Authorization: 'Bearer ' + session.access_token };
  const method = action === 'inbox' ? 'GET' : 'POST';
  if (method === 'POST') headers['Content-Type'] = 'application/json';
  let status, data;
  try {
    if (isNativeApp()) {
      const res = await CapacitorHttp.request({ url: apiUrl('/api/chat'), method, headers,
        ...(method === 'POST' ? { data: { action, ...payload } } : {}),
        connectTimeout: 10000, readTimeout: 15000 });
      if (signal?.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      status = res.status; data = res.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { data = null; }
      }
    } else {
      const res = await fetch(apiUrl('/api/chat'), { method, headers, cache: 'no-store', signal,
        ...(method === 'POST' ? { body: JSON.stringify({ action, ...payload }) } : {}) });
      status = res.status; data = await res.json().catch(() => null);
    }
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    throw Object.assign(new Error('Chat is unreachable'), { code: 'chat_network' });
  }
  if (status < 200 || status >= 300 || !data || typeof data !== 'object' || Array.isArray(data)) {
    throw Object.assign(new Error('Chat request failed'), {
      code: status === 401 ? 'sign_in_required' : data?.error || 'chat_unavailable',
    });
  }
  return data;
}

/** Privacy boundary: only this explicit, previewable projection ever leaves the owner's ledger. */
export function transactionShareCard(tx, { description = false, category = false } = {}) {
  if (!tx || !['expense', 'income', 'transfer'].includes(tx.type)) return null;
  const amount = Number(tx.origAmount ?? tx.amount);
  const currency = String(tx.origCurrency || tx.currency || '');
  const date = String(tx.date || '').slice(0, 10);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12 || !/^[A-Z]{3}$/.test(currency) ||
    !/^20\d{2}-\d{2}-\d{2}$/.test(date)) return null;
  const card = { type: tx.type, amount: Math.round(amount * 100) / 100, currency, date };
  if (description && typeof tx.merchant === 'string' && tx.merchant.trim()) card.description = tx.merchant.trim().slice(0, 100);
  if (category && typeof tx.category === 'string' && tx.category.trim()) card.category = tx.category.trim().slice(0, 50);
  return card;
}
