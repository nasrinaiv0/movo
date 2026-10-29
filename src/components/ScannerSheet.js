import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { Sheet } from './ui';
import { readImageText, parseReceipt, guessCategory } from '../lib/ocr';
import { money, shown } from '../lib/format';

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
  const fileRef = useRef(null);

  const stopCamera = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  useEffect(() => () => stopCamera(), []);
  const update = (list) => { setScans(list); saveScans(list); };

  const startCamera = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { fileRef.current?.click(); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false });
      setMode('camera');
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = stream.current; video.current.play().catch(() => {}); } });
    } catch { setError('Camera access was blocked. You can choose a photo instead.'); }
  };

  const process = async (blob) => {
    stopCamera(); setMode('working'); setError(''); setStatus('Reading your receipt on this device…');
    try {
      const text = await readImageText(blob);
      const fields = parseReceipt(text);
      const entry = { id: window.crypto?.randomUUID?.() || String(Date.now()), at: new Date().toISOString(), ...fields, category: guessCategory(`${fields.merchant}\n${text}`), text: text.slice(0, 2000), thumb: await thumb(blob), status: 'review' };
      update([entry, ...scans]); setActive(entry); setMode('review');
    } catch (cause) { setError(cause.message || 'Could not read that image.'); setMode('home'); }
    finally { setStatus(''); }
  };

  const capture = () => {
    const v = video.current; if (!v?.videoWidth) return;
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob(b => b && process(b), 'image/jpeg', 0.92);
  };
  const choose = (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) process(f); };
  const log = () => {
    update(scans.map(s => (s.id === active.id ? { ...s, ...active, status: 'logged' } : s)));
    onLog({ merchant: active.merchant || 'Receipt', amount: active.amount ? String(active.amount) : '', category: active.category, occurred_at: active.date || '', note: 'Scanned receipt' });
  };

  return <Sheet title={mode === 'review' ? 'Review scan' : 'Scan receipt'} subtitle={mode === 'review' ? 'Check the details before logging.' : 'Point at a receipt or payment confirmation. Photos are read on this device and never uploaded.'} onClose={() => { stopCamera(); onClose(); }} label="Scan receipt">
    <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={choose} aria-label="Choose a receipt photo" />
    {mode === 'home' && <div className="scan-start">
      <button type="button" className="scan-hero" onClick={startCamera}><span className="scan-frame"><Icon name="scan" size={34} /></span><strong>Open camera</strong><small>Best in good light, receipt filling the frame</small></button>
      <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}><Icon name="upload" size={18} /> Choose a photo or screenshot</button>
    </div>}
    {mode === 'camera' && <div className="scan-camera">
      <video ref={video} playsInline muted aria-label="Camera preview" />
      <span className="scan-guide" aria-hidden="true" />
      <div className="scan-controls"><button type="button" className="secondary-button" onClick={() => { stopCamera(); setMode('home'); }}>Cancel</button><button type="button" className="scan-shutter" onClick={capture} aria-label="Capture receipt" /><button type="button" className="secondary-button" onClick={() => { stopCamera(); fileRef.current?.click(); }}>Photos</button></div>
    </div>}
    {mode === 'working' && <div className="scan-working" role="status"><span className="spinner" /> {status}</div>}
    {mode === 'review' && active && <form className="sheet-form" onSubmit={(e) => { e.preventDefault(); log(); }}>
      {active.thumb && <img className="scan-thumb" src={active.thumb} alt="Scanned receipt" />}
      <label>Merchant<input value={active.merchant} maxLength={160} onChange={e => setActive({ ...active, merchant: e.target.value })} placeholder="Store or payee" /></label>
      <div className="form-grid"><label>Amount (PHP)<input inputMode="decimal" value={active.amount || ''} onChange={e => setActive({ ...active, amount: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} placeholder="0.00" /></label>
        <label>Date<input type="date" value={active.date || ''} onChange={e => setActive({ ...active, date: e.target.value })} /></label></div>
      <details className="scan-text"><summary>Text found in the photo</summary><pre>{active.text || 'No text found.'}</pre></details>
      {!active.amount && <p className="form-note">No total was found. Enter the amount before logging.</p>}
      <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { update(scans.filter(s => s.id !== active.id)); setActive(null); setMode('home'); }}>Discard</button><button type="submit" className="primary-button">Log transaction</button></div>
    </form>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {mode === 'home' && scans.length > 0 && <section className="scan-log" aria-label="Scan log">
      <div className="scan-log-head"><h3>Scan log</h3><button type="button" className="link-button" onClick={() => update([])}>Clear</button></div>
      {scans.map(s => <button type="button" key={s.id} className="scan-row" onClick={() => { setActive(s); setMode('review'); }}>
        {s.thumb ? <img src={s.thumb} alt="" /> : <span className="scan-row-icon"><Icon name="receipt" size={18} /></span>}
        <span className="menu-main"><strong>{s.merchant || 'Receipt'}</strong><small>{new Date(s.at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {s.status === 'logged' ? 'Logged' : 'Needs review'}</small></span>
        <b>{s.amount ? shown(show, money(s.amount)) : '—'}</b>
      </button>)}
    </section>}
  </Sheet>;
}
