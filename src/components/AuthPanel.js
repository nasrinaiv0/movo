import React, { useEffect, useRef, useState } from 'react';
import { sendEmailCode, verifyEmailCode, signInWithApple, signInWithGoogle } from '../lib/financeRepository';
import { supabaseConfigured } from '../lib/supabaseClient';
import { MovoMark } from './MovoLogo';
import './AuthPanel.css';
import { t as tr, rich } from '../lib/i18n';

/*
 * Passwordless sign-in: Apple, Google, or a one-time code sent to the person's email (it creates the account the first
 * time, so there is no separate sign-up). Every path needs the Terms / Privacy acknowledgement first.
 */
const RESEND_SECONDS = 60;
const GoogleMark = () => <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.06 13.22l7.98 6.19C11.93 13.72 17.48 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.95 46.98 31.9 46.98 24.55Z"/><path fill="#FBBC05" d="M10.04 28.59A14.4 14.4 0 0 1 9.27 24c0-1.59.27-3.13.77-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.58 10.78l7.46-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.18 2.3-6.52 0-12.07-4.22-13.96-9.99l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
const AppleMark = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.32-3.5ZM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.21Z" /></svg>;

export default function AuthPanel({ onAuthenticated, onContinueLocally, onOpenLegal }) {
  const [step, setStep] = useState('email'); // email -> code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => {
    if (!wait) return undefined;
    const timer = setTimeout(() => setWait(w => Math.max(0, w - 1)), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  const needsConsent = () => {
    if (legalAccepted) return false;
    setError(tr('Please review and accept the Terms of Service and acknowledge the Privacy Policy before continuing.'));
    return true;
  };

  async function oauth(provider) {
    setError(''); setNotice('');
    if (needsConsent()) return;
    if (!supabaseConfigured) { setError(tr('Cloud sign-in is unavailable until deployment configuration is completed.')); return; }
    setBusy(provider);
    try {
      await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
      // The browser is redirected to the provider; nothing else to do here.
    } catch {
      setError(provider === 'apple' ? tr('Apple sign-in could not start. Please try again.') : tr('Google sign-in could not start. Check the OAuth provider configuration and try again.'));
      setBusy('');
    }
  }

  async function sendCode(event) {
    event?.preventDefault(); setError(''); setNotice('');
    if (needsConsent()) return;
    if (!supabaseConfigured) { setError(tr('Secure cloud sign-in is not configured yet. Set the MOVO Supabase URL and publishable key in the deployment environment.')); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(tr('Enter a valid email address.')); return; }
    setBusy('send');
    try {
      await sendEmailCode(email);
      setStep('code'); setCode(''); setWait(RESEND_SECONDS);
      setNotice(tr('We sent a sign-in code to {email}.', { email: email.trim() }));
    } catch {
      setError(tr('We could not send a code right now. Wait a minute and try again.'));
    } finally { setBusy(''); }
  }

  async function verify(event) {
    event.preventDefault(); setError('');
    const token = code.replace(/\s+/g, '');
    if (!/^\d{6,10}$/.test(token)) { setError(tr('Enter the code from your email.')); return; }
    setBusy('verify');
    try {
      const result = await verifyEmailCode(email, token);
      onAuthenticated?.(result?.session?.user ?? result?.user);
    } catch {
      setError(tr('That code is not valid or has expired. Check it or send a new one.'));
    } finally { setBusy(''); }
  }

  const unavailable = !supabaseConfigured;
  const disabledProps = unavailable ? { 'aria-describedby': 'auth-config-note', title: tr('Cloud sign-in is unavailable until deployment configuration is completed.') } : {};

  return <section className="auth-card" aria-labelledby="auth-title">
    <header className="auth-head">
      <span className="auth-logo" aria-hidden="true"><MovoMark size={44} /></span>
      <h2 id="auth-title">{tr('Sign in to MOVO')}</h2>
      <p className="auth-description">{tr('Keep your records synced securely across your devices.')}</p>
    </header>

    <label className="auth-legal">
      <input type="checkbox" aria-label={tr('Accept MOVO Terms of Service and Privacy Policy')} checked={legalAccepted} onChange={e => { setLegalAccepted(e.target.checked); if (e.target.checked) setError(''); }} />
      {/* The document names in the sentence are the links, so they are not repeated in a second row. */}
      <span>{rich('I agree to the {terms} and acknowledge the {privacy}.', {
        terms: <button type="button" className="auth-legal-link" onClick={(e) => { e.preventDefault(); onOpenLegal?.('TermsOfService'); }}>{tr('Terms of Service')}</button>,
        privacy: <button type="button" className="auth-legal-link" onClick={(e) => { e.preventDefault(); onOpenLegal?.('PrivacyPolicy'); }}>{tr('Privacy Policy')}</button>,
      })}</span>
    </label>

    <div className="auth-providers">
      <button className="auth-provider auth-apple" type="button" onClick={() => oauth('apple')} disabled={!!busy || unavailable} {...disabledProps}><AppleMark />{busy === 'apple' ? tr('Please wait…') : tr('Continue with Apple')}</button>
      <button className="auth-provider auth-google" type="button" onClick={() => oauth('google')} disabled={!!busy || unavailable} {...disabledProps}><GoogleMark />{busy === 'google' ? tr('Please wait…') : tr('Continue with Google')}</button>
    </div>

    <div className="auth-divider" aria-hidden="true"><span>{tr('or use your email')}</span></div>

    {step === 'email' ? <form className="auth-form" onSubmit={sendCode} noValidate>
      <label className="auth-field"><span>{tr('Email address')}</span><input type="email" autoComplete="email" inputMode="email" maxLength={254} placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <button className="auth-submit" type="submit" disabled={!!busy || unavailable} {...disabledProps}>{busy === 'send' ? tr('Sending…') : tr('Email me a code')}</button>
    </form> : <form className="auth-form" onSubmit={verify} noValidate>
      <label className="auth-field"><span>{tr('Code from your email')}</span><input ref={codeRef} className="auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={10} placeholder="••••••" value={code} onChange={e => setCode(e.target.value.replace(/[^\d]/g, ''))} /></label>
      <button className="auth-submit" type="submit" disabled={!!busy}>{busy === 'verify' ? tr('Checking…') : tr('Verify and sign in')}</button>
      <div className="auth-code-actions">
        <button type="button" onClick={() => { setStep('email'); setCode(''); setNotice(''); setError(''); }}>{tr('Use a different email')}</button>
        <button type="button" disabled={wait > 0 || !!busy} onClick={() => sendCode()}>{wait > 0 ? tr('Resend in {n}s', { n: wait }) : tr('Resend code')}</button>
      </div>
    </form>}

    {error && <p className="auth-error" role="alert">{error}</p>}
    {notice && !error && <p className="auth-notice" role="status">{notice}</p>}
    {unavailable && <p id="auth-config-note" className="auth-config-note" role="note">{tr('Cloud sign-in is unavailable until deployment configuration is completed. You can continue in local-only mode, but cloud account creation and sign-in will not work until configuration is fixed.')}</p>}

    {onContinueLocally && <button className="auth-local" type="button" onClick={() => { if (needsConsent()) return; onContinueLocally(); }}>{tr('Continue with this device only')}</button>}
    <p className="auth-privacy">{tr('MOVO never asks for bank passwords, card PINs or CVVs. Enter your MOVO code only on this screen.')}</p>
  </section>;
}
