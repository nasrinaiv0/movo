import { collectDeviceFiles, preserveDeviceCopy } from './deviceCleanup';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

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
