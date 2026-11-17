import { newRecordId } from './recordId';
import { CHAT_CACHE_PREFIX, decryptFinancialCache, encryptFinancialCache } from './financeCacheCrypto';

export const CHAT_IDLE_MS = 10 * 60 * 1000;

const devicePrefix = (owner) => CHAT_CACHE_PREFIX + owner + ':';
const chatName = (key, owner) => key.slice(devicePrefix(owner).length);
let storageGeneration = 0;

export const chatHistoryGeneration = () => storageGeneration;

export function invalidateChatHistoryWrites() {
  storageGeneration += 1;
}

async function readDeviceThreads(owner, prefix) {
  const threads = new Map();
  const keys = Object.keys(localStorage).filter((key) => key.startsWith(prefix));
  const attempts = await Promise.allSettled(keys.map(async (key) => {
    const raw = localStorage.getItem(key);
    return raw ? decryptFinancialCache(owner, chatName(key, owner), JSON.parse(raw)) : null;
  }));
  if (attempts.length && attempts.every((attempt) => attempt.status === 'rejected')) throw new Error('chat_history_unreadable');
  for (const { value: row } of attempts) {
    if (!row?.id || !Array.isArray(row.messages)) continue;
    const thread = threads.get(row.id) || { id: row.id, cloudId: null, messages: [] };
    thread.cloudId = row.cloudId || thread.cloudId;
    thread.messages.push(...row.messages);
    threads.set(row.id, thread);
  }
  return [...threads.values()].filter(({ messages }) => messages.length).map((thread) => {
    const messages = mergeChatMessages([], thread.messages);
    return {
      ...thread, messages, updatedAt: messages.at(-1)?.createdAt,
      title: messages.find((item) => item.role === 'user')?.content.replace(/\s+/g, ' ').slice(0, 80),
    };
  });
}

export async function deviceThreads(owner) {
  return readDeviceThreads(owner, devicePrefix(owner));
}

export async function deviceThread(owner, id) {
  return (await readDeviceThreads(owner, devicePrefix(owner) + id + ':'))[0] || null;
}

export function hasDeviceThread(owner, id) {
  try { return Object.keys(localStorage).some((key) => key.startsWith(devicePrefix(owner) + id + ':')); }
  catch { return false; }
}
export function readActiveChat(key) {
  try {
    const active = JSON.parse(sessionStorage.getItem(key));
    return active?.id && Number.isFinite(active.activity) && Date.now() - active.activity < CHAT_IDLE_MS ? active : null;
  } catch { return null; }
}

export function saveActiveChat(key, active) {
  try {
    if (active) sessionStorage.setItem(key, JSON.stringify(active));
    else sessionStorage.removeItem(key);
  } catch { /* The current screen still tracks inactivity when session storage is unavailable. */ }
}

export function identifyChatMessages(items, now = Date.now()) {
  return items.map((item, index) => ({ ...item, id: newRecordId(), createdAt: new Date(now + index).toISOString() }));
}

export async function saveDeviceMessages(owner, thread, items, generation = storageGeneration) {
  const name = thread.id + ':' + (items[0]?.id || 'link');
  // Live log cards contain transaction actions. History keeps the confirmation text only.
  const messages = items.map(({ id, role, content, chart, createdAt }) => ({
    id, role: role === 'log' ? 'assistant' : role, content, ...(chart ? { chart } : {}), createdAt, local: true,
  }));
  const ciphertext = await encryptFinancialCache(owner, name, { id: thread.id, cloudId: thread.cloudId || null, messages });
  if (generation !== storageGeneration) throw new Error('chat_history_cleared');
  // A distinct key for each completed turn prevents a concurrent tab from overwriting older turns.
  localStorage.setItem(devicePrefix(owner) + name, ciphertext);
}

const timeOf = (timestamp) => Date.parse(timestamp || '') || 0;

export function mergeChatMessages(previous, next) {
  const ids = new Set();
  const items = [];
  for (const item of [...previous, ...next]) {
    if (item.id) {
      if (ids.has(item.id)) continue;
      ids.add(item.id);
    }
    items.push(item);
  }
  return items.sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt));
}

export function historyThreads(local, cloud) {
  const linked = new Set(local.map((thread) => thread.cloudId).filter(Boolean));
  return [
    ...local.map(({ id, cloudId, title, updatedAt }) => {
      const remote = cloud.find((thread) => thread.id === cloudId);
      return { id, cloudId, title, updatedAt: timeOf(remote?.updatedAt) > timeOf(updatedAt) ? remote.updatedAt : updatedAt };
    }),
    ...cloud.filter((thread) => !linked.has(thread.id)).map((thread) => ({ ...thread, cloudId: thread.id })),
  ].sort((a, b) => timeOf(b.updatedAt) - timeOf(a.updatedAt));
}
