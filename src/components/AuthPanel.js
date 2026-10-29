import React, { useState } from 'react';
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from '../lib/financeRepository';
import { supabaseConfigured } from '../lib/supabaseClient';
import './AuthPanel.css';

export default function AuthPanel({ onAuthenticated, onContinueLocally, onOpenLegal }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);

  async function signInGoogle() {
    setError(''); setNotice('');
    if (!legalAccepted) { setError('Please review and accept the Terms of Service and acknowledge the Privacy Policy before continuing.'); return; }
    if (!supabaseConfigured) {
      setError('Google sign-in is not configured yet. Please try again later.');
      return;
    }
    setBusy(true);
    try {
      await signInWithGoogle();
      // Supabase redirects the browser to Google. If it returns without a
      // redirect, surface an actionable error instead of leaving a dead button.
    } catch {
      setError('Google sign-in could not start. Check the OAuth provider configuration and try again.');
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (!legalAccepted) { setError('Please review and accept the Terms of Service and acknowledge the Privacy Policy before continuing.'); return; }
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
    <div className="auth-legal">
      <label className="auth-legal-check"><input type="checkbox" aria-label="Accept MOVO Terms of Service and Privacy Policy" checked={legalAccepted} onChange={e => setLegalAccepted(e.target.checked)} /><span>I agree to the Terms of Service and acknowledge the Privacy Policy.</span></label>
      <div className="auth-legal-links"><button type="button" onClick={() => onOpenLegal?.('TermsOfService')}>Terms of Service</button><span aria-hidden="true">·</span><button type="button" onClick={() => onOpenLegal?.('PrivacyPolicy')}>Privacy Policy</button></div>
    </div>
    <button className="auth-google" type="button" onClick={signInGoogle} disabled={busy || !supabaseConfigured} aria-describedby={!supabaseConfigured ? "auth-config-note" : undefined} title={!supabaseConfigured ? "Cloud sign-in is unavailable until deployment configuration is completed." : undefined}>
      <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.06 13.22l7.98 6.19C11.93 13.72 17.48 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.95 46.98 31.9 46.98 24.55Z"/><path fill="#FBBC05" d="M10.04 28.59A14.4 14.4 0 0 1 9.27 24c0-1.59.27-3.13.77-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.58 10.78l7.46-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.18 2.3-6.52 0-12.07-4.22-13.96-9.99l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
      Continue with Google
    </button>
    <div className="auth-divider" aria-hidden="true"><span>or continue with email</span></div>
    <form onSubmit={submit} noValidate>
      {mode === 'signup' && <label>Display name<input autoComplete="name" maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>}
      <label>Email address<input type="email" autoComplete="email" inputMode="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}
      <button className="auth-submit" type="submit" disabled={busy || !supabaseConfigured} aria-describedby={!supabaseConfigured ? "auth-config-note" : undefined} title={!supabaseConfigured ? "Cloud sign-in is unavailable until deployment configuration is completed." : undefined}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in securely' : 'Create account'}</button>
    </form>
    {!supabaseConfigured && <p id="auth-config-note" className="auth-config-note" role="note">Cloud sign-in is unavailable until deployment configuration is completed. You can continue in local-only mode, but cloud account creation and sign-in will not work until configuration is fixed.</p>}
    <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }}>{mode === 'signin' ? 'New to MOVO? Create an account' : 'Already have an account? Sign in'}</button>
    {onContinueLocally && <button className="auth-local" type="button" onClick={() => { if (!legalAccepted) { setError('Please review and accept the Terms of Service and acknowledge the Privacy Policy before continuing.'); return; } onContinueLocally(); }}>Continue with this device only</button>}
    <p className="auth-privacy">Never share bank passwords, card PINs, CVVs, or one-time passcodes with MOVO.</p>
  </section>;
}
