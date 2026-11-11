import 'fake-indexeddb/auto';
import { webcrypto } from 'crypto';
import { clearHybridOwner } from './lib/hybridLocalStore';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

if(typeof global.structuredClone!=='function')global.structuredClone=value=>JSON.parse(JSON.stringify(value));
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});

const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const ACCOUNT = '123e4567-e89b-42d3-a456-426614174001';
let mockAuthCallback;
let mockReleaseRecovery;
const mockGetEntitlements = jest.fn();
jest.mock('./lib/nativePurchases', () => ({
  ...jest.requireActual('./lib/nativePurchases'),
  getStoreEntitlements: (...args) => mockGetEntitlements(...args),
  isNativePurchasePlatform: () => false,
}));
jest.mock('./lib/hybridWorkspaceRecovery', () => ({
  recoverHybridWorkspace: jest.fn(() => new Promise(resolve => { mockReleaseRecovery = resolve; })),
}));
jest.mock('./lib/supabaseClient', () => ({
  supabaseConfigured: true,
  supabase: {
    auth: { onAuthStateChange: callback => { mockAuthCallback = callback; return { data: { subscription: { unsubscribe() {} } } }; } },
    storage: { from: () => ({ remove: async () => ({}), upload: async () => ({ error: null }) }) },
  },
}));
jest.mock('./lib/financeRepository', () => ({
  getCurrentSession: async () => null,
  listAccounts: async () => [], listTransactions: async () => [],
  listBudgets: async () => [], listAutomationInbox: async () => [],
  loadPreferences: async () => null, savePreferences: async () => null,
  purgeArchivedAutomations: async () => null, listArchivedAutomations: async () => [],
}));
jest.mock('./lib/obligationsRepository', () => ({
  listAccountingPostings: async () => [],
  listAccountingActivities: async () => [],
  listLoans: async () => [],
  listReceivables: async () => [],
}));
jest.mock('./lib/billsRepository', () => ({ listBills: async () => [], listOccurrences: async () => [] }));
// eslint-disable-next-line import/first
import App from './App';
// eslint-disable-next-line import/first
import { saveOfflineWorkspace } from './lib/offlineWorkspaceStore';
// eslint-disable-next-line import/first
import { recoverHybridWorkspace } from './lib/hybridWorkspaceRecovery';

global.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = jest.fn();

const click = async (container, name) => {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.getAttribute('aria-label') === name || item.textContent.trim() === name || item.querySelector('strong')?.textContent === name);
  if (!button) throw new Error('Button not found: ' + name);
  await act(async () => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
};
const nav = (container, name) => click(container, name);

describe('sign-in session handoff', () => {
  let container; let root;
  const session = { user: { id: OWNER, email: 'owner@example.test' }, access_token: 'complete-session-token' };
  beforeEach(async () => {
    await clearHybridOwner(OWNER);
    localStorage.clear();
    localStorage.setItem('movo.preferences.v3', JSON.stringify({ planWelcomeSeen: true, onboarded: true, tutorialSeen: true }));
    mockGetEntitlements.mockReset();
    mockGetEntitlements.mockImplementation(() => new Promise(() => {}));
    recoverHybridWorkspace.mockReset();
    recoverHybridWorkspace.mockImplementation(() => new Promise(resolve => { mockReleaseRecovery = resolve; }));
    container = document.createElement('div'); document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root.render(<App />); });
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); localStorage.clear(); });

  test('auth events recover the owner cache before rendering, without waiting for cloud entitlement', async () => {
    const working = { financial_accounts: [{ id: ACCOUNT, user_id: OWNER, name: 'Saved bank', account_type: 'bank', currency: 'PHP', opening_balance: 5000 }], transactions: [] };
    saveOfflineWorkspace(OWNER, { version: 2, owner: OWNER, baseline: working, working, dirty: false, lastConfirmedAt: '2026-11-10T00:00:00Z' });
    await act(async () => { mockAuthCallback('SIGNED_IN', session); await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(container.textContent).toContain('Preparing your secure MOVO space');
    // The real entitlement hook has now rerendered with a complete session.
    // Previously its changing callback tore down the auth effect mid-recovery.
    await act(async () => { mockReleaseRecovery(); });
    expect(container.querySelector('.bottom-nav')).not.toBeNull();
    expect(container.textContent).not.toContain('Preparing your secure MOVO space');
    expect(mockGetEntitlements).toHaveBeenCalledTimes(1);
    expect(mockGetEntitlements).toHaveBeenCalledWith(session);
    await nav(container, 'Wallet');
    expect(container.textContent).toContain('₱5,000.00');
    await act(async () => { mockAuthCallback('TOKEN_REFRESHED', { ...session, access_token: 'renewed-token' }); await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(container.querySelector('.bottom-nav')).not.toBeNull();
    expect(mockGetEntitlements).toHaveBeenLastCalledWith({ ...session, access_token: 'renewed-token' });
  });

  test('a signed-in user in device mode can open account deletion without a cloud entitlement', async () => {
    const working = { financial_accounts: [], transactions: [] };
    saveOfflineWorkspace(OWNER, { version: 2, owner: OWNER, baseline: working, working, dirty: false, lastConfirmedAt: '2026-11-10T00:00:00Z' });
    await act(async () => { mockAuthCallback('SIGNED_IN', session); await new Promise(resolve => setTimeout(resolve, 10)); });
    await act(async () => { mockReleaseRecovery(); });
    await nav(container, 'Menu');
    await click(container, 'Settings');
    await click(container, 'Delete Account');
    expect(container.querySelector('[aria-label="Type DELETE to confirm"]')).not.toBeNull();
  });

  test('a different owner cannot see another account cache while first cloud load is pending', async () => {
    const working = { financial_accounts: [{ id: ACCOUNT, user_id: OWNER, name: 'Private bank', account_type: 'bank' }], transactions: [] };
    saveOfflineWorkspace(OWNER, { version: 2, owner: OWNER, baseline: working, working, dirty: false, lastConfirmedAt: '2026-11-10T00:00:00Z' });
    await act(async () => { mockAuthCallback('SIGNED_IN', { ...session, user: { id: 'different-owner' } }); await new Promise(resolve => setTimeout(resolve, 10)); });
    await act(async () => { mockReleaseRecovery(); });
    expect(container.textContent).toContain('Preparing your secure MOVO space');
    expect(container.textContent).not.toContain('Private bank');
  });
});
