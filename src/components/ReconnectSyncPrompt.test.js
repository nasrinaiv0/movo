import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ReconnectSyncPrompt from './ReconnectSyncPrompt';

global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const open = (props) => act(() => root.render(<div className="movo-app"><ReconnectSyncPrompt {...props} /></div>));
const button = (text) => [...document.querySelectorAll('.reconnect-actions button')].find(b => b.textContent === text);

test('asks in plain, professional words, with the number of changes waiting', () => {
  open({ count: 3, onSync: jest.fn(), onLater: jest.fn() });
  const sheet = document.querySelector('.reconnect-sheet');
  expect(sheet.getAttribute('aria-label')).toBe('Connection restored');
  expect(sheet.querySelector('h2').textContent).toBe('You’re back online');
  expect(sheet.textContent).toContain('Would you like to sync the 3 changes you made offline to your MOVO account?');
  expect([...sheet.querySelectorAll('.reconnect-actions button')].map(b => b.textContent)).toEqual(['Not now', 'Sync now']);
});

test('"Sync now" and "Not now" report whether "Always sync automatically" was ticked', () => {
  const onSync = jest.fn(); const onLater = jest.fn();
  open({ count: 1, onSync, onLater });
  act(() => button('Not now').click());
  expect(onLater).toHaveBeenCalledWith(false);
  act(() => document.querySelector('.reconnect-always input').click());
  act(() => button('Sync now').click());
  expect(onSync).toHaveBeenCalledWith(true);
});

test('while syncing, both buttons wait', () => {
  open({ count: 0, busy: true, onSync: jest.fn(), onLater: jest.fn() });
  expect(document.querySelector('.reconnect-sheet').textContent).toContain('sync the changes you made offline');
  expect(button('Syncing…').disabled).toBe(true);
  expect(button('Not now').disabled).toBe(true);
});
