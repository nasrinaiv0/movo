/*
 * Section 5 end to end with a signed-in account (Cloud Sync on), against an in-memory cloud:
 *  - offline changes survive a relaunch and still wait for "Sync local to cloud";
 *  - launch shows this account's own device copy at once and never guest records;
 *  - a record changed on both sides is settled by the person (keep this device / keep MOVO account), uploaded only
 *    with the cloud revision it was shown;
 *  - automatic retries back off exponentially and reconnect a clean device copy by themselves.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const ACCOUNT = '123e4567-e89b-42d3-a456-426614174001';
const BAKERY = '123e4567-e89b-42d3-a456-426614174002';

const mockNet = { down: false, gate: null };
const mockCalls = { insert: [], update: [], remove: [], entitlement: 0 };
const mockServer = { accounts: [], transactions: [] };
const mockOffline = () => new TypeError('Failed to fetch');
const mockCopy = value => JSON.parse(JSON.stringify(value));
let mockRevision = 0;
const mockStamp = () => `2026-11-09T00:00:00.${String(++mockRevision).padStart(6, '0')}+00:00`;

jest.mock('./lib/usePlanEntitlement', () => {
  const entitlement = { tier: 'pro', active: true, expiresAt: '2099-01-01T00:00:00Z' };
  const refreshEntitlement = async () => { mockCalls.entitlement += 1; return mockNet.down ? null : entitlement; };
  return { usePlanEntitlement: () => ({ entitlement, refreshEntitlement }) };
});
jest.mock('./lib/supabaseClient', () => ({
  supabaseConfigured: true,
  supabase: {
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    storage: { from: () => ({ remove: async () => ({}), upload: async () => ({ error: null }) }) },
  },
}));
jest.mock('./lib/financeRepository', () => {
  const session = { user: { id: '123e4567-e89b-42d3-a456-426614174000', email: 'owner@example.test' }, access_token: 'test-token' };
  const read = rows => async () => { if (mockNet.gate) await mockNet.gate; if (mockNet.down) throw mockOffline(); return mockCopy(rows()); };
  return {
    getCurrentSession: async () => session,
    listAccounts: read(() => mockServer.accounts),
    listTransactions: read(() => mockServer.transactions),
    listBudgets: read(() => []),
    listAutomationInbox: read(() => []),
    createTransaction: async () => { throw mockOffline(); },
    deleteTransaction: async () => { throw mockOffline(); },
    updateTransaction: async () => { throw mockOffline(); },
    createAccount: async () => { throw mockOffline(); },
    updateAccount: async () => { throw mockOffline(); },
    loadPreferences: async () => null,
    savePreferences: async () => null,
    purgeArchivedAutomations: async () => null,
    listArchivedAutomations: async () => [],
    signOut: async () => ({ localOnly: false }),
  };
});
jest.mock('./lib/obligationsRepository', () => ({
  listAccountingPostings: async () => [], listAccountingActivities: async () => [], listLoans: async () => [], listReceivables: async () => [],
}));
jest.mock('./lib/billsRepository', () => ({ listBills: async () => [], listOccurrences: async () => [] }));
jest.mock('./lib/offlineSyncCloudAdapter', () => {
  const actual = jest.requireActual('./lib/offlineSyncCloudAdapter');
  const guard = () => { if (mockNet.down) throw mockOffline(); };
  return { ...actual,
    insertOfflineTransaction: async (row, owner) => { guard(); mockCalls.insert.push([row, owner]); const saved = { ...row, updated_at: mockStamp() }; mockServer.transactions.push(saved); return saved; },
    updateOfflineTransactionCAS: async (row, revision, owner) => { guard(); mockCalls.update.push([row.id, revision, owner, row.amount]);
      const current = mockServer.transactions.find(item => item.id === row.id);
      if (!current || current.updated_at !== revision) throw new Error('Cloud transaction was updated elsewhere.');
      const saved = { ...current, amount: row.amount, merchant: row.merchant, updated_at: mockStamp() };
      mockServer.transactions = mockServer.transactions.map(item => (item.id === row.id ? saved : item)); return saved; },
    deleteOfflineTransactionCAS: async (id, revision, owner) => { guard(); mockCalls.remove.push([id, revision, owner]); return false; },
    insertOfflineAccount: async () => { throw new Error('not expected'); },
    updateOfflineAccountCAS: async () => { throw new Error('not expected'); },
  };
});
// eslint-disable-next-line import/first
import App from './App';
// eslint-disable-next-line import/first
import { loadOfflineWorkspace, saveOfflineWorkspace } from './lib/offlineWorkspaceStore';

global.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = jest.fn();

async function waitFor(check, label, ms = 4000) {
  const start = Date.now();
  for (;;) {
    let ok = false;
    try { ok = !!check(); } catch { ok = false; }
    if (ok) return;
    if (Date.now() - start > ms) throw new Error('Timed out waiting for ' + label);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
  }
}
const buttonNamed = (container, name) => Array.from(container.querySelectorAll('button')).find(item => item.getAttribute('aria-label') === name || item.textContent.trim() === name);
const click = async (container, name) => {
  const button = buttonNamed(container, name);
  if (!button) throw new Error('Button not found: ' + name);
  await act(async () => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
};

const account = { id: ACCOUNT, user_id: OWNER, name: 'BPI', account_type: 'bank', institution_name: 'BPI', currency: 'PHP', opening_balance: 5000, is_archived: false, display_order: 0, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' };
const bakery = (amount, updatedAt) => ({ id: BAKERY, user_id: OWNER, account_id: ACCOUNT, transfer_to_account_id: null, transaction_type: 'expense', amount, currency: 'PHP', merchant: 'Bakery', category: 'Food', note: null, occurred_at: '2026-11-08T03:00:00+00:00', source: 'manual', external_reference: null, is_pending: false, created_at: '2026-11-08T03:00:00Z', updated_at: updatedAt, payment_reference: null, receipt_note: null, receipt_path: null, schedule_id: null });
const groups = (accounts, transactions) => ({ financial_accounts: accounts, transactions });

let container; let root;
async function launch() {
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(<App />); });
}
beforeEach(() => {
  mockNet.down = false; mockNet.gate = null; mockRevision = 10;
  Object.assign(mockCalls, { insert: [], update: [], remove: [], entitlement: 0 });
  mockServer.accounts = [account];
  window.localStorage.clear();
  window.localStorage.setItem('movo.preferences.v3', JSON.stringify({ planWelcomeSeen: true, onboarded: true, tutorialSeen: true }));
});
afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); root = null; window.localStorage.clear(); jest.useRealTimers(); });

test('offline changes survive a relaunch: the device copy shows at once and they still wait for Sync local to cloud', async () => {
  const confirmed = bakery(120, 'r1');
  mockServer.transactions = [confirmed];
  // Saved offline in an earlier session: Bakery edited to 150 while there was no connection.
  saveOfflineWorkspace(OWNER, { baseline: groups([account], [confirmed]), working: groups([account], [{ ...confirmed, amount: 150 }]), dirty: true, held: true, lastConfirmedAt: '2026-11-08T04:00:00Z' });
  // Guest records on this device must never show under the signed-in account.
  window.localStorage.setItem('movo.local.transactions.v1', JSON.stringify([{ id: 'guest-1', account_id: 'g', transaction_type: 'expense', amount: 9, merchant: 'Guest Only', occurred_at: '2026-11-08T05:00:00Z' }]));
  // The cloud answers slowly: the first screen must not wait for it.
  let open; mockNet.gate = new Promise(resolve => { open = resolve; });
  await launch();
  await waitFor(() => container.querySelector('.bottom-nav'), 'the first screen');
  await click(container, 'Transactions');
  expect(container.textContent).toContain('Bakery');
  expect(container.textContent).not.toContain('Guest Only');
  open(); mockNet.gate = null;
  await waitFor(() => container.querySelector('.sync-notice'), 'the reconnect notice');
  expect(container.querySelector('.sync-notice').textContent).toContain('Your internet connection has been restored.');
  expect(mockCalls.update).toHaveLength(0);
  expect(loadOfflineWorkspace(OWNER).working.transactions[0].amount).toBe(150);
  expect(container.textContent).not.toContain('Guest Only');

  await click(container, 'Sync local to cloud');
  await waitFor(() => loadOfflineWorkspace(OWNER).dirty === false, 'the approved upload');
  expect(mockCalls.update).toEqual([[BAKERY, 'r1', OWNER, 150]]);
  expect(mockServer.transactions[0].amount).toBe(150);
  expect(container.textContent).toContain('Synced with your MOVO account.');
});

test('with no device copy yet, launch waits for the cloud (briefly) instead of showing guest records', async () => {
  mockServer.transactions = [bakery(120, 'r1')];
  window.localStorage.setItem('movo.local.transactions.v1', JSON.stringify([{ id: 'guest-1', account_id: 'g', transaction_type: 'expense', amount: 9, merchant: 'Guest Only', occurred_at: '2026-11-08T05:00:00Z' }]));
  let open; mockNet.gate = new Promise(resolve => { open = resolve; });
  await launch();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
  expect(container.querySelector('.loading-screen')).not.toBeNull();
  expect(container.textContent).not.toContain('Guest Only');
  open(); mockNet.gate = null;
  await waitFor(() => container.querySelector('.bottom-nav'), 'the first screen');
  await click(container, 'Transactions');
  expect(container.textContent).toContain('Bakery');
  expect(container.textContent).not.toContain('Guest Only');
  expect(loadOfflineWorkspace(OWNER).lastConfirmedAt).toBeTruthy();
});

async function launchWithConflict() {
  const confirmed = bakery(120, 'r1');
  // Another device changed Bakery to 130 while this one, offline, changed it to 150.
  mockServer.transactions = [bakery(130, 'r2')];
  saveOfflineWorkspace(OWNER, { baseline: groups([account], [confirmed]), working: groups([account], [{ ...confirmed, amount: 150 }]), dirty: true, held: true, lastConfirmedAt: '2026-11-08T04:00:00Z' });
  await launch();
  await waitFor(() => container.querySelector('.sync-notice'), 'the reconnect notice');
  await click(container, 'Sync local to cloud');
  await waitFor(() => container.querySelector('.sync-pill'), 'the review state');
  expect(container.querySelector('.sync-pill').textContent).toContain('Sync needs your review');
  // Nothing was uploaded or changed on either side.
  expect(mockCalls.update).toHaveLength(0);
  expect(mockServer.transactions[0].amount).toBe(130);
  expect(loadOfflineWorkspace(OWNER).working.transactions[0].amount).toBe(150);
  await act(async () => { container.querySelector('.sync-pill').click(); });
  const card = container.querySelector('.sync-conflict');
  expect(card).not.toBeNull();
  const [device, cloud] = card.querySelectorAll('.sync-version');
  expect(device.textContent).toContain('This device');
  expect(device.textContent).toContain('150.00');
  expect(cloud.textContent).toContain('MOVO account');
  expect(cloud.textContent).toContain('130.00');
  // Only the differing field is marked.
  expect(Array.from(device.querySelectorAll('.changed dt')).map(dt => dt.textContent)).toEqual(['Amount']);
  // The sync button waits until every conflict has a choice.
  expect(container.querySelector('.sync-sheet-action').disabled).toBe(true);
}

test('a record changed on both sides: keeping this device uploads it against the cloud revision shown', async () => {
  await launchWithConflict();
  await click(container, 'Keep this device');
  expect(container.querySelector('.sync-conflict')).toBeNull();
  expect(mockCalls.update).toHaveLength(0);
  const action = container.querySelector('.sync-sheet-action');
  expect(action.disabled).toBe(false);
  await act(async () => { action.click(); });
  await waitFor(() => loadOfflineWorkspace(OWNER).dirty === false, 'the sync');
  expect(mockCalls.update).toEqual([[BAKERY, 'r2', OWNER, 150]]);
  expect(mockServer.transactions[0].amount).toBe(150);
});

test('a record changed on both sides: keeping the MOVO account uploads nothing and the device takes the cloud row', async () => {
  await launchWithConflict();
  await click(container, 'Keep MOVO account');
  expect(loadOfflineWorkspace(OWNER).working.transactions[0].amount).toBe(130);
  await act(async () => { container.querySelector('.sync-sheet-action').click(); });
  await waitFor(() => loadOfflineWorkspace(OWNER).dirty === false, 'the sync');
  expect(mockCalls.update).toHaveLength(0);
  expect(mockServer.transactions[0].amount).toBe(130);
  expect(loadOfflineWorkspace(OWNER).working.transactions[0].amount).toBe(130);
});

test('automatic retries back off exponentially and reconnect a clean device copy by themselves', async () => {
  mockServer.transactions = [bakery(120, 'r1')];
  await launch();
  await waitFor(() => loadOfflineWorkspace(OWNER)?.lastConfirmedAt, 'the first cloud sync');
  jest.useFakeTimers();
  jest.spyOn(Math, 'random').mockReturnValue(0.5); // no jitter: 5s, 10s, 20s…
  const settle = async () => { for (let i = 0; i < 30; i += 1) await act(async () => { await Promise.resolve(); }); };
  const advance = async ms => { await act(async () => { jest.advanceTimersByTime(ms); }); await settle(); };
  mockNet.down = true;
  await act(async () => { window.dispatchEvent(new Event('offline')); });
  await settle();
  expect(container.querySelector('.sync-pill').textContent).toContain('Offline');
  const before = mockCalls.entitlement;
  await advance(4900);
  expect(mockCalls.entitlement).toBe(before);
  await advance(200);
  expect(mockCalls.entitlement).toBe(before + 1);
  await advance(9800);
  expect(mockCalls.entitlement).toBe(before + 1);
  await advance(300);
  expect(mockCalls.entitlement).toBe(before + 2);
  // The connection is back; the next attempt (20s later) reconnects the clean copy without any tap.
  mockNet.down = false;
  await advance(20100);
  expect(mockCalls.entitlement).toBe(before + 3);
  expect(container.querySelector('.sync-pill')).toBeNull();
  expect(container.querySelector('.sync-notice')).toBeNull();
  expect(loadOfflineWorkspace(OWNER).held).toBe(false);
  Math.random.mockRestore();
});
