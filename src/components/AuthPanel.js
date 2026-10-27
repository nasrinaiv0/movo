import React, { useState } from 'react';
import { signInWithPassword, signUpWithPassword } from '../lib/financeRepository';
import { supabaseConfigured } from '../lib/supabaseClient';
import './AuthPanel.css';

export default function AuthPanel({ onAuthenticated, onContinueLocally }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (!supabaseConfigured) { setError('Secure cloud sign-in is not configured yet. Set the MOVO Supabase URL and publishable key in the deployment environment.'); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (password.length < 8 || password.length > 128) { setError('Password must be between 8 and 128 characters.'); return; }
    if (mode === 'signup' && name.trim().length > 100) { setError('Name must be 100 characters or fewer.'); return; }
    setBusy(true);
    try {
      const result = mode === 'signup' ? await signUpWithPassword(email, password, name) : await signInWithPassword(email, password);
      if (mode === 'signup' && !result.session) setNotice('Account request received. Check your email to confirm your address, then sign in.');
      else onAuthenticated?.(result.session?.user ?? result.user);
    } catch {
      setError(mode === 'signin' ? 'Sign-in failed. Check your details or confirm your email and try again.' : 'We could not create the account. Check the details and try again.');
    } finally { setBusy(false); }
  }
  return <section className="auth-card" aria-labelledby="auth-title">
    <div className="auth-mark" aria-hidden="true">m</div><p className="auth-eyebrow">YOUR MONEY, YOUR CONTROL</p>
    <h2 id="auth-title">{mode === 'signin' ? 'Welcome back' : 'Create your MOVO account'}</h2>
    <p className="auth-description">Sign in to keep your financial records synced securely across your devices.</p>
    <form onSubmit={submit} noValidate>
      {mode === 'signup' && <label>Display name<input autoComplete="name" maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>}
      <label>Email address<input type="email" autoComplete="email" inputMode="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}
      <button className="auth-submit" type="submit" disabled={busy || !supabaseConfigured}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in securely' : 'Create account'}</button>
    </form>
    {!supabaseConfigured && <p className="auth-config-note">Cloud sign-in is unavailable until deployment configuration is completed.</p>}
    <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }}>{mode === 'signin' ? 'New to MOVO? Create an account' : 'Already have an account? Sign in'}</button>
    {onContinueLocally && <button className="auth-local" type="button" onClick={onContinueLocally}>Continue with this device only</button>}
    <p className="auth-privacy">Never share bank passwords, card PINs, CVVs, or one-time passcodes with MOVO.</p>
  </section>;
}
