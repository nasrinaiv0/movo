import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ThirdPartyNotices from './ThirdPartyNotices';
global.IS_REACT_ACT_ENVIRONMENT = true;
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test('bundled license notices open in the existing sheet without navigation or third-party requests', async () => {
  const saved = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'MIT License — synthetic fixture' });
  const el = document.createElement('div'); document.body.append(el); const root = createRoot(el);
  try {
    act(() => root.render(<ThirdPartyNotices />));
    await act(async () => { el.querySelector('button').click(); await flush(); });
    expect(global.fetch.mock.calls[0][0]).toBe('/third-party-notices.txt');
    expect(el.querySelector('[role="dialog"]').textContent).toContain('MIT License');
    act(() => el.querySelector('.sheet-close').click());
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(true);
  } finally { act(() => root.unmount()); el.remove(); global.fetch = saved; }
});

test('a missing notice file is shown as an error rather than a license approval', async () => {
  const saved = global.fetch; global.fetch = jest.fn().mockResolvedValue({ ok: false });
  const el = document.createElement('div'); const root = createRoot(el);
  try {
    act(() => root.render(<ThirdPartyNotices />));
    await act(async () => { el.querySelector('button').click(); await flush(); });
    expect(el.querySelector('[role="alert"]').textContent).toContain('Could not load notices');
  } finally { act(() => root.unmount()); global.fetch = saved; }
});
