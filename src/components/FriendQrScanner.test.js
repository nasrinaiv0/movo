import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FriendQrScanner from './FriendQrScanner';
global.IS_REACT_ACT_ENVIRONMENT = true;
test('a camera permission resolved after closing never leaves tracks running', async () => {
  let resolve;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: jest.fn(() => new Promise(done => { resolve = done; })) } });
  const tracks = [{ stop: jest.fn() }, { stop: jest.fn() }];
  const el = document.createElement('div'); const root = createRoot(el);
  await act(async () => root.render(<FriendQrScanner onScan={jest.fn()} onClose={jest.fn()} />));
  act(() => root.unmount());
  await act(async () => { resolve({ getTracks: () => tracks }); });
  expect(tracks.every(track => track.stop.mock.calls.length === 1)).toBe(true);
});
