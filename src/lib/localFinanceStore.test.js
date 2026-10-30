import {
  loadLocalTransactions, saveLocalTransactions, loadLocalAccounts, saveLocalAccounts,
  clearLocalFinanceData,
} from './localFinanceStore';

describe('local finance persistence', () => {
  beforeEach(() => window.localStorage.clear());

  test('loads only the person\'s own saved rows and drops legacy sample rows', () => {
    const manual = { id: 'manual-1', source: 'Manual', merchant: 'Coffee' };
    window.localStorage.setItem('movo.local.transactions.v1', JSON.stringify([{ id: 'sample-1', source: 'Sample' }, manual]));
    expect(loadLocalTransactions()).toEqual([manual]);
  });

  test('never writes demo/sample rows as user transactions', () => {
    const sample = { id: 'sample-1', source: 'Sample' };
    const manual = { id: 'manual-1', source: 'Manual' };
    saveLocalTransactions([sample, manual]);
    expect(loadLocalTransactions()).toEqual([manual]);
  });

  test('does not overwrite local storage with authenticated cloud rows', () => {
    const manual = { id: 'manual-1', source: 'Manual' };
    saveLocalTransactions([manual]);
    expect(saveLocalTransactions([{ id: 'cloud-1', source: 'manual' }], true)).toBe(false);
    expect(loadLocalTransactions()).toEqual([manual]);
  });

  test('persists locally-created accounts', () => {
    const accounts = [{ id: 'local-1', name: 'Cash', account_type: 'cash' }];
    expect(saveLocalAccounts(accounts)).toBe(true);
    expect(loadLocalAccounts()).toEqual(accounts);
  });

  test('reports quota errors instead of claiming local writes succeeded', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
    });
    try {
      expect(saveLocalTransactions([{ id: 'manual-1', source: 'Manual' }])).toBe(false);
      expect(saveLocalAccounts([{ id: 'local-1', name: 'Cash' }])).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  test('reports when local finance data cannot be removed', () => {
    const spy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable', 'SecurityError');
    });
    try {
      expect(clearLocalFinanceData()).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  test('clears local finance records', () => {
    saveLocalTransactions([{ id: 'manual-1', source: 'Manual' }]);
    saveLocalAccounts([{ id: 'local-1', name: 'Cash' }]);
    expect(clearLocalFinanceData()).toBe(true);
    expect(loadLocalTransactions()).toEqual([]);
    expect(loadLocalAccounts()).toEqual([]);
  });
});
