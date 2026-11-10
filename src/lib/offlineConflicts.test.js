import { planOfflineReconciliation } from './offlineReconciliation';
import { reconcileAndCommitOfflineWorkspace } from './offlineSyncTransport';
import { describeConflict, resolveOfflineConflicts, conflictKey } from './offlineConflicts';

const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const OTHER = '123e4567-e89b-42d3-a456-426614174099';
const A = '123e4567-e89b-42d3-a456-426614174012';
const T = '123e4567-e89b-42d3-a456-426614174013';
const account = { id: A, user_id: OWNER, name: 'Main', account_type: 'bank', currency: 'PHP', opening_balance: 100, updated_at: 'a1' };
const tx = { id: T, user_id: OWNER, account_id: A, transaction_type: 'expense', amount: 8, merchant: 'Food', category: 'Other', currency: 'PHP', occurred_at: '2026-11-08T01:00:00.000Z', updated_at: 'r1' };
const rows = (accounts = [], transactions = []) => ({ financial_accounts: accounts, transactions });
const ws = (baseline, working, extra = {}) => ({ version: 2, owner: OWNER, baseline, working, dirty: true, held: true, pendingDeletions: {}, deletedRows: {}, ...extra });
const groups = ['financial_accounts', 'transactions'];
const planFor = (workspace, cloud) => planOfflineReconciliation({ ownerId: OWNER, base: workspace.baseline, local: workspace.working, cloud, groups, localDeletions: workspace.pendingDeletions, deletedRows: workspace.deletedRows });

// A small in-memory cloud with the same revision checks as the real adapter.
function cloudOf(initial) {
  let remote = JSON.parse(JSON.stringify(initial)); let rev = 1;
  const calls = { insert: [], update: [], remove: [] };
  return {
    calls, get: () => remote,
    deps: {
      assertOwner: async () => {}, fetchRemote: async () => JSON.parse(JSON.stringify(remote)),
      insertAccount: async () => { throw new Error('not expected'); }, updateAccountCAS: async () => { throw new Error('not expected'); },
      insertTransaction: async row => { calls.insert.push(row); if (remote.transactions.some(x => x.id === row.id)) throw new Error('duplicate'); remote.transactions.push({ ...row, user_id: OWNER, updated_at: 'n' + (++rev) }); },
      updateTransactionCAS: async (row, expected) => { calls.update.push([row.id, expected]); const cur = remote.transactions.find(x => x.id === row.id); if (!cur || cur.updated_at !== expected) throw new Error('Cloud transaction was updated elsewhere.'); remote.transactions = remote.transactions.map(x => (x.id === row.id ? { ...x, ...row, updated_at: 'n' + (++rev) } : x)); },
      deleteTransactionCAS: async (id, expected) => { calls.remove.push([id, expected]); const cur = remote.transactions.find(x => x.id === id); if (!cur) return false; if (cur.updated_at !== expected) throw new Error('Cloud transaction was updated elsewhere.'); remote.transactions = remote.transactions.filter(x => x.id !== id); return true; },
      uploadReceipt: async () => { throw new Error('not expected'); },
    },
  };
}
const conflictsOf = (workspace, cloud) => { const plan = planFor(workspace, cloud); expect(plan.ok).toBe(false); return plan.conflicts; };

test('both sides edited: keeping this device uploads the device row against the cloud revision it was shown', async () => {
  const cloudRow = { ...tx, amount: 12, updated_at: 'r2' };
  const cloud = cloudOf(rows([account], [cloudRow]));
  const workspace = ws(rows([account], [tx]), rows([account], [{ ...tx, amount: 10 }]));
  const conflicts = conflictsOf(workspace, cloud.get());
  expect(describeConflict(conflicts[0])).toEqual(expect.objectContaining({ kind: 'edited_both', device: expect.objectContaining({ amount: 10 }), cloud: expect.objectContaining({ amount: 12 }) }));
  const { workspace: next, resolved } = resolveOfflineConflicts(workspace, OWNER, conflicts, { [conflictKey(conflicts[0])]: 'device' });
  expect(resolved).toBe(1);
  // The device row is unchanged; only the starting point moved to the cloud revision.
  expect(next.working.transactions).toEqual([{ ...tx, amount: 10 }]);
  expect(next.baseline.transactions).toEqual([cloudRow]);
  const result = await reconcileAndCommitOfflineWorkspace({ ownerId: OWNER, workspace: next, ...cloud.deps });
  expect(result.ok).toBe(true);
  expect(cloud.calls.update).toEqual([[T, 'r2']]);
  expect(cloud.get().transactions[0].amount).toBe(10);
});

test('both sides edited: keeping the cloud uploads nothing and the device copy takes the cloud row', async () => {
  const cloudRow = { ...tx, merchant: 'Cloud edit', updated_at: 'r2' };
  const cloud = cloudOf(rows([account], [cloudRow]));
  const workspace = ws(rows([account], [tx]), rows([account], [{ ...tx, merchant: 'Device edit' }]));
  const conflicts = conflictsOf(workspace, cloud.get());
  const { workspace: next } = resolveOfflineConflicts(workspace, OWNER, conflicts, { [conflictKey(conflicts[0])]: 'cloud' });
  expect(next.working.transactions).toEqual([cloudRow]);
  expect(planFor(next, cloud.get())).toEqual(expect.objectContaining({ ok: true, upload: [] }));
  const result = await reconcileAndCommitOfflineWorkspace({ ownerId: OWNER, workspace: next, ...cloud.deps });
  expect(result.ok).toBe(true);
  expect(cloud.calls).toEqual({ insert: [], update: [], remove: [] });
});

test('deleted here, changed in the cloud: keeping this device deletes exactly the cloud revision shown', async () => {
  const cloudRow = { ...tx, amount: 50, updated_at: 'r2' };
  const cloud = cloudOf(rows([account], [cloudRow]));
  const workspace = ws(rows([account], [tx]), rows([account], []), { pendingDeletions: { transactions: [T] }, deletedRows: { transactions: { [T]: tx } } });
  const conflicts = conflictsOf(workspace, cloud.get());
  expect(describeConflict(conflicts[0])).toEqual(expect.objectContaining({ kind: 'deleted_here', device: undefined, cloud: cloudRow }));
  const { workspace: next } = resolveOfflineConflicts(workspace, OWNER, conflicts, { [conflictKey(conflicts[0])]: 'device' });
  expect(next.pendingDeletions.transactions).toEqual([T]);
  expect(next.deletedRows.transactions[T]).toEqual(cloudRow);
  const result = await reconcileAndCommitOfflineWorkspace({ ownerId: OWNER, workspace: next, ...cloud.deps });
  expect(result.ok).toBe(true);
  expect(cloud.calls.remove).toEqual([[T, 'r2']]);
  expect(cloud.get().transactions).toEqual([]);
});

test('deleted here, changed in the cloud: keeping the cloud brings the row back and drops the tombstone', () => {
  const cloudRow = { ...tx, amount: 50, updated_at: 'r2' };
  const workspace = ws(rows([account], [tx]), rows([account], []), { pendingDeletions: { transactions: [T] }, deletedRows: { transactions: { [T]: tx } } });
  const conflicts = conflictsOf(workspace, rows([account], [cloudRow]));
  const { workspace: next } = resolveOfflineConflicts(workspace, OWNER, conflicts, { [conflictKey(conflicts[0])]: 'cloud' });
  expect(next.working.transactions).toEqual([cloudRow]);
  expect(next.pendingDeletions.transactions).toEqual([]);
  expect(next.deletedRows.transactions).toEqual({});
  expect(planFor(next, rows([account], [cloudRow]))).toEqual(expect.objectContaining({ ok: true, upload: [] }));
});

test('deleted in the cloud, edited here: keeping this device uploads it again; keeping the cloud accepts the deletion', async () => {
  const edited = { ...tx, merchant: 'Edited offline' };
  const workspace = ws(rows([account], [tx]), rows([account], [edited]));
  const conflicts = conflictsOf(workspace, rows([account], []));
  expect(describeConflict(conflicts[0])).toEqual(expect.objectContaining({ kind: 'deleted_there', device: edited, cloud: undefined }));

  const keepCloud = resolveOfflineConflicts(workspace, OWNER, conflicts, { [conflictKey(conflicts[0])]: 'cloud' }).workspace;
  expect(keepCloud.working.transactions).toEqual([]);
  expect(planFor(keepCloud, rows([account], []))).toEqual(expect.objectContaining({ ok: true, upload: [] }));

  const cloud = cloudOf(rows([account], []));
  const keepDevice = resolveOfflineConflicts(workspace, OWNER, conflicts, { [conflictKey(conflicts[0])]: 'device' }).workspace;
  const result = await reconcileAndCommitOfflineWorkspace({ ownerId: OWNER, workspace: keepDevice, ...cloud.deps });
  expect(result.ok).toBe(true);
  expect(cloud.calls.insert).toEqual([expect.objectContaining({ id: T, merchant: 'Edited offline' })]);
});

test('a "keep this device" choice never overwrites a cloud row that changed again after it was shown', async () => {
  const shown = { ...tx, amount: 12, updated_at: 'r2' };
  const workspace = ws(rows([account], [tx]), rows([account], [{ ...tx, amount: 10 }]));
  const conflicts = conflictsOf(workspace, rows([account], [shown]));
  const { workspace: next } = resolveOfflineConflicts(workspace, OWNER, conflicts, { [conflictKey(conflicts[0])]: 'device' });
  // Another device edits it again before this sync runs.
  const cloud = cloudOf(rows([account], [{ ...tx, amount: 99, updated_at: 'r3' }]));
  const result = await reconcileAndCommitOfflineWorkspace({ ownerId: OWNER, workspace: next, ...cloud.deps });
  expect(result.ok).toBe(false);
  expect(result.plan.conflicts[0].reason).toBe('concurrent_divergent_edits');
  expect(cloud.calls.update).toEqual([]);
  expect(cloud.get().transactions[0].amount).toBe(99);
});

test('only chosen conflicts change; the input workspace is never modified', () => {
  const t2 = { ...tx, id: '123e4567-e89b-42d3-a456-426614174014' };
  const workspace = ws(rows([account], [tx, t2]), rows([account], [{ ...tx, amount: 1 }, { ...t2, amount: 2 }]));
  const cloud = rows([account], [{ ...tx, amount: 3, updated_at: 'r2' }, { ...t2, amount: 4, updated_at: 'r2' }]);
  const conflicts = conflictsOf(workspace, cloud);
  expect(conflicts).toHaveLength(2);
  const before = JSON.stringify(workspace);
  const { workspace: next, resolved } = resolveOfflineConflicts(workspace, OWNER, conflicts, { [conflictKey(conflicts[0])]: 'cloud' });
  expect(resolved).toBe(1);
  expect(JSON.stringify(workspace)).toBe(before);
  const remaining = planFor(next, cloud);
  expect(remaining.conflicts.map(c => c.id)).toEqual([conflicts[1].id]);
  expect(next.held).toBe(true);
  expect(next.dirty).toBe(true);
});

test('refuses another owner, unsupported groups, a mismatched cloud row and unknown choices, changing nothing', () => {
  const workspace = ws(rows([account], [tx]), rows([account], [{ ...tx, amount: 10 }]));
  const [conflict] = conflictsOf(workspace, rows([account], [{ ...tx, amount: 12, updated_at: 'r2' }]));
  const key = conflictKey(conflict);
  expect(() => resolveOfflineConflicts({ ...workspace, owner: OTHER }, OWNER, [conflict], { [key]: 'device' })).toThrow();
  expect(() => resolveOfflineConflicts(workspace, OWNER, [{ ...conflict, cloud: { ...conflict.cloud, user_id: OTHER } }], { [key]: 'cloud' })).toThrow('does not belong');
  expect(() => resolveOfflineConflicts(workspace, OWNER, [{ ...conflict, cloud: { ...conflict.cloud, id: 'other' } }], { [key]: 'cloud' })).toThrow('does not belong');
  expect(() => resolveOfflineConflicts(workspace, OWNER, [{ ...conflict, group: 'budgets' }], { ['budgets:' + T]: 'cloud' })).toThrow();
  expect(() => resolveOfflineConflicts(workspace, OWNER, [conflict], { [key]: 'newest' })).toThrow();
  expect(resolveOfflineConflicts(workspace, OWNER, [conflict], {}).resolved).toBe(0);
});
