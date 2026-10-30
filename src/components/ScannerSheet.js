import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { Sheet } from './ui';
import { readDocumentText, parseReceipt, guessCategory, warmUpOcr } from '../lib/ocr';
import { money, shown, getFormatLocale, baseCurrency } from '../lib/format';
import { t as tr } from '../lib/i18n';

const KEY = 'movo.scans.v1';
export const loadScans = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
export const saveScans = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30))); } catch { /* storage full or blocked */ } };
export const clearScans = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };

/** Small thumbnail for the scan log, so the log stays light in local storage. */
async function thumb(blob) {
  try {
    const bmp = await createImageBitmap(blob); const s = 96 / Math.max(bmp.width, bmp.height);
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
    return c.toDataURL('image/jpeg', 0.7);
  } catch { return ''; }
}

/**
 * Receipt and payment-screenshot scanner. Photos are read on this device (no upload); the result is reviewed,
 * then opens the add-transaction sheet pre-filled. Every scan is kept in a tappable log.
 */
export default function ScannerSheet({ show, onLog, onClose }) {
  const [scans, setScans] = useState(loadScans);
  const [mode, setMode] = useState('home');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const video = useRef(null);
  const stream = useRef(null);
  const photoRef = useRef(null);
  const docRef = useRef(null);

  const stopCamera = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  useEffect(() => { warmUpOcr(); return () => stopCamera(); }, []);
  // Attach the stream once the <video> exists (iOS needs autoplay + muted + playsInline to show a live preview).
  useEffect(() => {
    if (mode !== 'camera' || !video.current || !stream.current) return;
    video.current.srcObject = stream.current;
    video.current.play().catch(() => {});
  }, [mode]);
  const update = (list) => { setScans(list); saveScans(list); };

  const startCamera = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { photoRef.current?.click(); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      setMode('camera');
    } catch { setError(tr('Camera access was blocked. You can upload a photo instead.')); }
  };

  const process = async (blob) => {
    stopCamera(); setMode('working'); setError(''); setStatus(tr('Reading your receipt on this device…'));
    try {
      const text = await readDocumentText(blob);
      if (!text) throw new Error('No readable text was found. Try a sharper photo or another file.');
      const fields = parseReceipt(text);
      const isImage = /^image\//.test(blob.type || '');
      const entry = { id: window.crypto?.randomUUID?.() || String(Date.now()), at: new Date().toISOString(), ...fields, category: guessCategory(`${fields.merchant}\n${text}`), text: text.slice(0, 2000), thumb: isImage ? await thumb(blob) : '', kind: isImage ? 'photo' : 'pdf', status: 'review' };
      update([entry, ...scans]); setActive(entry); setMode('review');
    } catch (cause) { setError(tr(cause.message || 'Could not read that file.')); setMode('home'); }
    finally { setStatus(''); }
  };

  // Capture straight at OCR size (≤1600px) so reading starts sooner.
  const capture = () => {
    const v = video.current; if (!v?.videoWidth) return;
    const k = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(b => b && process(b), 'image/jpeg', 0.9);
  };
  const choose = (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) process(f); };
  const log = () => {
    update(scans.map(s => (s.id === active.id ? { ...s, ...active, status: 'logged' } : s)));
    onLog({ merchant: active.merchant || 'Receipt', amount: active.amount ? String(active.amount) : '', category: active.category, occurred_at: active.date || '', time: active.time || '', ref: active.ref || '', note: active.ref ? `Scanned receipt · Ref ${active.ref}` : 'Scanned receipt' });
  };

  return <Sheet title={mode === 'review' ? tr('Review scan') : tr('Scan receipt')} subtitle={mode === 'review' ? tr('Check the details before logging.') : tr('Photograph or upload a receipt, invoice or payment confirmation. Files are read on this device and never uploaded.')} onClose={() => { stopCamera(); onClose(); }} label={tr('Scan receipt')}>
    <input ref={photoRef} type="file" accept="image/*" hidden onChange={choose} aria-label={tr('Upload a photo or screenshot')} />
    <input ref={docRef} type="file" accept="image/*,application/pdf,.pdf" hidden onChange={choose} aria-label={tr('Upload a receipt or invoice')} />
    {mode === 'home' && <div className="scan-start">
      <button type="button" className="scan-hero" onClick={startCamera}><span className="scan-frame"><Icon name="camera" size={30} /></span><strong>{tr('Take a photo')}</strong><small>{tr('Best in good light, receipt filling the frame')}</small></button>
      <div className="scan-uploads">
        <button type="button" className="sheet-card" onClick={() => photoRef.current?.click()}><span className="scan-up-icon"><Icon name="upload" size={18} /></span><span className="account-main"><strong>{tr('Upload photo')}</strong><small>{tr('Photo or payment screenshot')}</small></span></button>
        <button type="button" className="sheet-card" onClick={() => docRef.current?.click()}><span className="scan-up-icon"><Icon name="doc" size={18} /></span><span className="account-main"><strong>{tr('Upload receipt or invoice')}</strong><small>{tr('Image or PDF, up to 15 MB')}</small></span></button>
      </div>
    </div>}
    {mode === 'camera' && <div className="scan-camera">
      <div className="scan-view"><video ref={video} autoPlay playsInline muted aria-label={tr('Camera preview')} /><span className="scan-guide" aria-hidden="true" /></div>
      <div className="scan-controls"><button type="button" className="scan-text-btn" onClick={() => { stopCamera(); setMode('home'); }}>{tr('Cancel')}</button><button type="button" className="scan-shutter" onClick={capture} aria-label={tr('Capture receipt')} /><button type="button" className="scan-text-btn" onClick={() => { stopCamera(); setMode('home'); photoRef.current?.click(); }}>{tr('Upload')}</button></div>
    </div>}
    {mode === 'working' && <div className="scan-working" role="status"><span className="spinner" /> {status}</div>}
    {mode === 'review' && active && <form className="sheet-form" onSubmit={(e) => { e.preventDefault(); log(); }}>
      {active.thumb && <img className="scan-thumb" src={active.thumb} alt={tr('Scanned receipt')} />}
      <label>{tr('Merchant')}<input value={active.merchant} maxLength={160} onChange={e => setActive({ ...active, merchant: e.target.value })} placeholder={tr('Store or payee')} /></label>
      <div className="form-grid"><label>{tr('Amount ({code})', { code: baseCurrency() })}<input inputMode="decimal" value={active.amount || ''} onChange={e => setActive({ ...active, amount: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} placeholder="0.00" /></label>
        <label>{tr('Date')}<input type="date" value={active.date || ''} onChange={e => setActive({ ...active, date: e.target.value })} /></label></div>
      <div className="form-grid"><label>{tr('Time')}<input type="time" step="1" value={active.time || ''} onChange={e => setActive({ ...active, time: e.target.value })} /></label>
        <label>{tr('Reference ID')}<input value={active.ref || ''} maxLength={60} onChange={e => setActive({ ...active, ref: e.target.value.replace(/[^\w-]/g, '').toUpperCase() })} placeholder={tr('Optional')} /></label></div>
      <details className="scan-text"><summary>{tr('Text found')}</summary><pre>{active.text || tr('No text found.')}</pre></details>
      {!active.amount && <p className="form-note">{tr('No total was found. Enter the amount before logging.')}</p>}
      <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { update(scans.filter(s => s.id !== active.id)); setActive(null); setMode('home'); }}>{tr('Discard')}</button><button type="submit" className="primary-button">{tr('Log transaction')}</button></div>
    </form>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {mode === 'home' && scans.length > 0 && <section className="scan-log" aria-label={tr('Scan log')}>
      <div className="scan-log-head"><h3>{tr('Scan log')}</h3><button type="button" className="link-button" onClick={() => update([])}>{tr('Clear')}</button></div>
      {scans.map(s => <button type="button" key={s.id} className="scan-row" onClick={() => { setActive(s); setMode('review'); }}>
        {s.thumb ? <img src={s.thumb} alt="" /> : <span className="scan-row-icon"><Icon name={s.kind === 'pdf' ? 'doc' : 'receipt'} size={18} /></span>}
        <span className="menu-main"><strong>{s.merchant || tr('Receipt')}</strong><small>{new Date(s.at).toLocaleString(getFormatLocale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {s.status === 'logged' ? tr('Logged') : tr('Needs review')}</small></span>
        <b>{s.amount ? shown(show, money(s.amount)) : '—'}</b>
      </button>)}
    </section>}
  </Sheet>;
}
