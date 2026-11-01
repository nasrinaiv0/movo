import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Walkthrough from './Walkthrough';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('welcome, then each step in order with a counter; Done finishes and Skip/Escape end early', () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  host.innerHTML = '<div class="a">A</div><div class="b">B</div>';
  host.querySelectorAll('div').forEach(el => { el.getBoundingClientRect = () => ({ top: 100, left: 20, width: 200, height: 60 }); });
  const app = document.createElement('div'); document.body.appendChild(app);
  const root = createRoot(app); const onDone = jest.fn();
  const steps = [{ target: '.a', icon: 'chart', title: 'First', text: 'one' }, { target: '.missing', icon: 'chart', title: 'Gone', text: 'skipped' }, { target: '.b', icon: 'grid', title: 'Last', text: 'two' }];
  act(() => root.render(<Walkthrough steps={steps} onDone={onDone} />));
  expect(app.textContent).toContain('Welcome to MOVO');
  const click = (label) => act(() => Array.from(app.querySelectorAll('button')).find(b => b.textContent.startsWith(label)).click());
  click('Continue with local');
  expect(app.textContent).toContain('First');
  expect(app.textContent).toContain('1 of 3');
  expect(app.querySelector('.tour-spot')).not.toBeNull();
  click('Next');
  expect(app.textContent).toContain('Last'); // the step with no target on screen is skipped
  click('Done');
  expect(onDone).toHaveBeenCalledTimes(1);
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(onDone).toHaveBeenCalledTimes(2);
  act(() => root.unmount()); app.remove(); host.remove();
});

test('welcome offers sign in, sign up and local with a file import', async () => {
  const app = document.createElement('div'); document.body.appendChild(app);
  const root = createRoot(app); const onAccount = jest.fn(); const onImport = jest.fn(async () => ({ ok: true, message: 'Added 2 accounts.' }));
  act(() => root.render(<Walkthrough steps={[]} onDone={() => {}} onAccount={onAccount} onImport={onImport} />));
  const click = (label) => act(() => Array.from(app.querySelectorAll('button')).find(b => b.textContent.startsWith(label)).click());
  click('Have an account already'); expect(onAccount).toHaveBeenLastCalledWith('signin');
  click('Sign up'); expect(onAccount).toHaveBeenLastCalledWith('signup');
  click('Continue with local');
  expect(app.textContent).toContain('Bring your money data');
  const input = app.querySelector('input[type="file"]');
  const file = new File(['{}'], 'backup.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file] });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(onImport).toHaveBeenCalledWith(file);
  expect(app.querySelector('[role="status"]').textContent).toBe('Added 2 accounts.');
  act(() => root.unmount()); app.remove();
});
