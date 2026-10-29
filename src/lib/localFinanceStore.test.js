import {
  loadLocalTransactions, saveLocalTransactions, loadLocalAccounts, saveLocalAccounts,
  areSamplesEnabled, setSamplesEnabled, clearLocalFinanceData,
} from './localFinanceStore';

describe('local finance persistence', () => {
  beforeEach(() => window.localStorage.clear());

  test('loads demo rows only when samples are enabled and adds saved user rows', () => {
    const sample = { id: 'sample-1', source: 'Sample' };
    const manual = { id: 'manual-1', source: 'Manual', merchant: 'Coffee' };
    saveLocalTransactions([sample, manual]);
    expect(loadLocalTransactions([sample])).toEqual([sample, manual]);
    setSamplesEnabled(false);
    expect(loadLocalTransactions([sample])).toEqual([manual]);
  });

  test('never writes demo/sample rows as user transactions', () => {
    const sample = { id: 'sample-1', source: 'Sample' };
    const manual = { id: 'manual-1', source: 'Manual' };
    saveLocalTransactions([sample, manual]);
    expect(loadLocalTransactions([])).toEqual([manual]);
  });

  test('does not overwrite local storage with authenticated cloud rows', () => {
    const manual = { id: 'manual-1', source: 'Manual' };
    saveLocalTransactions([manual]);
    expect(saveLocalTransactions([{ id: 'cloud-1', source: 'manual' }], true)).toBe(false);
    expect(loadLocalTransactions([])).toEqual([manual]);
  });

  test('persists locally-created accounts', () => {
    const accounts = [{ id: 'local-1', name: 'Cash', account_type: 'cash' }];
    expect(saveLocalAccounts(accounts)).toBe(true);
    expect(loadLocalAccounts()).toEqual(accounts);
  });

  test('samples default to enabled and remember an explicit removal choice', () => {
    expect(areSamplesEnabled()).toBe(true);
    setSamplesEnabled(false);
    expect(areSamplesEnabled()).toBe(false);
  });

  test('clears local finance records and sample preference', () => {
    saveLocalTransactions([{ id: 'manual-1', source: 'Manual' }]);
    saveLocalAccounts([{ id: 'local-1', name: 'Cash' }]);
    setSamplesEnabled(false);
    expect(clearLocalFinanceData()).toBe(true);
    expect(loadLocalTransactions([])).toEqual([]);
    expect(loadLocalAccounts()).toEqual([]);
    expect(areSamplesEnabled()).toBe(true);
  });
});
