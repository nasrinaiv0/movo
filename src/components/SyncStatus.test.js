import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { SyncBar, SyncSheet, syncStatusDetail, syncStatusLabel } from './SyncStatus';
import { ConfirmHost } from './ConfirmDialog';

global.IS_REACT_ACT_ENVIRONMENT = true;

const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const ACCOUNT = { id: 'a1', name: 'BPI Savings' };
const base = { id: 't1', user_id: OWNER, account_id: 'a1', transaction_type: 'expense', merchant: 'Grab', amount: 250, currency: 'PHP', category: 'Transportation', occurred_at: '2026-11-05T03:00:00Z' };
const edited = { group: 'transactions', id: 't1', reason: 'concurrent_divergent_edits', local: { ...base, amount: 300, category: 'transport' }, cloud: { ...base, amount: 275, merchant: 'Grab Car' } };
const deletedHere = { group: 'transactions', id: 't1', reason: 'deleted_locally_changed_remotely', cloud: { ...base, amount: 275 } };
const status = (kind, extra = {}) => ({ kind, pending: 0, conflicts: 0, ...extra });
const click = el => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

describe('sync status UI', () => {
  let container; let root;
  beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  const render = node => act(() => root.render(<ConfirmHost>{node}</ConfirmHost>));

  test('nothing is shown while synced, syncing or without the cloud', () => {
    for (const kind of ['synced', 'syncing', 'local']) {
      render(<SyncBar status={status(kind)} onSync={() => {}} onOpen={() => {}} onHide={() => {}} />);
      expect(container.querySelector('.sync-pill, .sync-notice')).toBeNull();
    }
  });

  test('offline shows a pill that says how many changes are saved on this device', async () => {
    const onOpen = jest.fn();
    render(<SyncBar status={status('offline')} onOpen={onOpen} />);
    expect(container.querySelector('.sync-pill').textContent).toBe('Offline · Showing the copy saved on this device.');
    render(<SyncBar status={status('offline', { pending: 1 })} onOpen={onOpen} />);
    expect(container.querySelector('.sync-pill').textContent).toBe('Offline · 1 change saved on this device');
    render(<SyncBar status={status('offline', { pending: 3 })} onOpen={onOpen} />);
    expect(container.querySelector('.sync-pill').textContent).toBe('Offline · 3 changes saved on this device');
    await click(container.querySelector('.sync-pill'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test('back online: the required notice and its Sync local to cloud action; nothing runs until it is tapped', async () => {
    const onSync = jest.fn(); const onHide = jest.fn();
    render(<SyncBar status={status('waiting', { pending: 2 })} reason="reconnected" noticeHidden={false} busy={false} onSync={onSync} onOpen={() => {}} onHide={onHide} />);
    const notice = container.querySelector('.sync-notice');
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.querySelector('strong').textContent).toBe('Your internet connection has been restored.');
    expect(notice.textContent).toContain('2 changes on this device are ready to sync.');
    const action = notice.querySelector('.sync-notice-action');
    expect(action.textContent).toBe('Sync local to cloud');
    expect(onSync).not.toHaveBeenCalled();
    await click(action);
    expect(onSync).toHaveBeenCalledTimes(1);
    await click(notice.querySelector('.sync-notice-hide'));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  test('a dismissed notice stays reachable as a pill; a running sync disables the action', () => {
    render(<SyncBar status={status('waiting', { pending: 1 })} noticeHidden onOpen={() => {}} />);
    expect(container.querySelector('.sync-notice')).toBeNull();
    expect(container.querySelector('.sync-pill').textContent).toBe('Ready to sync · 1 change on this device is ready to sync.');
    render(<SyncBar status={status('waiting', { pending: 1 })} noticeHidden={false} busy onSync={() => {}} onHide={() => {}} />);
    expect(container.querySelector('.sync-notice-action').disabled).toBe(true);
  });

  test('review and paused states have their own pill', () => {
    render(<SyncBar status={status('review', { conflicts: 1 })} onOpen={() => {}} />);
    expect(container.querySelector('.sync-pill').textContent).toBe('Sync needs your review');
    expect(container.querySelector('.sync-pill').className).toContain('tone-amber');
    render(<SyncBar status={status('error')} onOpen={() => {}} />);
    expect(container.querySelector('.sync-pill').textContent).toBe('Sync paused');
  });

  test('labels and details for Menu and Settings rows', () => {
    expect(['syncing', 'synced', 'offline', 'waiting', 'review', 'error'].map(syncStatusLabel)).toEqual(['Syncing…', 'Synced', 'Offline', 'Ready to sync', 'Needs your review', 'Sync paused']);
    expect(syncStatusLabel('local')).toBe('');
    expect(syncStatusDetail(status('review', { conflicts: 2 }))).toBe('2 records changed both on this device and in your MOVO account.');
    expect(syncStatusDetail(status('error'), { message: 'Cloud Sync requires verified active access. Local records remain on this device.' })).toBe('Cloud Sync requires verified active access. Local records remain on this device. Nothing was discarded.');
  });

  test('conflict review shows both versions, marks what differs and blocks syncing until a choice is made', async () => {
    const onResolve = jest.fn(); const onSync = jest.fn();
    render(<SyncSheet status={status('review', { conflicts: 1 })} syncState={{}} conflicts={[edited]} accounts={[ACCOUNT]} busy={false} onSync={onSync} onResolve={onResolve} onClose={() => {}} />);
    const [device, cloud] = container.querySelectorAll('.sync-version');
    expect(device.querySelector('small').textContent).toBe('This device');
    expect(cloud.querySelector('small').textContent).toBe('MOVO account');
    const field = (box, name) => Array.from(box.querySelectorAll('dl > div')).find(row => row.querySelector('dt').textContent === name);
    expect(field(device, 'Amount').querySelector('dd').textContent).toBe('₱300.00');
    expect(field(cloud, 'Amount').querySelector('dd').textContent).toBe('₱275.00');
    expect(field(device, 'Amount').className).toBe('changed');
    expect(field(cloud, 'Description').querySelector('dd').textContent).toBe('Grab Car');
    expect(field(cloud, 'Description').className).toBe('changed');
    expect(field(device, 'Account').querySelector('dd').textContent).toBe('BPI Savings');
    // A category stored as an id on one side and as its older label on the other is the same category.
    expect(field(device, 'Category').querySelector('dd').textContent).toBe('Transportation');
    expect(field(cloud, 'Category').querySelector('dd').textContent).toBe('Transportation');
    expect(field(device, 'Category').className).toBe('');
    expect(field(device, 'Type').className).toBe('');
    const action = container.querySelector('.sync-sheet-action');
    expect(action.disabled).toBe(true);
    await click(action);
    expect(onSync).not.toHaveBeenCalled();
    const [keepDevice, keepCloud] = container.querySelectorAll('.sync-choice button');
    await click(keepDevice);
    expect(onResolve).toHaveBeenLastCalledWith(edited, 'device');
    await click(keepCloud);
    expect(onResolve).toHaveBeenLastCalledWith(edited, 'cloud');
    expect(document.querySelector('.confirm-dialog')).toBeNull(); // neither choice deletes anything
  });

  test('a choice that deletes the record asks first and does nothing when cancelled', async () => {
    const onResolve = jest.fn();
    render(<SyncSheet status={status('review', { conflicts: 1 })} syncState={{}} conflicts={[deletedHere]} accounts={[ACCOUNT]} busy={false} onSync={() => {}} onResolve={onResolve} onClose={() => {}} />);
    expect(container.querySelector('.sync-version-deleted').textContent).toBe('Deleted on this device');
    const [keepDevice, keepCloud] = container.querySelectorAll('.sync-choice button');
    await click(keepDevice); // keeping this device's deletion removes the record everywhere
    expect(document.querySelector('.confirm-dialog')).not.toBeNull();
    expect(onResolve).not.toHaveBeenCalled();
    await click(document.querySelector('.confirm-dialog .confirm-cancel'));
    expect(onResolve).not.toHaveBeenCalled();
    await click(keepDevice);
    await click(document.querySelector('.confirm-dialog .confirm-accept'));
    expect(onResolve).toHaveBeenCalledWith(deletedHere, 'device');
    onResolve.mockClear();
    await click(keepCloud); // keeping the cloud row restores it: no confirmation
    expect(document.querySelector('.confirm-dialog')).toBeNull();
    expect(onResolve).toHaveBeenCalledWith(deletedHere, 'cloud');
  });

  test('once every conflict has a choice the sheet offers the sync; synced shows when it last matched', async () => {
    const onSync = jest.fn().mockResolvedValue(true);
    render(<SyncSheet status={status('review', { pending: 1 })} syncState={{}} conflicts={[]} accounts={[]} busy={false} onSync={onSync} onResolve={() => {}} onClose={() => {}} />);
    expect(container.querySelector('.sync-summary strong').textContent).toBe('Ready to sync');
    const action = container.querySelector('.sync-sheet-action');
    expect(action.disabled).toBe(false);
    expect(action.textContent).toBe('Sync local to cloud');
    await click(action);
    expect(onSync).toHaveBeenCalledTimes(1);
    render(<SyncSheet status={status('synced')} syncState={{}} conflicts={[]} accounts={[]} lastSyncedAt="2026-11-09T04:30:00Z" busy={false} onSync={onSync} onResolve={() => {}} onClose={() => {}} />);
    expect(container.querySelector('.sync-summary strong').textContent).toBe('Synced');
    expect(container.querySelector('.sync-summary small').textContent).toMatch(/^Last synced .*2026/);
    expect(container.querySelector('.sync-sheet-action').textContent).toBe('Sync now');
  });
});
