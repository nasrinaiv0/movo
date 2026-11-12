import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ReceiptField } from './TransactionSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const base = { receipt_file: null, receipt_path: '', receipt_path_to_delete: '' };
const render = (form, cloudMode = true) => { const setForm = jest.fn(); act(() => root.render(<ReceiptField form={{ ...base, ...form }} setForm={setForm} cloudMode={cloudMode} />)); return setForm; };
const choose = (file) => {
  const input = host.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
};
const fileOf = (name, type, size) => { const f = new File(['x'], name, { type }); Object.defineProperty(f, 'size', { value: size }); return f; };

test('empty: a tappable card, not the browser file input text', () => {
  render({});
  expect(host.textContent).toContain('Add receipt');
  expect(host.textContent).toContain('Photo or PDF · up to 10 MB');
  expect(host.querySelector('input[type="file"]').getAttribute('accept')).toBe('image/jpeg,image/png,image/webp,application/pdf');
});

test('a valid photo is attached; a wrong type or a file over 10 MB is refused at once', () => {
  let setForm = render({});
  choose(fileOf('lunch.jpg', 'image/jpeg', 200 * 1024));
  expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ receipt_file: expect.objectContaining({ name: 'lunch.jpg' }) }));
  setForm = render({});
  choose(fileOf('big.pdf', 'application/pdf', 11 * 1024 * 1024));
  expect(setForm).not.toHaveBeenCalled();
  expect(host.querySelector('[role="alert"]').textContent).toContain('smaller than 10 MB');
  choose(fileOf('notes.txt', 'text/plain', 10));
  expect(setForm).not.toHaveBeenCalled();
});

test('a chosen file shows its name, size and where it is kept, with Replace and Remove', () => {
  const setForm = render({ receipt_file: fileOf('march.pdf', 'application/pdf', 300 * 1024) }, false);
  expect(host.textContent).toContain('march.pdf');
  expect(host.textContent).toContain('300 KB · Saved on this device');
  expect(host.textContent).toContain('Replace');
  act(() => host.querySelector('[aria-label="Remove receipt"]').click());
  expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ receipt_file: null, receipt_path: '' }));
});

test('removing a saved receipt marks it for deletion when the change is saved', () => {
  const setForm = render({ receipt_path: 'user/abc.jpg' });
  expect(host.textContent).toContain('Receipt attached');
  act(() => host.querySelector('[aria-label="Remove receipt"]').click());
  expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ receipt_path: '', receipt_path_to_delete: 'user/abc.jpg' }));
});
