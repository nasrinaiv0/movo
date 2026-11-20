import 'fake-indexeddb/auto';
import { webcrypto } from 'crypto';
import { readOfflineEntitlement, saveOfflineEntitlement } from './offlineEntitlement';
import { CACHE_PREFIX } from './financeCacheCrypto';

const now = Date.now();
beforeAll(() => Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto }));
const paid = { tier: 'pro_plus', active: true, expiresAt: new Date(now + 86400000).toISOString() };
beforeEach(() => localStorage.clear());

test('only authenticated owner ciphertext restores an unexpired plan after restart', async () => {
  await saveOfflineEntitlement('alice', paid, now);
  expect(localStorage.getItem(CACHE_PREFIX + 'alice:verified-plan')).not.toContain('pro_plus');
  expect(await readOfflineEntitlement('alice', now)).toMatchObject({ owner: 'alice', tier: 'pro_plus' });
  expect(await readOfflineEntitlement('bob', now)).toBeNull();
  localStorage.setItem(CACHE_PREFIX + 'bob:verified-plan', localStorage.getItem(CACHE_PREFIX + 'alice:verified-plan'));
  await expect(readOfflineEntitlement('bob', now)).rejects.toThrow();
  expect(await readOfflineEntitlement('alice', now + 86400000)).toBeNull();
  expect(await readOfflineEntitlement('alice', now - 1000)).toBeNull();
});

test('a server-confirmed revocation removes the offline grant', async () => {
  await saveOfflineEntitlement('alice', paid, now);
  await saveOfflineEntitlement('alice', { ...paid, active: false }, now);
  expect(await readOfflineEntitlement('alice', now)).toBeNull();
});
