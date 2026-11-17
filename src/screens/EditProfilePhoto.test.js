import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { EditProfile } from './Profile';
import { cropProfilePhoto } from '../lib/useProfilePhoto';

jest.mock('../lib/useProfilePhoto', () => ({ cropProfilePhoto: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;

/*
 * The photo check used a broken regular expression (/^image\\//i), which JavaScript reads as a division by an
 * undefined `i`: choosing any file threw "i is not defined" and the photo never changed.
 */
const context = () => ({
  user: { name: 'Friend', email: 'person@example.com', initial: 'F' }, prefs: { profileName: 'Friend' },
  saveProfilePhoto: jest.fn().mockResolvedValue(undefined), setPref: jest.fn(), go: jest.fn(), notify: jest.fn(), session: null, cloudMode: false,
});

function pick(el, file) {
  const input = el.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  act(() => { input.dispatchEvent(new Event('change', { bubbles: true })); });
}

test('choosing a file that is not an image says so instead of throwing', () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(<EditProfile c={context()} />));
  const errors = [];
  const onError = event => { errors.push(event.error || event.message); event.preventDefault(); };
  window.addEventListener('error', onError);
  try { pick(el, new File(['hello'], 'notes.txt', { type: 'text/plain' })); } finally { window.removeEventListener('error', onError); }
  expect(errors).toEqual([]);
  expect(el.querySelector('.form-error').textContent).toBe('Choose a JPG, PNG, WebP or HEIC image under 20 MB.');
  act(() => root.unmount()); el.remove();
});

test('a selected photo is cropped, saved and acknowledged after the account update', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const c = context();
  const cropped = 'data:image/jpeg;base64,/9j/4QAAAAAA/9k=';
  cropProfilePhoto.mockResolvedValue(cropped);
  act(() => root.render(<EditProfile c={c} />));
  const file = new File([new Uint8Array([137, 80, 78, 71])], 'me.png', { type: 'image/png' });
  await act(async () => pick(el, file));
  expect(cropProfilePhoto).toHaveBeenCalledWith(file);
  expect(c.saveProfilePhoto).toHaveBeenCalledWith(cropped);
  expect(c.notify).toHaveBeenCalledWith('Profile photo updated.');
  expect(el.querySelector('.form-error')).toBeNull();
  act(() => root.unmount()); el.remove();
});
