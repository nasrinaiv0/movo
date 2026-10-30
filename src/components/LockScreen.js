import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { MovoMark } from './MovoLogo';
import { verifyPasscode, unlockWithBiometric, lockState } from '../lib/appLock';
import { t as tr } from '../lib/i18n';

/** Covers the app until the passcode (or Face ID / Touch ID) is confirmed. */
export default function LockScreen({ onUnlock, onForgot }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const { biometric, length } = lockState();

  const tryBio = async () => { if (await unlockWithBiometric()) onUnlock(); };
  useEffect(() => { if (lockState().biometric) unlockWithBiometric().then(ok => ok && onUnlock()); }, [onUnlock]);

  const press = async (d) => {
    if (busy) return;
    if (Date.now() < waitUntil) { setError(tr('Too many attempts. Try again in 30 seconds.')); return; }
    const next = (pin + d).slice(0, length); setPin(next); setError('');
    if (next.length === length) {
      setBusy(true);
      const ok = await verifyPasscode(next);
      setBusy(false);
      if (ok) onUnlock();
      else {
        const n = fails + 1; setFails(n); setPin('');
        if (n % 5 === 0) { setWaitUntil(Date.now() + 30000); setError(tr('Too many attempts. Try again in 30 seconds.')); } else setError(tr('Wrong passcode. Try again.'));
      }
    }
  };

  return <div className="lock-screen" role="dialog" aria-modal="true" aria-label={tr('Movo is locked')}>
    <MovoMark size={64} />
    <h2>{tr('Enter passcode')}</h2>
    <div className="lock-dots" aria-hidden="true">{Array.from({ length }, (_, i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}</div>
    <p className="lock-error" role="alert">{error}</p>
    <div className="lock-pad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <button type="button" key={d} onClick={() => press(d)}>{d}</button>)}
      {biometric ? <button type="button" className="lock-alt" onClick={tryBio} aria-label={tr('Unlock with Face ID or Touch ID')}><Icon name="face" size={24} /></button> : <span />}
      <button type="button" onClick={() => press('0')}>0</button>
      <button type="button" className="lock-alt" onClick={() => setPin(pin.slice(0, -1))} aria-label={tr('Delete')}><Icon name="backspace" size={22} /></button>
    </div>
    <button type="button" className="link-button" onClick={onForgot}>{tr('Forgot passcode?')}</button>
  </div>;
}
