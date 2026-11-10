import { syncStatusOf } from './syncStatus';

const on = { signedIn: true, cloudSyncOn: true };

test('no cloud for this person shows nothing', () => {
  expect(syncStatusOf({ signedIn: false, cloudSyncOn: true, syncState: { status: 'offline', retry: true } }).kind).toBe('local');
  expect(syncStatusOf({ signedIn: true, cloudSyncOn: false, syncState: { status: 'offline' } }).kind).toBe('local');
});

test('each sync state maps to one clear status', () => {
  const kind = (syncState, extra = {}) => syncStatusOf({ ...on, cloudMode: false, syncState, ...extra }).kind;
  expect(kind({ status: 'checking' })).toBe('syncing');
  expect(kind({ status: 'synced' }, { cloudMode: true })).toBe('synced');
  expect(kind({ status: 'offline', retry: true })).toBe('offline');
  expect(kind({ status: 'pending', retry: true })).toBe('offline');
  expect(kind({ status: 'pending', retry: true, offline: true })).toBe('offline');
  expect(kind({ status: 'pending', retry: true, offline: false })).toBe('syncing');
  expect(kind({ status: 'waiting' })).toBe('waiting');
  expect(kind({ status: 'review' })).toBe('review');
  expect(kind({ status: 'pending', retry: false, message: 'Plan check failed' })).toBe('error');
  expect(kind({ status: 'blocked' })).toBe('error');
  // A running sync wins over an older offline state; conflicts win over waiting.
  expect(kind({ status: 'checking', retry: true })).toBe('syncing');
  expect(kind({ status: 'waiting' }, { conflicts: 2 })).toBe('review');
});

test('counts are whole and never negative', () => {
  expect(syncStatusOf({ ...on, syncState: { status: 'waiting' }, pending: 3 })).toEqual({ kind: 'waiting', pending: 3, conflicts: 0 });
  expect(syncStatusOf({ ...on, syncState: { status: 'waiting' }, pending: -2, conflicts: -1 })).toEqual({ kind: 'waiting', pending: 0, conflicts: 0 });
  expect(syncStatusOf({ ...on, syncState: { status: 'review' }, pending: 1.5, conflicts: 2 })).toEqual({ kind: 'review', pending: 0, conflicts: 2 });
});
