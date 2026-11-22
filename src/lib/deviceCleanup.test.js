import { collectDeviceFiles, preserveDeviceCopy } from './deviceCleanup';
import { loadFinanceJson, saveFinanceJson, sealedFinanceStorageKey } from './financeVault';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

test('scoped cleanup preserves encrypted guest/foreign wallets, vault metadata and unassigned recovery', () => {
  expect(preserveDeviceCopy(sealedFinanceStorageKey('movo.local.accounts.v1'), A)).toBe(true);
  expect(preserveDeviceCopy(sealedFinanceStorageKey('movo.local.accounts.v1'), null)).toBe(false);
  expect(preserveDeviceCopy(sealedFinanceStorageKey('movo.offline.workspace.v2.' + B), A)).toBe(true);
  expect(preserveDeviceCopy(sealedFinanceStorageKey('movo.offline.workspace.v2.' + A), A)).toBe(false);
  for (const key of ['movo.finance.vault.initialized.v1', 'movo-finance-cache-key-v1', 'movo.finance.sealed.v1:unknown',
    'movo.finance.recovery.v2:movo.local.accounts.v1:review', 'movo.finance.recovery.v1:unknown',
    'movo.finance.recovery.v2:movo.offline.workspace.v2.' + B + ':copy']) expect(preserveDeviceCopy(key, A)).toBe(true);
  expect(preserveDeviceCopy('movo.finance.recovery.v2:movo.offline.workspace.v2.' + A + ':copy', A)).toBe(false);
});

test('clearing one scope leaves actual encrypted guest and foreign records decryptable', () => {
  localStorage.clear();
  const guest = 'movo.local.accounts.v1';
  const own = 'movo.offline.workspace.v2.' + A;
  const foreign = 'movo.offline.workspace.v2.' + B;
  saveFinanceJson(guest, [{ id: 'guest', name: 'Guest savings' }]);
  saveFinanceJson(own, { owner: A, balance: 1 });
  saveFinanceJson(foreign, { owner: B, balance: 20 });
  const original = localStorage.getItem(sealedFinanceStorageKey(foreign));
  Object.keys(localStorage).filter(key => key.startsWith('movo.') && !preserveDeviceCopy(key, A)).forEach(key => localStorage.removeItem(key));
  expect(loadFinanceJson(own)).toBeNull();
  expect(loadFinanceJson(guest)).toEqual([{ id: 'guest', name: 'Guest savings' }]);
  expect(loadFinanceJson(foreign)).toEqual({ owner: B, balance: 20 });
  expect(localStorage.getItem(sealedFinanceStorageKey(foreign))).toBe(original);
  localStorage.clear();
});

test('cleanup uses matching-owner live, archived and offline file references without adopting a foreign workspace', () => {
  const value = collectDeviceFiles(A, {
    accounts: [{ id: 'own', user_id: A }, { id: 'foreign', user_id: B }],
    transactions: [{ receipt_path: 'localreceipt:own', user_id: A }, { receipt_path: 'localreceipt:foreign', user_id: B }, { receipt_path: 'cloud/file', user_id: A }],
    prefs: { archive: [{ kind: 'transaction', item: { receipt_path: 'localreceipt:archived', user_id: A } }] },
    workspace: { owner: B, working: { transactions: [{ receipt_path: 'localreceipt:other-workspace' }] } },
  });
  expect(value).toEqual({ accountIds: ['own'], receiptKeys: ['localreceipt:own', 'localreceipt:archived'] });
  expect(collectDeviceFiles(A, { workspace: { owner: A, working: { transactions: [{ receipt_path: 'localreceipt:pending' }] } } }).receiptKeys)
    .toEqual(['localreceipt:pending']);
});

test('an account prefix cannot erase another owner with a similar identifier or the guest wallet', () => {
  expect(preserveDeviceCopy('movo.chatHistory.v1:' + A + ':thread', A)).toBe(false);
  expect(preserveDeviceCopy('movo.chatHistory.v1:' + A + '-other:thread', A)).toBe(true);
  expect(preserveDeviceCopy('movo.offline.workspace.v2.' + B, A)).toBe(true);
  expect(preserveDeviceCopy('movo.local.transactions.v1', A)).toBe(true);
  expect(preserveDeviceCopy('movo.local.transactions.v1', null)).toBe(false);
  expect(preserveDeviceCopy('movo.chatHistory.v1:user.' + A + ':thread:turn', A)).toBe(false);
  expect(preserveDeviceCopy('movo.chatHistory.v1:guest:thread:turn', A)).toBe(true);
  expect(preserveDeviceCopy('movo.chatHistory.v1:guest:thread:turn', null)).toBe(false);
  expect(preserveDeviceCopy('movo.ai.active.v1.user.' + B + '.device', A)).toBe(true);
  expect(preserveDeviceCopy('movo.ai.active.v1.user.' + A + '.cloud', A)).toBe(false);
  expect(preserveDeviceCopy('movo.profile-photo.v1.' + B, A)).toBe(true);
  expect(preserveDeviceCopy('movo.profile-photo.v1.' + A, A)).toBe(false);
  expect(preserveDeviceCopy('movo.referralRedemption.v1.' + B + '.pro', A)).toBe(true);
  expect(preserveDeviceCopy('movo.referralRedemption.v1.' + A + '.pro', A)).toBe(false);
  expect(preserveDeviceCopy('sb-other-project-auth-token', A)).toBe(true);
});
