import 'fake-indexeddb/auto';
import { webcrypto } from 'crypto';
import { CHAT_CACHE_PREFIX } from './financeCacheCrypto';
import { chatHistoryGeneration, deviceThread, deviceThreads, identifyChatMessages, invalidateChatHistoryWrites, saveDeviceMessages } from './chatHistory';

jest.mock('./platform', () => ({ isNativeApp: () => false }));

const owner = 'user.owner-1';
const thread = { id: 'thread-1', cloudId: null };

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
});
beforeEach(() => localStorage.clear());

test('encrypts each local turn, preserves concurrent appends and keeps cloud linkage on the same device', async () => {
  const first = identifyChatMessages([{ role: 'user', content: 'Sensitive question' }], 1000);
  const second = identifyChatMessages([{ role: 'log', content: 'Logged one record', items: [{ id: 'private-record-id' }] }], 2000);
  await Promise.all([saveDeviceMessages(owner, thread, first), saveDeviceMessages(owner, thread, second)]);
  await saveDeviceMessages(owner, { ...thread, cloudId: 'cloud-thread-1' }, []);
  const saved = await deviceThread(owner, thread.id);
  expect(saved.cloudId).toBe('cloud-thread-1');
  expect(saved.messages.map(({ role, content }) => [role, content])).toEqual([
    ['user', 'Sensitive question'], ['assistant', 'Logged one record'],
  ]);
  expect(saved.messages[1]).not.toHaveProperty('items');
  const raw = localStorage.getItem(CHAT_CACHE_PREFIX + owner + ':' + thread.id + ':' + first[0].id);
  expect(raw).not.toContain('Sensitive question');
  expect(JSON.parse(raw)).toMatchObject({ alg: 'A256GCM', v: 2 });
  expect(await deviceThreads('guest')).toEqual([]);
  localStorage.setItem(CHAT_CACHE_PREFIX + 'user.other:' + thread.id + ':' + first[0].id, raw);
  await expect(deviceThreads('user.other')).rejects.toThrow('chat_history_unreadable');
});

test('a pending turn cannot repopulate storage after MOVO clears its data', async () => {
  const generation = chatHistoryGeneration();
  const saving = saveDeviceMessages(owner, thread, identifyChatMessages([{ role: 'user', content: 'Old text' }]), generation);
  invalidateChatHistoryWrites();
  localStorage.clear();
  await expect(saving).rejects.toThrow('chat_history_cleared');
  expect(await deviceThreads(owner)).toEqual([]);
});
