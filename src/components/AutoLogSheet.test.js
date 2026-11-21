import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AutoLogSheet from './AutoLogSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;
const KEY = 'c33352427f9f5a1b2c3d4e5f60718293';

test('opens on bank notifications, shows a masked key, copies the real one, and switches recipes by mode', async () => {
  const copied = [];
  Object.assign(navigator, { clipboard: { writeText: (t) => { copied.push(t); return Promise.resolve(); } } });
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const render = (autoLog) => act(() => root.render(<AutoLogSheet prefs={{ autoLog, autoLogKey: KEY }} setPref={() => {}} status="ready" accounts={[]} cloudMode notify={() => {}} onResetKey={() => {}} onClose={() => {}} />));
  const button = (label) => [...el.querySelectorAll('button')].find(b => b.textContent.includes(label));
  const copyPrompt = async () => { await act(async () => { button('Copy prompt').click(); }); return copied[copied.length - 1]; };
  render(true);
  expect(el.textContent).toContain('Registered for background logging');
  expect(el.textContent).not.toContain(KEY);
  // Bank notifications are the default; payment texts are no longer offered.
  expect(button('Bank notifications').getAttribute('aria-checked')).toBe('true');
  expect(el.textContent).not.toContain('Bank texts');
  expect(el.textContent).toContain('MOVO Bank Notifications');
  // Steps with a second action keep it on screen (“If — … : Show Notification — Title: MOVO”).
  expect(el.textContent).toContain('Show Notification — Title: MOVO');
  let text = await copyPrompt();
  expect(text).toContain(`Authorization = Bearer ${KEY}`);
  expect(text).toContain('source = notification');
  expect(text).toContain('Key notice');
  expect(text).not.toContain('Choose from Menu');
  await act(async () => { button('Apple Pay').click(); });
  expect(el.textContent).toContain('Format Date');
  text = await copyPrompt();
  expect(text).toContain('source = applepay');
  await act(async () => { button('Siri voice').click(); });
  expect(el.textContent).toContain('Dictate Text');
  text = await copyPrompt();
  expect(text).toContain('source = siri_shortcut');
  render(false);
  await act(async () => { button('Bank notifications').click(); });
  text = await copyPrompt();
  expect(text).toContain('Choose from Menu');
  expect(text).toContain('Under Skip: no actions');
  act(() => root.unmount());
});

test('independent API recipes use the reviewed backend while review links keep the public app origin', async () => {
  const saved = process.env.REACT_APP_API_ORIGIN;
  const copied = [];
  process.env.REACT_APP_API_ORIGIN = 'https://api.movo.example';
  Object.assign(navigator, { clipboard: { writeText: text => { copied.push(text); return Promise.resolve(); } } });
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  try {
    act(() => root.render(<AutoLogSheet prefs={{ autoLog: true, autoLogKey: KEY }} setPref={() => {}} status="ready" accounts={[]} cloudMode notify={() => {}} onResetKey={() => {}} onClose={() => {}} />));
    expect(el.textContent).toContain('https://api.movo.example/api/log');
    expect(el.textContent).not.toContain(KEY);
    const copy = async label => { await act(async () => [...el.querySelectorAll('button')].find(button => button.textContent.includes(label)).click()); return copied[copied.length - 1]; };
    expect(await copy('Copy prompt')).toContain(`https://api.movo.example/api/log`);
    expect(await copy('Copy review link')).toContain(`${window.location.origin}/#log?`);
  } finally {
    act(() => root.unmount()); el.remove();
    if (saved === undefined) delete process.env.REACT_APP_API_ORIGIN; else process.env.REACT_APP_API_ORIGIN = saved;
  }
});
