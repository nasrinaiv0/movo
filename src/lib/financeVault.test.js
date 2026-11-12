import { webcrypto } from 'crypto';
import {
  sealFinance, unsealFinance, secureHybridEntry, revealHybridEntry,
  isSensitiveLocalKey, isSealedFinance, saveFinanceJson, loadFinanceJson,
  migrateFinanceLocalStorage, SEALED_TAG
} from './financeVault';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
beforeAll(() => Object.defineProperty(globalThis, 'crypto', { configurable: true, writable: true, value: webcrypto }));
beforeEach(() => localStorage.clear());

test('XChaCha20-Poly1305 encrypts; fresh random nonces and authenticated owner scopes', () => {
  const privateRecord = { id: 'q1', amount: 99.25, merchant: 'Private medical appointment' };
  const a = sealFinance(privateRecord, 'local:owner:' + OWNER);
  const b = sealFinance(privateRecord, 'local:owner:' + OWNER);
  expect(a).not.toEqual(b);
  expect(JSON.stringify(a)).not.toContain('Private medical appointment');
  expect(unsealFinance(a, 'local:owner:' + OWNER)).toEqual(privateRecord);
  expect(() => unsealFinance(a, 'local:owner:' + OTHER)).toThrow();
  const changed = { ...a, c: a.c.replace(/./, a.c[0] === 'A' ? 'B' : 'A') };
  expect(() => unsealFinance(changed, 'local:owner:' + OWNER)).toThrow();
});

test('guest accounts and transactions are encrypted, verified, and available after reload', () => {
  for (const name of ['movo.local.accounts.v1','movo.local.transactions.v1']) {
    const sensitive = [{ id: 'one', merchant: 'Sensitive test entry', amount: 57.22 }];
    expect(saveFinanceJson(name, sensitive)).toBe(true);
    expect(localStorage.getItem(name)).not.toContain('Sensitive test entry');
    expect(loadFinanceJson(name)).toEqual(sensitive);
    expect(isSealedFinance(JSON.parse(localStorage.getItem(name)))).toBe(true);
  }
});

test('legacy records are migrated before return and corrupted ciphertext never becomes plaintext', () => {
  const key = 'movo.local.transactions.v1';
  const saved = [{ id: 'unsynced', merchant: 'Preserve my pending record' }];
  localStorage.setItem(key, JSON.stringify(saved));
  expect(loadFinanceJson(key)).toEqual(saved);
  expect(localStorage.getItem(key)).not.toContain('Preserve my pending record');
  const corrupt = JSON.parse(localStorage.getItem(key));
  corrupt[SEALED_TAG] = 0;
  localStorage.setItem(key, JSON.stringify(corrupt));
  expect(() => loadFinanceJson(key)).toThrow('envelope_corrupt');
  expect(localStorage.getItem(key)).toContain('"c"'); // Never deletes ciphertext.
});

test('tampering, tenant swap, and record swap fail before revealing IndexedDB financial payloads', () => {
  const entry = { ownerId: OWNER, group: 'transactions', recordId: '3d1a5d3f-5ce7-4d8b-b28e-52fa8bb27db4',
    id: 'operation-1', payload: { merchant: 'Secret', amount: 22.50 }, status: 'pending' };
  const saved = secureHybridEntry(entry);
  expect(saved.status).toBe('pending');
  expect(JSON.stringify(saved)).not.toContain('Secret');
  expect(revealHybridEntry(saved)).toEqual(entry);
  expect(() => revealHybridEntry({ ...saved, ownerId: OTHER })).toThrow();
  expect(() => revealHybridEntry({ ...saved, recordId: 'different' })).toThrow();
  expect(() => revealHybridEntry({ ...saved, id: 'different-operation-id' })).toThrow();
});

test('bulk local migration is non-destructive across guest and verified workspaces', async () => {
  const guestKey = 'movo.local.accounts.v1', ownerKey = 'movo.offline.workspace.v2.' + OWNER;
  localStorage.setItem(guestKey, JSON.stringify([{ id: 'guest', name: 'Private cash' }]));
  localStorage.setItem(ownerKey, JSON.stringify({ owner: OWNER, dirty: true, working: { transactions: [{ id: 'pending' }] } }));
  localStorage.setItem('unrelated.theme', 'dark');
  await migrateFinanceLocalStorage();
  expect(localStorage.getItem(guestKey)).not.toContain('Private cash');
  expect(loadFinanceJson(guestKey)[0].name).toBe('Private cash');
  expect(loadFinanceJson(ownerKey).working.transactions).toEqual([{ id: 'pending' }]);
  expect(localStorage.getItem('unrelated.theme')).toBe('dark');
});

test('quota failure cannot return a false successful save or destroy last good ciphertext', () => {
  const key = 'movo.local.accounts.v1';
  saveFinanceJson(key, [{ id: 'original', amount: 10 }]);
  const before = localStorage.getItem(key);
  const old = Storage.prototype.setItem;
  Storage.prototype.setItem = function () { throw new Error('quota'); };
  try { expect(() => saveFinanceJson(key, [{ id: 'new', amount: 100 }])).toThrow('quota'); }
  finally { Storage.prototype.setItem = old; }
  expect(localStorage.getItem(key)).toBe(before);
  expect(loadFinanceJson(key)[0].id).toBe('original');
});

test('strict finance key allowlist excludes preferences, sessions, and arbitrary keys', () => {
  expect(isSensitiveLocalKey('movo.local.accounts.v1')).toBe(true);
  expect(isSensitiveLocalKey('movo.offline.workspace.v2.' + OWNER)).toBe(true);
  expect(isSensitiveLocalKey('movo.preferences.v3')).toBe(false);
  expect(isSensitiveLocalKey('sb-project-auth-token')).toBe(false);
  expect(() => saveFinanceJson('sb-project-auth-token', 'secret')).toThrow('key_invalid');
});
