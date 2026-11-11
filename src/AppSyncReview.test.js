/*
 * Section 5 end to end with a signed-in account (Cloud Sync on), against an in-memory cloud:
 *  - opening MOVO syncs by itself before the first screen (latest records, offline changes uploaded with their
 *    revision check); without a connection it shows this account's device copy, never guest records;
 *  - a reconnect while MOVO is open offers "Sync local to cloud" and uploads nothing until it is tapped;
 *  - a record changed on both sides is settled by the person (keep this device / keep MOVO account), uploaded only
 *    with the cloud revision it was shown;
 *  - automatic retries back off exponentially and reconnect a clean device copy by themselves.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const ACCOUNT = '123e4567-e89b-42d3-a456-426614174001';
const BAKERY = '123e4567-e89b-42d3-a456-426614174002';

const mockNet = { down: false, gate: null, authEventFirst: false };
const mockSession = { user: { id: '123e4567-e89b-42d3-a456-426614174000', email: 'owner@example.test' }, access_token: 'test-token' };
const mockCalls = { insert: [], update: [], remove: [], entitlement: 0, sessions: [] };
const mockServer = { accounts: [], transactions: [] };
const mockOffline = () => new TypeError('Failed to fetch');
const mockCopy = value => JSON.parse(JSON.stringify(value));
let mockRevision = 0;
const mockStamp = () => `2026-11-09T00:00:00.${String(++mockRevision).padStart(6, '0')}+00:00`;

jest.mock('./lib/usePlanEntitlement', () => {
  const entitlement = { tier: 'pro', active: true, expiresAt: '2099-01-01T00:00:00Z' };
  const refreshEntitlement = async (session) => { mockCalls.entitlement += 1; mockCalls.sessions.push(session); return mockNet.down ? null : entitlement; };
  return { usePlanEntitlement: () => ({ entitlement, refreshEntitlement }) };
});
jest.mock('./lib/supabaseClient', () => ({
  supabaseConfigured: true,
  supabase: {
    // The real client reports the stored session to the listener before getSession() answers.
    auth: { onAuthStateChange: (listener) => { if (mockNet.authEventFirst) listener('INITIAL_SESSION', mockSession); return { data: { subscription: { unsubscribe() {} } } }; } },
    storage: { from: () => ({ remove: async () => ({}), upload: async () => ({ error: null }) }) },
  },
}));
jest.mock('./lib/financeRepository', () => {
  const read = rows => async () => { if (mockNet.gate) await mockNet.gate; if (mockNet.down) throw mockOffline(); return mockCopy(rows()); };
  return {
    getCurrentSession: async () => mockSession,
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
  mockNet.down = false; mockNet.gate = null; mockNet.authEventFirst = false; mockRevision = 10;
  Object.assign(mockCalls, { insert: [], update: [], remove: [], entitlement: 0, sessions: [] });
  mockServer.accounts = [account];
  window.localStorage.clear();
  window.localStorage.setItem('movo.preferences.v3', JSON.stringify({ planWelcomeSeen: true, onboarded: true, tutorialSeen: true }));
});
afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); root = null; window.localStorage.clear(); jest.useRealTimers(); });

const heldEdit = () => {
  const confirmed = bakery(120, 'r1');
  mockServer.transactions = [confirmed];
  // Saved offline in an earlier session: Bakery edited to 150 while there was no connection.
  saveOfflineWorkspace(OWNER, { baseline: groups([account], [confirmed]), working: groups([account], [{ ...confirmed, amount: 150 }]), dirty: true, held: true, lastConfirmedAt: '2026-11-08T04:00:00Z' });
  // Guest records on this device must never show under the signed-in account.
  window.localStorage.setItem('movo.local.transactions.v1', JSON.stringify([{ id: 'guest-1', account_id: 'g', transaction_type: 'expense', amount: 9, merchant: 'Guest Only', occurred_at: '2026-11-08T05:00:00Z' }]));
};
const setOnline = value => Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value });

test('opening MOVO syncs by itself: the first screen waits for it and changes saved offline upload without a tap', async () => {
  heldEdit();
  let open; mockNet.gate = new Promise(resolve => { open = resolve; });
  await launch();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
  // Nothing is shown until the sync has run: no stale screen first.
  expect(container.querySelector('.loading-screen')).not.toBeNull();
  expect(container.querySelector('.bottom-nav')).toBeNull();
  open(); mockNet.gate = null;
  await waitFor(() => container.querySelector('.bottom-nav'), 'the first screen');
  // Uploaded once, against the cloud revision this device last confirmed; no notice, nothing left to tap.
  expect(mockCalls.update).toEqual([[BAKERY, 'r1', OWNER, 150]]);
  expect(mockServer.transactions[0].amount).toBe(150);
  expect(loadOfflineWorkspace(OWNER).dirty).toBe(false);
  expect(container.querySelector('.sync-notice')).toBeNull();
  expect(container.querySelector('.sync-pill')).toBeNull();
  expect(container.textContent).toContain('₱4,850.00');
  expect(container.textContent).not.toContain('Guest Only');
});

test('opening MOVO shows the latest cloud records on its first screen, never the older device copy', async () => {
  const before = bakery(120, 'r1');
  saveOfflineWorkspace(OWNER, { baseline: groups([account], [before]), working: groups([account], [before]), dirty: false, held: false, lastConfirmedAt: '2026-11-08T04:00:00Z' });
  // Changed on another device since this one last synced.
  mockServer.transactions = [bakery(480, 'r2')];
  const seen = [];
  const watcher = new MutationObserver(() => { if (document.querySelector('.bottom-nav')) seen.push(document.body.textContent.includes('₱4,880.00') ? 'old' : document.body.textContent.includes('₱4,520.00') ? 'new' : 'other'); });
  watcher.observe(document.body, { childList: true, subtree: true, characterData: true });
  let open; mockNet.gate = new Promise(resolve => { open = resolve; });
  await launch();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
  expect(container.querySelector('.loading-screen')).not.toBeNull();
  open(); mockNet.gate = null;
  await waitFor(() => container.querySelector('.bottom-nav') && container.textContent.includes('₱4,520.00'), 'the latest records');
  watcher.disconnect();
  expect(seen).not.toContain('old');
  expect(seen).toContain('new');
  expect(mockCalls.update).toHaveLength(0);
  expect(container.querySelector('.sync-pill')).toBeNull();
});

test('the first screen also waits when the sign-in listener reports the session before the launch check does', async () => {
  const before = bakery(120, 'r1');
  saveOfflineWorkspace(OWNER, { baseline: groups([account], [before]), working: groups([account], [before]), dirty: false, held: false, lastConfirmedAt: '2026-11-08T04:00:00Z' });
  mockServer.transactions = [bakery(480, 'r2')];
  mockNet.authEventFirst = true;
  let open; mockNet.gate = new Promise(resolve => { open = resolve; });
  await launch();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 150)); });
  // The older device copy (₱4,880.00) must not be on screen while the sync is still running.
  expect(container.querySelector('.loading-screen')).not.toBeNull();
  expect(container.querySelector('.bottom-nav')).toBeNull();
  open(); mockNet.gate = null;
  await waitFor(() => container.querySelector('.bottom-nav'), 'the first screen');
  expect(container.textContent).toContain('₱4,520.00');
  expect(container.textContent).not.toContain('₱4,880.00');
});

test('opened without a connection: the device copy shows at once, and a reconnect while open offers Sync local to cloud', async () => {
  heldEdit();
  mockNet.down = true; setOnline(false);
  try {
    await launch();
    await waitFor(() => container.querySelector('.bottom-nav'), 'the first screen', 1500);
    expect(container.textContent).toContain('₱4,850.00');
    expect(container.textContent).not.toContain('Guest Only');
    await waitFor(() => container.querySelector('.sync-pill'), 'the offline bar');
    expect(container.querySelector('.sync-pill').textContent).toBe('Offline · 1 change saved on this device');
    expect(mockCalls.update).toHaveLength(0);
    // The connection returns while MOVO is open: the notice, and nothing uploads until it is tapped.
    mockNet.down = false; setOnline(true);
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => container.querySelector('.sync-notice'), 'the reconnect notice');
    expect(container.querySelector('.sync-notice').textContent).toContain('Your internet connection has been restored.');
    expect(mockCalls.update).toHaveLength(0);
    expect(loadOfflineWorkspace(OWNER).working.transactions[0].amount).toBe(150);
    await click(container, 'Sync local to cloud');
    await waitFor(() => loadOfflineWorkspace(OWNER).dirty === false, 'the approved upload');
    expect(mockCalls.update).toEqual([[BAKERY, 'r1', OWNER, 150]]);
    expect(mockServer.transactions[0].amount).toBe(150);
  } finally { setOnline(true); }
});

test('a cloud that does not answer in time: the launch screen gives way to the device copy, which updates when the sync lands', async () => {
  const before = bakery(120, 'r1');
  saveOfflineWorkspace(OWNER, { baseline: groups([account], [before]), working: groups([account], [before]), dirty: false, held: false, lastConfirmedAt: '2026-11-08T04:00:00Z' });
  mockServer.transactions = [bakery(480, 'r2')];
  let open; mockNet.gate = new Promise(resolve => { open = resolve; });
  jest.useFakeTimers();
  const settle = async () => { for (let i = 0; i < 30; i += 1) await act(async () => { await Promise.resolve(); }); };
  await launch(); await settle();
  await act(async () => { jest.advanceTimersByTime(5900); }); await settle();
  expect(container.querySelector('.bottom-nav')).toBeNull();
  await act(async () => { jest.advanceTimersByTime(200); }); await settle();
  expect(container.querySelector('.bottom-nav')).not.toBeNull();
  expect(container.textContent).toContain('₱4,880.00');
  open(); mockNet.gate = null; await settle();
  jest.useRealTimers();
  await waitFor(() => container.textContent.includes('₱4,520.00'), 'the records from the late sync');
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
  // Opening MOVO syncs by itself; the conflict stops it and asks for a review instead of picking a side.
  await waitFor(() => container.querySelector('.sync-pill'), 'the review state');
  expect(container.querySelector('.sync-notice')).toBeNull();
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

test('launch verifies the plan with the stored session, so a healthy connection never starts as Offline', async () => {
  mockServer.transactions = [bakery(120, 'r1')];
  await launch();
  await waitFor(() => container.querySelector('.bottom-nav') && container.textContent.includes('₱4,880.00'), 'the cloud records');
  // The session is handed over: at launch the plan hook has not rendered with it yet, and "no session" used to be
  // reported as an unreachable cloud (Offline for several seconds, then a retry).
  expect(mockCalls.sessions[0]).toEqual(expect.objectContaining({ access_token: 'test-token', user: expect.objectContaining({ id: OWNER }) }));
  expect(mockCalls.entitlement).toBe(1);
  expect(container.querySelector('.sync-bar')).toBeNull();
});

test('a change made offline is counted in the bar as soon as it is saved on this device', async () => {
  mockServer.transactions = [bakery(120, 'r1')];
  await launch();
  await waitFor(() => container.querySelector('.bottom-nav') && container.textContent.includes('₱4,880.00'), 'the cloud records');
  mockNet.down = true;
  await act(async () => { window.dispatchEvent(new Event('offline')); });
  await waitFor(() => container.querySelector('.sync-pill'), 'the offline bar');
  expect(container.querySelector('.sync-pill').textContent).toBe('Offline · Showing the copy saved on this device.');
  // Delete the record while offline: one change is now waiting on this device.
  await click(container, 'Transactions');
  await act(async () => { Array.from(container.querySelectorAll('button')).find(b => (b.getAttribute('aria-label') || '').startsWith('Bakery,')).dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await click(container, 'Delete Bakery');
  await act(async () => { document.querySelector('.confirm-dialog .confirm-accept').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await waitFor(() => container.querySelector('.sync-pill')?.textContent === 'Offline · 1 change saved on this device', 'the pending count');
  expect(mockCalls.remove).toHaveLength(0);
  expect(mockServer.transactions).toHaveLength(1);
});
