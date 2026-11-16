import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import ReceiptBreakdown from './ReceiptBreakdown';
import './ReceiptAiReview.css';
import AccountPicker from './AccountPicker';
import { scanReceiptWithAI } from '../lib/aiReceipt';
import { categoryId, guessCategory as classifyMerchant, categoryFullLabel, PRIMARY, GROUPS } from '../lib/categories';
import { Sheet } from './ui';
import { readDocumentText, parseReceipt } from '../lib/ocr';
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
export default function ScannerSheet({ show, onLog, onClose, accounts = [], saveError = '', busy = false }) {
  const [scans, setScans] = useState(loadScans);
  const [mode, setMode] = useState('home');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [accountId, setAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [live, setLive] = useState(false);
  const video = useRef(null);
  const stream = useRef(null);
  const photoRef = useRef(null);
  const docRef = useRef(null);

  const stopCamera = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setLive(false); };
  useEffect(() => () => stopCamera(), []);
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

  // Request explicit consent per receipt before any image/text goes to the AI API.
  const process = (blob) => {
    stopCamera(); setError(''); setAccountId(''); setPendingFile(blob); setActive(null); setMode('consent');
  };
  const analyze = async (basic = false) => {
    if (!pendingFile) return;
    setMode('working'); setError('');
    setStatus(basic ? tr('Reading your receipt on this device…') : tr('AI reading receipt…'));
    try {
      const fields = basic ? (() => null)() : await scanReceiptWithAI(pendingFile);
      let result = fields;
      let source = 'ai';
      let text = '';
      if (basic) {
        text = await readDocumentText(pendingFile);
        if (!text.trim()) throw new Error(tr('No readable text was found. Try a sharper photo.'));
        result = parseReceipt(text);
        source = 'device';
      }
      const suggested = categoryId(result.category)
        || classifyMerchant([result.merchant, result.reason, ...(result.items || []).map(item => item.name)].join('\n'));
      const isImage = /^image\//.test(pendingFile.type || '');
      const entry = {
        id: window.crypto?.randomUUID?.() || String(Date.now()), at: new Date().toISOString(),
        ...result, amount: Number(result.amount || 0), category: suggested || 'misc:uncategorized_expense',
        items: Array.isArray(result.items) ? result.items : [], source,
        text: text.slice(0, 2000), thumb: isImage ? await thumb(pendingFile) : '',
        kind: isImage ? 'photo' : 'pdf', status: 'review'
      };
      setPendingFile(null); setActive(entry); setMode('review');
    } catch (cause) {
      setMode('consent');
      setError(cause?.name === 'AbortError' ? tr('AI scan timed out. Try again.') : (cause?.message || tr('Could not scan receipt.')));
    } finally { setStatus(''); }
  };
  // Capture straight at OCR size (≤1600px) so reading starts sooner.
  const capture = () => {
    const v = video.current; if (!v?.videoWidth) return;
    const k = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(b => { if (b) process(b); else { stopCamera(); setMode('home'); setError(tr('Could not capture that photo. Try uploading it instead.')); } }, 'image/jpeg', 0.9);
  };
  const choose = (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) process(f); };
  const log = async () => {
    if (submittingRef.current) return;
    const selected = (accounts || []).find(a => String(a.id) === String(accountId) && !a.is_archived);
    if (!selected) { setError(tr('Choose a registered bank, card, e-wallet or other account.')); return; }
    if (!active?.merchant?.trim() || !(Number(active.amount) > 0) || Number(active.amount) >= 1e11) {
      setError(tr('No total was found. Enter the amount before logging.')); return;
    }
    if (active.currency && selected.currency && active.currency !== selected.currency) {
      setError(tr('Receipt currency differs from the selected account. Choose an account with matching currency.')); return;
    }
    submittingRef.current = true; setSubmitting(true); setError('');
    const items = (active.items || []).slice(0, 60).filter(item => item.name?.trim());
    const itemNote = items.map(item => [
      (Number(item.quantity) || 1) + '× ' + item.name,
      item.options?.length ? '(' + item.options.join(', ') + ')' : '',
      item.category ? '[' + item.category + ']' : '',
      item.total !== null && item.total !== undefined ? Number(item.total).toFixed(2) : ''
    ].filter(Boolean).join(' ')).join('; ');
    const note = [
      active.reason || '', active.branch ? 'Branch ' + active.branch : '',
      active.address ? 'Location ' + active.address : '',
      itemNote ? 'Items: ' + itemNote : '',
      active.tax != null ? 'VAT/tax ' + Number(active.tax).toFixed(2) + (active.taxIncluded ? ' included' : '') : '',
      active.taxableSales != null ? 'Taxable ' + Number(active.taxableSales).toFixed(2) : '',
      active.vatExemptSales != null ? 'VAT exempt ' + Number(active.vatExemptSales).toFixed(2) : '',
      active.discount ? 'Discount ' + Number(active.discount).toFixed(2) : '',
      active.cashTendered != null ? 'Tendered ' + Number(active.cashTendered).toFixed(2) : '',
      active.change != null ? 'Change ' + Number(active.change).toFixed(2) : '',
      active.orderNo ? 'Order ' + active.orderNo : '',
      active.ref ? 'Ref ' + active.ref : ''
    ].filter(Boolean).join(' · ').slice(0, 950);
    try {
      const ok = await onLog({
        account_id: selected.id,
        type: active.type === 'income' ? 'income' : 'expense',
        merchant: active.merchant.trim(), amount: String(active.amount),
        category: active.type === 'income' ? 'Income' : active.category,
        occurred_at: active.date || '', time: active.time || '',
        ref: active.ref || active.invoiceNo || '', note,
        receipt_note: [
          active.invoiceNo ? 'Invoice ' + active.invoiceNo : '',
          active.orderNo ? 'Order ' + active.orderNo : '',
          active.paymentMethod ? 'Method ' + active.paymentMethod : '',
          itemNote ? 'Item categories: ' + items.map(item => item.name + ': ' + (item.category || 'unspecified')).join('; ') : '',
        ].filter(Boolean).join(' · ').slice(0, 490),
      });
      if (ok) { setActive(null); setPendingFile(null); setMode('home'); }
      // A false result keeps this review open, e.g. duplicate confirmation or failed save.
    } catch (cause) { setError(cause?.message || tr('Transaction could not be saved.')); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };

  return <Sheet title={mode === 'review' ? tr('Review scan') : tr('Scan receipt')}
    subtitle={mode === 'review' ? tr('Check the details before logging.') : tr('AI extracts receipt details and suggests categories. You choose the payment account before logging.')}
    onClose={() => { stopCamera(); setPendingFile(null); onClose(); }} label={tr('Scan receipt')}>
    <input ref={photoRef} type="file" accept="image/*" hidden onChange={choose} aria-label={tr('Upload a photo or screenshot')} />
    <input ref={docRef} type="file" accept="image/*,application/pdf,.pdf" hidden onChange={choose} aria-label={tr('Upload a receipt or invoice')} />
    {mode === 'home' && <div className="scan-start">
      <button type="button" className="scan-hero" onClick={startCamera}><span className="scan-frame"><Icon name="camera" size={30} /></span><strong>{tr('Take a photo')}</strong><small>{tr('Best in good light, receipt filling the frame')}</small></button>
      <div className="scan-uploads">
        <button type="button" className="sheet-card" onClick={() => photoRef.current?.click()}><span className="scan-up-icon"><Icon name="upload" size={18} /></span><span className="account-main"><strong>{tr('Upload photo')}</strong><small>{tr('Photo or payment screenshot')}</small></span></button>
        <button type="button" className="sheet-card" onClick={() => docRef.current?.click()}><span className="scan-up-icon"><Icon name="doc" size={18} /></span><span className="account-main"><strong>{tr('Upload receipt or invoice')}</strong><small>{tr('Image or PDF, up to 15 MB')}</small></span></button>
      </div>
    </div>}
    {mode === 'consent' && <div className="scan-consent">
      <Icon name="sparkles" size={28} />
      <strong>{tr('AI receipt scan')}</strong>
      <p>{tr("With your permission, this receipt image or extracted PDF text is sent to MOVO's AI provider to read and categorize it. Do not scan PINs, CVVs or one-time codes. You can discard it without logging.")}</p>
      <div className="sheet-actions">
        <button type="button" className="secondary-button" onClick={() => { setPendingFile(null); setError(''); setMode('home'); }}>{tr('Discard')}</button>
        <button type="button" className="primary-button" onClick={() => analyze(false)}>{tr('Analyze with AI')}</button>
      </div>
      <button type="button" className="link-button" onClick={() => analyze(true)}>{tr('Basic scan (on-device)')}</button>
    </div>}
    {mode === 'camera' && <div className="scan-camera">
      <div className={`scan-view${live ? ' is-live' : ''}`}><video ref={video} autoPlay playsInline muted aria-label={tr('Camera preview')} onPlaying={() => setLive(true)} />
        <span className="scan-guide" aria-hidden="true"><i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" /><i className="scan-line" /></span>
        <span className="scan-hint">{tr('Fit the whole receipt inside the frame')}</span></div>
      <div className="scan-controls"><button type="button" className="scan-text-btn" onClick={() => { stopCamera(); setMode('home'); }}>{tr('Cancel')}</button><button type="button" className="scan-shutter" onClick={capture} aria-label={tr('Capture receipt')} /><button type="button" className="scan-text-btn" onClick={() => { stopCamera(); setMode('home'); photoRef.current?.click(); }}>{tr('Upload')}</button></div>
    </div>}
    {mode === 'working' && <div className="scan-working" role="status"><span className="scan-doc" aria-hidden="true"><i /><i /><i /><i className="scan-line" /></span><span>{status}</span></div>}
    {mode === 'review' && active && <form className="sheet-form scan-review" onSubmit={e => { e.preventDefault(); log(); }}>
      {active.thumb && <img className="scan-thumb" src={active.thumb} alt={tr('Scanned receipt')} />}
      <div className="scan-ai-summary">
        <span className="scan-ai-label">{active.source === 'ai' ? tr('AI receipt scan') : tr('Basic scan (on-device)')}</span>
        <strong className="scan-ai-total">{active.currency || baseCurrency()} {Number(active.amount || 0).toFixed(2)}</strong>
        <strong className="scan-ai-merchant">{active.merchant || tr('Receipt')}</strong>
        <span className="scan-ai-meta">{[active.date, active.time, active.branch || active.address, active.paymentMethod].filter(Boolean).join(' · ')}</span>
        <span className="scan-ai-category">{categoryFullLabel(active.category)}</span>
      </div>
      {active.warnings?.length > 0 && <div className="scan-alert" role="status">
        {active.warnings.map((warning, index) => <p key={index}>{tr(warning)}</p>)}
      </div>}
      <AccountPicker id="scan-account" label={tr('Paid with')} ariaLabel={tr('Choose account')}
        accounts={accounts.filter(a => !a.is_archived)} value={accountId} required
        onChange={setAccountId} showBalance={show} />
      {!accounts.some(a => !a.is_archived) && <p className="form-note">{tr('Add an account or card in Wallet first, then log this transaction.')}</p>}
      <details className="scan-review-details">
        <summary>{tr('Review or correct extracted details')}</summary>
        <div className="seg-control two scan-type" role="group" aria-label={tr('Type')}>
          {[['expense', 'Expense'], ['income', 'Income']].map(([k, label]) =>
            <button type="button" key={k} className={(active.type || 'expense') === k ? 'selected' : ''}
              aria-pressed={(active.type || 'expense') === k} onClick={() => setActive({ ...active, type: k })}>{tr(label)}</button>)}
        </div>
        <label>{tr('Merchant or recipient')}<input maxLength={160} value={active.merchant || ''} onChange={e => setActive({ ...active, merchant: e.target.value })} /></label>
        <div className="form-grid">
          <label>{tr('Amount ({code})', { code: active.currency || baseCurrency() })}<input inputMode="decimal"
            value={active.amount || ''} onChange={e => setActive({ ...active, amount: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} /></label>
          <label>{tr('Date')}<input type="date" value={active.date || ''} onChange={e => setActive({ ...active, date: e.target.value })} /></label>
        </div>
        <div className="form-grid">
          <label>{tr('Time')}<input type="time" step="1" value={active.time || ''} onChange={e => setActive({ ...active, time: e.target.value })} /></label>
          <label>{tr('Reference ID')}<input maxLength={60} value={active.ref || ''} onChange={e => setActive({ ...active, ref: e.target.value })} /></label>
        </div>
        <label>{tr('Category')}<select value={categoryId(active.category) || 'misc:uncategorized_expense'}
          onChange={e => setActive({ ...active, category: e.target.value })}>
          {PRIMARY.map(p => <option key={p.id} value={p.id}>{tr(p.label)}</option>)}
          {GROUPS.map(g => <optgroup key={g.id} label={tr(g.label)}>{g.subs.map(([id,label]) =>
            <option key={g.id + ':' + id} value={g.id + ':' + id}>{tr(label)}</option>)}</optgroup>)}
        </select></label>
        <label>{tr('Reason')}<input maxLength={140} value={active.reason || ''} onChange={e => setActive({ ...active, reason: e.target.value })} /></label>
        <ReceiptBreakdown receipt={active} onChange={setActive} />
        {!!active.text && <details className="scan-text"><summary>{tr('Text found')}</summary><pre>{active.text}</pre></details>}
      </details>
      {(!active.amount || !active.merchant) && <p className="form-note">{tr('No total was found. Enter the amount before logging.')}</p>}
      {(error || saveError) && <p className="form-error" role="alert">{error || saveError}</p>}
      <div className="sheet-actions">
        <button type="button" className="secondary-button" disabled={submitting || busy}
          onClick={() => { update(scans.filter(s => s.id !== active.id)); setActive(null); setPendingFile(null); setMode('home'); }}>{tr('Discard')}</button>
        <button type="submit" className="primary-button" disabled={submitting || busy || !accountId || !(Number(active.amount) > 0) || !active.merchant?.trim()}>
          {submitting ? tr('Saving…') : tr('Log transaction')}
        </button>
      </div>
    </form>}
    {error && mode !== 'review' && <p className="form-error" role="alert">{error}</p>}
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
