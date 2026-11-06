import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { lockState, setPasscode, validPasscode } from '../lib/appLock';

/**
 * Device App Lock recovery, NOT a Supabase account-password reset.
 * The current MOVO account must prove control of its email through Supabase Auth
 * before the salted local passcode hash is replaced. No OTP or passcode is saved.
 */
export default function PasscodeRecovery({ account, onCancel, onRecovered, onResetDevice }) {
  const originalOwner = useRef(lockState().ownerId || account?.id || '');
  const accountEmail = account?.email || '';
  const [email, setEmail] = useState(accountEmail);
  const [step, setStep] = useState('email');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastSent, setLastSent] = useState(0);
  const verified = useRef(false);

  const eligible = Boolean(originalOwner.current);
  const validEmail = email.trim().toLowerCase();
  const send = async (event) => {
    event.preventDefault();
    if (busy || !eligible || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validEmail)) return;
    if (accountEmail && accountEmail.toLowerCase() !== validEmail) {
      setError('Use the email address linked to this MOVO account.');
      return;
    }
    if (lastSent && Date.now() - lastSent < 60000) {
      setError('A code was recently requested. Please check your email before requesting another.');
      return;
    }
    setBusy(true); setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: validEmail,
        options: { shouldCreateUser: false },
      });
      if (authError) throw authError;
      setLastSent(Date.now());
      setStep('verify');
    } catch {
      setError('Could not send a verification code. Check your connection and try again.');
    } finally { setBusy(false); }
  };

  const checkCode = async (event) => {
    event.preventDefault();
    if (busy || !/^\d{6,8}$/.test(code)) return;
    setBusy(true); setError('');
    try {
      const { data, error: otpError } = await supabase.auth.verifyOtp({
        email: validEmail, token: code, type: 'email',
      });
      if (otpError || !data?.user?.id || data.user.id !== originalOwner.current) {
        throw new Error('invalid_otp_or_account');
      }
      // The verified account must be the same account the passcode protects.
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError || authData?.user?.id !== originalOwner.current) {
        throw new Error('account_mismatch');
      }
      verified.current = true;
      setCode(''); setStep('new');
    } catch {
      verified.current = false;
      setCode('');
      setError('The code could not be verified for this MOVO account. Check the code and try again.');
    } finally { setBusy(false); }
  };

  const save = async event => {
    event.preventDefault();
    if (busy || !verified.current) return;
    if (!validPasscode(pin)) { setError('Enter a 4–6 digit passcode.'); return; }
    if (pin !== confirmPin) { setError('The new passcodes do not match.'); return; }
    setBusy(true); setError('');
    try {
      const success = await setPasscode(pin, originalOwner.current);
      if (!success) throw new Error('device_storage_failed');
      verified.current = false;
      setPin(''); setConfirmPin('');
      onRecovered();
    } catch {
      setError('The new passcode could not be saved on this device. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="lock-recovery" role="group" aria-label="Recover MOVO passcode">
      <h2>Reset your passcode</h2>
      <p className="lock-recovery-caption">
        Verify the email on your MOVO account before choosing a new device passcode.
      </p>
      {!eligible ? (
        <p role="alert" className="lock-error">
          Email verification is available for an account-linked lock. Sign in to the linked account or reset this device's local data.
        </p>
      ) : step === 'email' ? (
        <form onSubmit={send} className="lock-recovery-form">
          <label htmlFor="movo-recovery-email">Account email</label>
          <input id="movo-recovery-email" type="email" required autoComplete="email"
            value={email} disabled={busy || !!accountEmail} onChange={e => setEmail(e.target.value)} />
          <button className="primary-button" type="submit" disabled={busy || !email.trim()}>
            {busy ? 'Sending…' : 'Send verification code'}
          </button>
          <p className="lock-recovery-hint">A code will be sent to your registered email. Do not share it.</p>
        </form>
      ) : step === 'verify' ? (
        <form onSubmit={checkCode} className="lock-recovery-form">
          <p className="lock-recovery-caption">Enter the one-time code sent to {validEmail}.</p>
          <label htmlFor="movo-recovery-otp">Verification code</label>
          <input id="movo-recovery-otp" type="text" required inputMode="numeric"
            pattern="[0-9]{6,8}" maxLength={8} autoComplete="one-time-code"
            value={code} disabled={busy} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} />
          <button className="primary-button" type="submit" disabled={busy || !/^\d{6,8}$/.test(code)}>
            {busy ? 'Verifying…' : 'Verify code'}
          </button>
          <button className="link-button" type="button" disabled={busy}
            onClick={() => { setStep('email'); setCode(''); setError(''); }}>Request a new code</button>
        </form>
      ) : (
        <form onSubmit={save} className="lock-recovery-form">
          <p className="lock-recovery-caption">Email verified. Choose a new 4–6 digit passcode.</p>
          <label htmlFor="movo-recovery-pin">New passcode</label>
          <input id="movo-recovery-pin" type="password" inputMode="numeric" autoComplete="new-password"
            pattern="[0-9]{4,6}" maxLength={6} required value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <label htmlFor="movo-recovery-confirm">Confirm new passcode</label>
          <input id="movo-recovery-confirm" type="password" inputMode="numeric" autoComplete="new-password"
            pattern="[0-9]{4,6}" maxLength={6} required value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <button className="primary-button" type="submit" disabled={busy || !pin || !confirmPin}>
            {busy ? 'Saving…' : 'Set new passcode'}
          </button>
        </form>
      )}
      {error && <p className="lock-error" role="alert">{error}</p>}
      <button className="link-button" type="button" disabled={busy} onClick={() => { verified.current = false; onCancel(); }}>
        Back to passcode
      </button>
      {!eligible && <button className="link-button" type="button" onClick={onResetDevice}>
        Reset this device instead (deletes local data)
      </button>}
    </div>
  );
}
