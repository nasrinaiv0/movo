import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AuthPanel from './AuthPanel';

jest.mock('../lib/supabaseClient', () => ({ supabaseConfigured: false }));
jest.mock('../lib/financeRepository', () => ({
  signInWithGoogle: jest.fn(),
  signInWithPassword: jest.fn(),
  signUpWithPassword: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('MOVO unavailable cloud-auth controls', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<AuthPanel onContinueLocally={jest.fn()} />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('explains disabled Google and email sign-in controls to sighted and screen-reader users', () => {
    const note = container.querySelector('#auth-config-note');
    const google = container.querySelector('.auth-google');
    const emailSubmit = container.querySelector('.auth-submit');

    expect(note).not.toBeNull();
    expect(note.getAttribute('role')).toBe('note');
    expect(note.textContent).toContain('local-only mode');
    expect(google.disabled).toBe(true);
    expect(emailSubmit.disabled).toBe(true);
    expect(google.getAttribute('aria-describedby')).toBe('auth-config-note');
    expect(emailSubmit.getAttribute('aria-describedby')).toBe('auth-config-note');
    expect(google.title).toContain('unavailable');
    expect(emailSubmit.title).toContain('unavailable');
  });

  test('keeps local-only continuation available when cloud authentication is unconfigured', () => {
    const local = Array.from(container.querySelectorAll('button')).find(button => button.textContent.includes('Continue with this device only'));
    expect(local).toBeTruthy();
    expect(local.disabled).toBe(false);
  });
});
