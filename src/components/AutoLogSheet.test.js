import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AutoLogSheet from './AutoLogSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;
const KEY = 'c33352427f9f5a1b2c3d4e5f60718293';

test('shows a masked key, copies the real one, and switches recipes by mode', async () => {
  const copied = [];
  Object.assign(navigator, { clipboard: { writeText: (t) => { copied.push(t); return Promise.resolve(); } } });
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(<AutoLogSheet prefs={{ autoLog: true, autoLogKey: KEY }} setPref={() => {}} status="ready" accounts={[]} cloudMode notify={() => {}} onResetKey={() => {}} onClose={() => {}} />));
  expect(el.textContent).toContain('Registered for background logging');
  expect(el.textContent).not.toContain(KEY);
  expect(el.textContent).toContain('Format Date');
  const button = (label) => [...el.querySelectorAll('button')].find(b => b.textContent.includes(label));
  await act(async () => { button('Copy prompt').click(); });
  expect(copied[0]).toContain(`Authorization: Bearer ${KEY}`);
  expect(copied[0]).toContain('Auto MOVO Transactions');
  await act(async () => { button('Siri voice').click(); });
  expect(el.textContent).toContain('Dictate Text');
  await act(async () => { button('Copy prompt').click(); });
  expect(copied[1]).toContain('source = siri_shortcut');
  act(() => root.unmount());
});
