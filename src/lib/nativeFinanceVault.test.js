import 'fake-indexeddb/auto';
import { TextEncoder, TextDecoder } from 'util';
import { webcrypto } from 'crypto';
import { MovoNative } from './native';
import { isNativeApp } from './platform';
import { sealNativeFinanceSnapshot, openNativeFinanceSnapshot, stageNativeFinanceSnapshot, readNativeFinanceSnapshot } from './nativeFinanceVault';

jest.mock('./native', () => ({ MovoNative: { secureGet: jest.fn(), secureSet: jest.fn() } }));
jest.mock('./platform', () => ({ isNativeApp: jest.fn(() => true) }));

let stored;
beforeAll(() => {
  Object.defineProperty(global, 'TextEncoder', { configurable: true, value: TextEncoder });
  Object.defineProperty(global, 'TextDecoder', { configurable: true, value: TextDecoder });
});
beforeEach(() => {
  stored = null;
  isNativeApp.mockReturnValue(true);
  MovoNative.secureGet.mockImplementation(async () => ({ value: stored }));
  MovoNative.secureSet.mockImplementation(async ({ value }) => { stored = value; });
});
afterEach(() => jest.clearAllMocks());

const opts = group => ({ ownerId: 'local', group, cryptoProvider: webcrypto });
const rows = [{ id: 'account-1', name: 'Cash', balance: 123.45 }];

test('native finance snapshot uses authenticated random AES-GCM ciphertext, never plain data', async () => {
  const first = await sealNativeFinanceSnapshot({ ...opts('accounts'), data: rows });
  const second = await sealNativeFinanceSnapshot({ ...opts('accounts'), data: rows });
  expect(first.ciphertext).not.toContain('Cash');
  expect(JSON.stringify(first)).not.toContain('123.45');
  expect(first.iv).not.toBe(second.iv);
  expect(first.ciphertext).not.toBe(second.ciphertext);
  expect(stored).toMatch(/^[0-9a-f]{64}$/);
  expect(await openNativeFinanceSnapshot({ ...opts('accounts'), envelope: first })).toEqual(rows);
});

test('ciphertext modification and cross-record substitution fail closed', async () => {
  const account = await sealNativeFinanceSnapshot({ ...opts('accounts'), data: rows });
  const changed = { ...account, ciphertext: account.ciphertext.slice(0,-2) + (account.ciphertext.endsWith('aa') ? 'bb' : 'aa') };
  await expect(openNativeFinanceSnapshot({ ...opts('accounts'), envelope: changed })).rejects.toThrow();
  await expect(openNativeFinanceSnapshot({ ...opts('transactions'), envelope: account })).rejects.toThrow('identity mismatch');
});

test('durable staged finance is verifiable without changing the active ledger', async () => {
  const ownerId = 'e8cdd1f9-884f-4954-a522-c6d466ca2e04';
  const options = { ownerId, group:'transactions', cryptoProvider: webcrypto };
  const data = [{ id:'transaction-1', amount: 1999.99, merchant:'Sensitive' }];
  await expect(stageNativeFinanceSnapshot({ ...options, data })).resolves.toMatchObject({staged:true});
  await expect(readNativeFinanceSnapshot(options)).resolves.toEqual(data);
  expect(localStorage.getItem('movo.local.transactions.v1')).toBeNull();
});

test('native key failure is blocking and never falls back to recoverable plaintext', async () => {
  MovoNative.secureSet.mockRejectedValueOnce(new Error('keystore unavailable'));
  await expect(sealNativeFinanceSnapshot({ ...opts('accounts'), data: rows })).rejects.toThrow('keystore unavailable');
  expect(stored).toBeNull();
});

test('corrupted stored key is rejected without replacement', async () => {
  stored = 'invalid-key';
  await expect(sealNativeFinanceSnapshot({ ...opts('accounts'), data: rows })).rejects.toThrow('Invalid device finance key');
  expect(MovoNative.secureSet).not.toHaveBeenCalled();
});

test('web clients cannot write to the native-only protected vault', async () => {
  isNativeApp.mockReturnValue(false);
  await expect(sealNativeFinanceSnapshot({ ...opts('accounts'), data: rows })).rejects.toThrow('requires native app');
});
