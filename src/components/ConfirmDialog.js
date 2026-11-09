import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { t as tr } from '../lib/i18n';
import { canAnimate } from '../lib/motion';

/*
 * One confirmation system for MOVO (owner spec 2026-11-09): log out and every destructive action ask first, in the
 * same compact centred dialog.
 *
 *   const confirm = useConfirm();
 *   await confirm({ ...deleteRecord(name), action: () => deleteIt() });
 *
 * - Nothing happens until the person presses the confirm button. Cancel, Escape and a tap outside only close the
 *   dialog; none of them can confirm.
 * - With `action`, the dialog stays open while it runs: the button shows progress, a second tap is ignored, a failure
 *   is shown in the dialog (with Try again) and nothing is reported as done unless the action finished.
 * - `verify: 'DELETE'` makes the person type the word first (bulk and account-level deletion).
 * - Focus moves to Cancel (the safe choice), stays inside the dialog and returns to where it was afterwards.
 *
 * Resolves true when confirmed (and the action finished), false when dismissed.
 */
const ConfirmContext = createContext(null);
const ANIMATION_MS = 200;
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/** Standard "Delete this record?" wording; `name` is the record's own name when there is one. */
export function deleteRecord(name, { impact, permanent = false } = {}) {
  return {
    title: tr('Delete this record?'),
    name,
    message: tr('Are you sure you want to delete this record? This action may affect your financial balances and reports.'),
    detail: [impact, permanent ? tr('This cannot be undone.') : null].filter(Boolean).join(' '),
    confirmLabel: tr('Delete'),
    danger: true,
  };
}

/** Removing a membership or rewards card: only MOVO's copy goes; the membership itself is not touched. */
export function removeLoyaltyCardPrompt(name) {
  return {
    title: tr('Remove this card?'),
    name,
    message: tr('Are you sure you want to remove this membership or rewards card from MOVO?'),
    detail: [tr('Its points and member number are removed from MOVO. Your membership with the merchant is not affected.'), tr('This cannot be undone.')].join(' '),
    confirmLabel: tr('Remove'),
    danger: true,
  };
}

/** Plain text for the fallback browser dialog (components rendered without the app shell, e.g. in tests). */
const plainText = options => [options.title, options.name, options.message, options.detail, options.warning].filter(Boolean).join('\n\n');

async function fallbackConfirm(options) {
  const accepted = typeof window !== 'undefined' && typeof window.confirm === 'function' && Boolean(window.confirm(plainText(options)));
  if (!accepted) return false;
  if (options.verify && typeof window.prompt === 'function' && String(window.prompt(tr('Type {word} to confirm.', { word: options.verify })) || '').trim().toUpperCase() !== options.verify) return false;
  if (options.action) await options.action();
  return true;
}

export function useConfirm() {
  return useContext(ConfirmContext) || fallbackConfirm;
}

/** App shell: returns the `confirm` function for the context and the dialog element to render once. */
export function useConfirmController() {
  const [request, setRequest] = useState(null);
  const requestRef = useRef(null); // set and cleared only by confirm/finish, never from a render
  const confirm = useCallback(options => {
    // One dialog at a time: a second request while one is open (a double tap) is declined, never stacked.
    if (requestRef.current) return Promise.resolve(false);
    return new Promise(resolve => {
      const next = { options: options || {}, resolve, key: Date.now() };
      requestRef.current = next;
      setRequest(next);
    });
  }, []);
  const finish = useCallback(result => {
    const current = requestRef.current;
    if (!current) return;
    requestRef.current = null;
    setRequest(null);
    current.resolve(result);
  }, []);
  const element = request ? <ConfirmDialog key={request.key} options={request.options} onFinish={finish} /> : null;
  return { confirm, element };
}

export function ConfirmProvider({ value, children }) {
  return <ConfirmContext.Provider value={value}>{children}</ConfirmContext.Provider>;
}

/** Provider and dialog together, for a screen rendered on its own (tests, previews). The app shell uses the controller. */
export function ConfirmHost({ children }) {
  const { confirm, element } = useConfirmController();
  return <ConfirmProvider value={confirm}>{children}{element}</ConfirmProvider>;
}

export function ConfirmDialog({ options, onFinish }) {
  const {
    title, name, message, detail, warning, confirmLabel = tr('Confirm'), cancelLabel = tr('Cancel'),
    danger = false, verify = '', action, icon,
  } = options;
  const [phase, setPhase] = useState('open'); // open → busy → done | error
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  // Refs, not state, so two taps in a row (or Cancel then Delete during the closing animation) can never both act.
  const runningRef = useRef(false);
  const closingRef = useRef(false);
  const timerRef = useRef(0);
  const previousFocus = useRef(typeof document === 'undefined' ? null : document.activeElement);
  const titleId = useId(); const bodyId = useId();
  const verified = !verify || typed.trim().toUpperCase() === verify;
  const busy = phase === 'busy';

  const finishRef = useRef(onFinish); finishRef.current = onFinish;
  const close = useCallback(result => {
    if (closingRef.current) return;
    closingRef.current = true;
    const done = () => {
      finishRef.current(result);
      const previous = previousFocus.current;
      if (previous && previous !== document.body && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    };
    if (!canAnimate()) { done(); return; }
    setClosing(true);
    timerRef.current = window.setTimeout(done, ANIMATION_MS);
  }, []);
  // The dialog only unmounts after it has settled, or when the whole app goes away; never leave a timer behind.
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const cancel = useCallback(() => { if (!runningRef.current && !closingRef.current) close(false); }, [close]);

  const accept = async () => {
    // A double tap, a tap during the closing animation or an unverified word never runs anything.
    if (runningRef.current || closingRef.current || !verified) return;
    runningRef.current = true;
    if (!action) { close(true); return; }
    setPhase('busy'); setError('');
    try {
      await action();
      setPhase('done');
      close(true);
    } catch (cause) {
      runningRef.current = false;
      setPhase('error');
      setError(cause?.userMessage || options.failure || tr('That did not work. Nothing was changed. Check your connection and try again.'));
    }
  };

  // Focus starts on Cancel, the safe choice.
  useEffect(() => { (cancelRef.current || dialogRef.current)?.focus(); }, []);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    // Capture phase on window, so a sheet underneath never also reacts to Escape or Tab.
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); cancel(); return; }
      if (event.key !== 'Tab') return;
      event.stopPropagation();
      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE));
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [cancel]);

  const body = <div className={`confirm-layer${closing ? ' closing' : ''}`}>
    {/* A tap outside only cancels; it can never confirm. Ignored while the action runs. */}
    <div className="confirm-backdrop" aria-hidden="true" onClick={cancel} />
    <section ref={dialogRef} className={`confirm-dialog${danger ? ' is-danger' : ''}`} role="alertdialog" aria-modal="true"
      aria-labelledby={titleId} aria-describedby={bodyId} tabIndex={-1}>
      <span className="confirm-icon" aria-hidden="true"><Icon name={icon || (danger ? 'trash' : 'info')} size={20} /></span>
      <h2 id={titleId} className="confirm-title">{title}</h2>
      {name && <p className="confirm-name">{name}</p>}
      <div id={bodyId} className="confirm-body">
        {message && <p>{message}</p>}
        {detail && <p className="confirm-detail">{detail}</p>}
        {warning && <p className="confirm-warning" role="note"><Icon name="info" size={15} />{warning}</p>}
      </div>
      {verify && <label className="confirm-verify">
        <span>{tr('Type {word} to confirm.', { word: verify })}</span>
        <input value={typed} onChange={event => setTyped(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); accept(); } }} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={busy} aria-label={tr('Type {word} to confirm.', { word: verify })} />
      </label>}
      {error && <p className="confirm-error" role="alert">{error}</p>}
      <div className="confirm-actions">
        <button ref={cancelRef} type="button" className="confirm-cancel" onClick={cancel} disabled={busy}>{cancelLabel}</button>
        <button type="button" className={`confirm-accept${danger ? ' danger' : ''}`} onClick={accept} disabled={busy || !verified} aria-busy={busy || undefined}>
          {busy ? <><span className="confirm-spinner" aria-hidden="true" />{tr('Please wait…')}</> : phase === 'error' ? tr('Try again') : confirmLabel}
        </button>
      </div>
    </section>
  </div>;
  if (typeof document === 'undefined') return body;
  const host = document.querySelector('.movo-app') || document.body;
  return createPortal(body, host);
}
