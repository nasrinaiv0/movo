/*
 * Offline-first, end to end with a signed-in account (Cloud Sync on): a save that cannot reach the cloud lands on
 * the account's device copy, every page shows it, a deletion is remembered, and when the connection is back the
 * changes upload automatically and the app returns to cloud mode. The cloud is an in-memory stand-in.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const ACCOUNT = '123e4567-e89b-42d3-a456-426614174001';
const EXISTING = '123e4567-e89b-42d3-a456-426614174002';

const mockNet = { down: false };
const mockCalls = { create: [], insert: [], remove: [] };
const mockServer = { accounts: [], transactions: [] };
const mockOffline = () => Object.assign(new TypeError('Failed to fetch'), {});
const mockCopy = value => JSON.parse(JSON.stringify(value));
let mockRevision = 0;
const mockStamp = () => `2026-11-09T00:00:00.${String(++mockRevision).padStart(6, '0')}+00:00`;

jest.mock('./lib/usePlanEntitlement', () => {
  const entitlement = { tier: 'pro', active: true, expiresAt: '2099-01-01T00:00:00Z' };
  const refreshEntitlement = async () => (mockNet.down ? null : entitlement);
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
  const read = rows => async () => { if (mockNet.down) throw mockOffline(); return mockCopy(rows()); };
  return {
    getCurrentSession: async () => session,
    listAccounts: read(() => mockServer.accounts),
    listTransactions: read(() => mockServer.transactions),
    listBudgets: read(() => []),
    listAutomationInbox: read(() => []),
    createTransaction: async row => { mockCalls.create.push(row); throw mockOffline(); },
    deleteTransaction: async id => { if (mockNet.down) throw mockOffline(); mockServer.transactions = mockServer.transactions.filter(t => t.id !== id); return id; },
    updateTransaction: async () => { throw mockOffline(); },
    createAccount: async () => { throw mockOffline(); },
    updateAccount: async () => { throw mockOffline(); },
    loadPreferences: async () => null,
    savePreferences: async () => null,
    purgeArchivedAutomations: async () => null,
    listArchivedAutomations: async () => [],
    signOut: async () => null,
  };
});
jest.mock('./lib/obligationsRepository', () => ({
  listAccountingPostings: async () => [],
  listAccountingActivities: async () => [],
  listLoans: async () => [],
  listReceivables: async () => [],
}));
jest.mock('./lib/billsRepository', () => ({ listBills: async () => [], listOccurrences: async () => [] }));
jest.mock('./lib/offlineSyncCloudAdapter', () => {
  const actual = jest.requireActual('./lib/offlineSyncCloudAdapter');
  const guard = () => { if (mockNet.down) throw mockOffline(); };
  return { ...actual,
    insertOfflineTransaction: async (row, owner) => { guard(); mockCalls.insert.push([row, owner]); actual.offlineUploadProblem('transactions', row, row.user_id || '123e4567-e89b-42d3-a456-426614174000');
      const saved = { ...row, source: String(row.source).toLowerCase() === 'manual' ? 'manual' : row.source, updated_at: mockStamp() };
      mockServer.transactions.push(saved); return saved; },
    deleteOfflineTransactionCAS: async (id, revision, owner) => { guard(); mockCalls.remove.push([id, revision, owner]);
      const row = mockServer.transactions.find(item => item.id === id);
      if (!row) return false;
      if (row.updated_at !== revision) throw new Error('Cloud transaction was updated elsewhere.');
      mockServer.transactions = mockServer.transactions.filter(item => item.id !== id); return true; },
    insertOfflineAccount: async () => { throw new Error('not expected'); },
    updateOfflineAccountCAS: async () => { throw new Error('not expected'); },
    updateOfflineTransactionCAS: async () => { throw new Error('not expected'); },
  };
});
// eslint-disable-next-line import/first
import App from './App';
// eslint-disable-next-line import/first
import { loadOfflineWorkspace } from './lib/offlineWorkspaceStore';

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
const click = async (container, name) => {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.getAttribute('aria-label') === name || item.textContent.trim() === name);
  if (!button) throw new Error('Button not found: ' + name);
  await act(async () => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
};
const nav = (container, name) => click(container, name);

describe('offline-first with Cloud Sync on', () => {
  let container; let root;
  beforeEach(async () => {
    mockNet.down = false; mockRevision = 0; mockCalls.create = []; mockCalls.insert = []; mockCalls.remove = [];
    mockServer.accounts = [{ id: ACCOUNT, user_id: OWNER, name: 'BPI', account_type: 'bank', institution_name: 'BPI', currency: 'PHP', opening_balance: 5000, is_archived: false, display_order: 0, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' }];
    mockServer.transactions = [{ id: EXISTING, user_id: OWNER, account_id: ACCOUNT, transfer_to_account_id: null, transaction_type: 'expense', amount: 120, currency: 'PHP', merchant: 'Bakery', category: 'Food', note: null, occurred_at: '2026-11-08T03:00:00+00:00', source: 'manual', external_reference: null, is_pending: false, created_at: '2026-11-08T03:00:00Z', updated_at: mockStamp(), payment_reference: null, receipt_note: null, receipt_path: null, schedule_id: null }];
    window.localStorage.clear();
    window.localStorage.setItem('movo.preferences.v3', JSON.stringify({ planWelcomeSeen: true, onboarded: true, tutorialSeen: true }));
    container = document.createElement('div'); document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root.render(<App />); });
    await waitFor(() => loadOfflineWorkspace(OWNER)?.lastConfirmedAt, 'the first cloud sync');
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); window.localStorage.clear(); });

  test('a save without internet lands on the device copy, a deletion is remembered, and both upload on reconnect', async () => {
    // 1. The connection drops while Cloud Sync is on; logging from the chat still works.
    mockNet.down = true;
    await nav(container, 'NasrinAI');
    const box = container.querySelector('textarea#movo-ai-prompt');
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(box, 'Spent 250 on Grab');
      box.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { container.querySelector('form.movo-ai-composer').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await waitFor(() => container.querySelectorAll('.chat-log-row').length === 1, 'the chat log card');
    expect(mockCalls.create).toHaveLength(1);
    const sentId = mockCalls.create[0].id;
    expect(sentId).toMatch(/^[0-9a-f-]{36}$/);
    let copy = loadOfflineWorkspace(OWNER);
    expect(copy.dirty).toBe(true);
    // The same record (same id) the cloud save tried is now on the device, linked to the real account.
    expect(copy.working.transactions.find(t => t.merchant === 'Grab')).toEqual(expect.objectContaining({ id: sentId, account_id: ACCOUNT, amount: 250 }));
    expect(mockServer.transactions).toHaveLength(1);

    // 2. Every page reads the device copy: the new record shows in Transactions next to the cloud one.
    await nav(container, 'Transactions');
    expect(container.textContent).toContain('Grab');
    expect(container.textContent).toContain('Bakery');

    // 3. Delete the cloud record while still offline: it disappears and is remembered for upload.
    window.confirm = jest.fn(() => true);
    await click(container, 'See All');
    const bakery = Array.from(container.querySelectorAll('button')).find(b => (b.getAttribute('aria-label') || '').startsWith('Bakery, '));
    await act(async () => { bakery.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await click(container, 'Delete Bakery');
    await waitFor(() => loadOfflineWorkspace(OWNER).pendingDeletions?.transactions?.includes(EXISTING), 'the deletion tombstone');
    copy = loadOfflineWorkspace(OWNER);
    expect(copy.working.transactions.map(t => t.id)).toEqual([sentId]);
    expect(mockServer.transactions.map(t => t.id)).toEqual([EXISTING]);

    // 4. The connection returns: the new record uploads, the deletion is applied, and the device copy is clean.
    mockNet.down = false;
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => loadOfflineWorkspace(OWNER).dirty === false, 'the automatic upload');
    expect(mockCalls.insert).toEqual([[expect.objectContaining({ id: sentId, merchant: 'Grab' }), OWNER]]);
    expect(mockCalls.remove).toEqual([[EXISTING, expect.any(String), OWNER]]);
    expect(mockServer.transactions.map(t => t.id)).toEqual([sentId]);
    copy = loadOfflineWorkspace(OWNER);
    expect(copy.pendingDeletions).toEqual({});
    expect(copy.baseline.transactions.map(t => t.id)).toEqual([sentId]);
    // A retry does not write anything twice.
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
    expect(mockCalls.insert).toHaveLength(1);
    expect(mockCalls.remove).toHaveLength(1);
    expect(mockServer.transactions).toHaveLength(1);
  });

  test('with Cloud Sync on, "Save locally" on a CSV import updates every page and uploads the rows', async () => {
    await nav(container, 'Wallet');
    await click(container, 'More');
    await click(container, 'Import CSV');
    const input = container.querySelector('input[type="file"][accept=".csv,text/csv"]');
    const file = new File(['Date,Description,Type,Amount,Account\n2026-11-08,Jollibee,expense,199,BPI\n'], 'import.csv', { type: 'text/csv' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
    await waitFor(() => container.textContent.includes('Preview · 1 valid row(s)'), 'the CSV preview');
    expect(container.textContent).toContain('upload to your MOVO account automatically');
    await click(container, 'Save records');
    await click(container, 'Confirm save locally');
    // Shown on the pages at once, then uploaded through the verified sync and back in cloud mode.
    await waitFor(() => mockServer.transactions.some(t => t.merchant === 'Jollibee'), 'the automatic upload');
    await waitFor(() => loadOfflineWorkspace(OWNER).dirty === false, 'a clean device copy');
    expect(mockCalls.insert).toEqual([[expect.objectContaining({ merchant: 'Jollibee', account_id: ACCOUNT, source: 'CSV Import' }), OWNER]]);
    await click(container, 'Close Import transactions');
    await nav(container, 'Transactions');
    expect(container.textContent).toContain('Jollibee');
    expect(container.textContent).toContain('Bakery');
  });

  test('deleting online keeps cloud mode: the clean device copy accepts the cloud deletion', async () => {
    window.confirm = jest.fn(() => true);
    await nav(container, 'Transactions');
    await click(container, 'See All');
    const bakery = Array.from(container.querySelectorAll('button')).find(b => (b.getAttribute('aria-label') || '').startsWith('Bakery, '));
    await act(async () => { bakery.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await click(container, 'Delete Bakery');
    await waitFor(() => loadOfflineWorkspace(OWNER).baseline.transactions.length === 0, 'the refreshed device copy');
    expect(mockServer.transactions).toHaveLength(0);
    expect(container.textContent).not.toContain('Cloud and device history differ unexpectedly');
    const copy = loadOfflineWorkspace(OWNER);
    expect(copy.dirty).toBe(false);
    expect(copy.pendingDeletions).toEqual({});
  });

  test('paid features stay available during an outage when the plan was verified', async () => {
    mockNet.down = true;
    await act(async () => { window.dispatchEvent(new Event('offline')); });
    await nav(container, 'Menu');
    // The Pro plan still shows its Gold badge while working from the device copy.
    expect(container.querySelector('.menu-hero .plan-badge .tone-gold')).not.toBeNull();
  });
});
