import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfirmHost, deleteRecord, useConfirm } from './ConfirmDialog';
import { canAnimate } from '../lib/motion';

jest.mock('../lib/motion', () => ({ canAnimate: jest.fn(() => false) }));

global.IS_REACT_ACT_ENVIRONMENT = true;

/* A screen with one button that asks before doing something; records every answer it got. */
let api; let el; let root;
function Probe() {
  api.confirm = useConfirm();
  return <button type="button" className="probe">Open</button>;
}
async function mount() {
  api = { results: [] };
  el = document.createElement('div'); document.body.appendChild(el);
  root = createRoot(el);
  await act(async () => root.render(<ConfirmHost><Probe /></ConfirmHost>));
}
/* Opens a request and returns it wrapped, so awaiting the open does not wait for the answer. */
async function ask(options) {
  let promise;
  await act(async () => { promise = api.confirm(options).then(result => { api.results.push(result); return result; }); });
  return { promise };
}
const dialog = () => document.querySelector('.confirm-dialog');
const click = selector => act(async () => { document.querySelector(selector).dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const key = (name, extra = {}) => act(async () => { document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, ...extra })); });
const typeInto = (input, value) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

beforeEach(mount);
afterEach(() => { act(() => root.unmount()); el.remove(); });

test('the standard delete wording names the record and explains the effect', async () => {
  const opener = el.querySelector('.probe'); opener.focus();
  await ask({ ...deleteRecord('Grab', { impact: 'Your balances update.', permanent: true }), action: jest.fn() });
  expect(dialog().getAttribute('role')).toBe('alertdialog');
  expect(dialog().getAttribute('aria-modal')).toBe('true');
  expect(document.getElementById(dialog().getAttribute('aria-labelledby')).textContent).toBe('Delete this record?');
  expect(document.getElementById(dialog().getAttribute('aria-describedby')).textContent)
    .toBe('Are you sure you want to delete this record? This action may affect your financial balances and reports.Your balances update. This cannot be undone.');
  expect(dialog().querySelector('.confirm-name').textContent).toBe('Grab');
  expect(dialog().classList.contains('is-danger')).toBe(true);
  expect(dialog().querySelector('.confirm-accept').className).toContain('danger');
  expect([...dialog().querySelectorAll('.confirm-actions button')].map(b => b.textContent)).toEqual(['Cancel', 'Delete']);
  // Focus starts on Cancel, the safe choice.
  expect(document.activeElement.textContent).toBe('Cancel');
  await click('.confirm-cancel');
  expect(document.activeElement).toBe(opener);
});

test('Cancel, Escape and a tap outside never run the action', async () => {
  const action = jest.fn();
  for (const dismiss of [() => click('.confirm-cancel'), () => key('Escape'), () => click('.confirm-backdrop')]) {
    await ask({ ...deleteRecord('Rent'), action });
      expect(dialog()).not.toBeNull();
    await dismiss();
    expect(dialog()).toBeNull();
  }
  expect(action).not.toHaveBeenCalled();
  expect(api.results).toEqual([false, false, false]);
});

test('Escape in the dialog never reaches a sheet underneath', async () => {
  const sheetHeard = jest.fn();
  document.addEventListener('keydown', sheetHeard);
  await ask(deleteRecord('Rent'));
  await key('Escape');
  expect(sheetHeard).not.toHaveBeenCalled();
  document.removeEventListener('keydown', sheetHeard);
});

test('a double tap runs the action once, and a tap after Cancel does nothing', async () => {
  let release;
  const action = jest.fn(() => new Promise(resolve => { release = resolve; }));
  await ask({ ...deleteRecord('Rent'), action });
  await act(async () => { const accept = dialog().querySelector('.confirm-accept'); accept.click(); accept.click(); accept.click(); });
  expect(action).toHaveBeenCalledTimes(1);
  // While it runs: progress is shown, both buttons are off, and dismissing is ignored.
  expect(dialog().querySelector('.confirm-accept').getAttribute('aria-busy')).toBe('true');
  expect(dialog().querySelector('.confirm-accept').textContent).toBe('Please wait…');
  expect(dialog().querySelector('.confirm-cancel').disabled).toBe(true);
  await key('Escape');
  await click('.confirm-backdrop');
  expect(dialog()).not.toBeNull();
  await act(async () => { release(); });
  expect(dialog()).toBeNull();
  expect(api.results).toEqual([true]);

  // Cancel first: a later tap on the confirm button of the closing dialog cannot run anything.
  const second = jest.fn();
  await ask({ ...deleteRecord('Rent'), action: second });
  const accept = dialog().querySelector('.confirm-accept');
  await click('.confirm-cancel');
  await act(async () => { accept.click(); });
  expect(second).not.toHaveBeenCalled();
});

test('during the 200ms closing animation nothing in the dialog can be pressed', async () => {
  jest.useFakeTimers();
  canAnimate.mockReturnValue(true);
  try {
    const action = jest.fn();
    await ask({ ...deleteRecord('Rent'), action });
    await click('.confirm-cancel');
    expect(document.querySelector('.confirm-layer').classList.contains('closing')).toBe(true);
    await click('.confirm-accept');
    await click('.confirm-backdrop');
    await act(async () => { jest.advanceTimersByTime(200); });
    expect(dialog()).toBeNull();
    expect(action).not.toHaveBeenCalled();
    expect(api.results).toEqual([false]);
  } finally {
    canAnimate.mockReturnValue(false);
    jest.useRealTimers();
  }
});

test('one dialog at a time: a second request while one is open is declined', async () => {
  await ask(deleteRecord('Rent'));
  await (await ask(deleteRecord('Grab'))).promise;
  expect(api.results).toEqual([false]);
  expect(dialog().querySelector('.confirm-name').textContent).toBe('Rent');
  await click('.confirm-accept');
  expect(api.results).toEqual([false, true]);
});

test('a failure is shown in the dialog with Try again, and success is reported only once it finished', async () => {
  const action = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce();
  await ask({ ...deleteRecord('Rent'), action, failure: 'Could not delete this. Nothing was changed.' });
  await click('.confirm-accept');
  expect(dialog().querySelector('[role="alert"]').textContent).toBe('Could not delete this. Nothing was changed.');
  expect(dialog().querySelector('.confirm-accept').textContent).toBe('Try again');
  expect(api.results).toEqual([]);
  await click('.confirm-accept');
  expect(action).toHaveBeenCalledTimes(2);
  expect(dialog()).toBeNull();
  expect(api.results).toEqual([true]);
});

test('an error can carry its own message for the person', async () => {
  await ask({ title: 'Log out of MOVO?', action: () => Promise.reject(Object.assign(new Error('x'), { userMessage: 'Your changes could not be saved.' })) });
  await click('.confirm-accept');
  expect(dialog().querySelector('.confirm-error').textContent).toBe('Your changes could not be saved.');
  await click('.confirm-cancel');
  expect(api.results).toEqual([false]);
});

test('bulk and account-level deletion need the typed word first', async () => {
  const action = jest.fn();
  await ask({ title: 'Empty the Archive?', danger: true, verify: 'DELETE', confirmLabel: 'Delete all', action });
  const input = dialog().querySelector('.confirm-verify input');
  const accept = dialog().querySelector('.confirm-accept');
  expect(accept.disabled).toBe(true);
  await typeInto(input, 'delet');
  expect(accept.disabled).toBe(true);
  await act(async () => { accept.click(); });
  expect(action).not.toHaveBeenCalled();
  await typeInto(input, 'delete');
  expect(accept.disabled).toBe(false);
  await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  expect(action).toHaveBeenCalledTimes(1);
  expect(api.results).toEqual([true]);
});

test('Tab keeps focus inside the dialog', async () => {
  await ask({ ...deleteRecord('Rent') });
  const [cancel, accept] = dialog().querySelectorAll('.confirm-actions button');
  expect(document.activeElement).toBe(cancel);
  await key('Tab');
  accept.focus();
  const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  await act(async () => { accept.dispatchEvent(tab); });
  expect(tab.defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(cancel);
  const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
  await act(async () => { cancel.dispatchEvent(back); });
  expect(document.activeElement).toBe(accept);
});

test('without the app shell it falls back to the browser dialog, still asking first', async () => {
  let fallback;
  function Bare() { fallback = useConfirm(); return null; }
  const host = document.createElement('div'); const bare = createRoot(host);
  await act(async () => bare.render(<Bare />));
  const action = jest.fn();
  const spy = jest.spyOn(window, 'confirm').mockImplementation(() => false);
  await expect(fallback({ ...deleteRecord('Rent'), action })).resolves.toBe(false);
  expect(spy.mock.calls[0][0]).toContain('Delete this record?');
  expect(action).not.toHaveBeenCalled();
  spy.mockImplementation(() => true);
  await expect(fallback({ ...deleteRecord('Rent'), action })).resolves.toBe(true);
  expect(action).toHaveBeenCalledTimes(1);
  // A typed-word request is declined when the word is not typed.
  const prompt = jest.spyOn(window, 'prompt').mockImplementation(() => 'nope');
  await expect(fallback({ title: 'Reset?', verify: 'DELETE', action })).resolves.toBe(false);
  expect(action).toHaveBeenCalledTimes(1);
  spy.mockRestore(); prompt.mockRestore();
  act(() => bare.unmount());
});
