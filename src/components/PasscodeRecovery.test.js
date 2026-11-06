import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PasscodeRecovery from './PasscodeRecovery';
import { supabase } from '../lib/supabaseClient';
import { setPasscode, lockState } from '../lib/appLock';

jest.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithOtp: jest.fn(), verifyOtp: jest.fn(), getUser: jest.fn() } }
}));
jest.mock('../lib/appLock', () => ({
  lockState: jest.fn(() => ({ enabled: true, ownerId: 'owner-1' })),
  setPasscode: jest.fn().mockResolvedValue(true),
  validPasscode: pin => /^\d{4,6}$/.test(String(pin)),
}));
global.IS_REACT_ACT_ENVIRONMENT = true;

let container, root, recovered;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  recovered = jest.fn();
  lockState.mockReturnValue({ enabled: true, ownerId: 'owner-1' });
  supabase.auth.signInWithOtp.mockResolvedValue({ error: null });
  supabase.auth.verifyOtp.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null });
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null });
  setPasscode.mockResolvedValue(true);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

const get = id => container.querySelector('#' + id);
const fill = async (id,value) => act(async () => {
  const el=get(id);
  const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  setter.call(el,value);
  el.dispatchEvent(new Event('input',{bubbles:true}));
});
const submit = async form => act(async () => {
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,0));
});
async function mount() {
  await act(async () => root.render(
    <PasscodeRecovery account={{ id:'owner-1',email:'owner@example.com' }}
      onCancel={jest.fn()} onRecovered={recovered} onResetDevice={jest.fn()}/>
  ));
}

test('sends an existing-account OTP, verifies the user and requires a confirmed new passcode before unlocking', async () => {
  await mount();
  expect(recovered).not.toHaveBeenCalled();
  expect(get('movo-recovery-email').value).toBe('owner@example.com');
  expect(get('movo-recovery-email').disabled).toBe(true);
  await submit(get('movo-recovery-email').closest('form'));
  expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
    email:'owner@example.com',options:{shouldCreateUser:false}
  });
  expect(recovered).not.toHaveBeenCalled();
  await fill('movo-recovery-otp','123456');
  await submit(get('movo-recovery-otp').closest('form'));
  expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
    email:'owner@example.com',token:'123456',type:'email'
  });
  expect(supabase.auth.getUser).toHaveBeenCalled();
  expect(recovered).not.toHaveBeenCalled();
  await fill('movo-recovery-pin','482913');
  await fill('movo-recovery-confirm','482914');
  await submit(get('movo-recovery-pin').closest('form'));
  expect(setPasscode).not.toHaveBeenCalled();
  expect(recovered).not.toHaveBeenCalled();
  await fill('movo-recovery-confirm','482913');
  await submit(get('movo-recovery-pin').closest('form'));
  expect(setPasscode).toHaveBeenCalledWith('482913','owner-1');
  expect(recovered).toHaveBeenCalledTimes(1);
});

test('rejects invalid OTP and mismatched verified user without changing lock or unlocking', async () => {
  await mount();
  await submit(get('movo-recovery-email').closest('form'));
  supabase.auth.verifyOtp.mockResolvedValue({ data:{user:{id:'attacker-user'}},error:null });
  await fill('movo-recovery-otp','123456');
  await submit(get('movo-recovery-otp').closest('form'));
  expect(container.textContent).toContain('could not be verified');
  expect(setPasscode).not.toHaveBeenCalled();
  expect(recovered).not.toHaveBeenCalled();
  expect(get('movo-recovery-pin')).toBeNull();
});

test('does not send OTP for a local lock without an account owner', async () => {
  lockState.mockReturnValue({ enabled:true,ownerId:null });
  await act(async () => root.render(
    <PasscodeRecovery account={null} onCancel={jest.fn()} onRecovered={recovered} onResetDevice={jest.fn()}/>
  ));
  expect(container.textContent).toContain('account-linked lock');
  expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
  expect(recovered).not.toHaveBeenCalled();
});
