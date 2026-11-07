import React, { useEffect, useState } from 'react';
import { Sheet } from './ui';
import { createFinanceBackup, parseFinanceBackup } from '../lib/financeBackup';
import { getLocalAttachment, putLocalAttachment } from '../lib/localAttachments';
import { money } from '../lib/format';

export default function FinanceBackupSheet({ c, onClose }) {
  const [backup, setBackup] = useState(null);
  const [section, setSection] = useState('accounts');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [limit, setLimit] = useState(30);
  useEffect(() => { let live = true; getLocalAttachment('finance-backup').then(async file => {
    if (file) { const value = parseFinanceBackup(await file.text()); if (live) setBackup(value); }
  }).catch(() => {}); return () => { live = false; }; }, []);
  const download = async () => {
    setBusy(true); setMessage('');
    try {
      const data = await createFinanceBackup(c);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'movo-finance-backup.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Financial backup exported with available receipt and QR attachments.');
    } catch { setMessage('Export did not complete. Check your connection and try again; no partial backup was downloaded.'); }
    finally { setBusy(false); }
  };
  const upload = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setBusy(true); setMessage('');
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('Backup must be 50 MB or smaller.');
      const data = parseFinanceBackup(await file.text());
      await putLocalAttachment(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'finance-backup');
      setBackup(data); setSection('accounts'); setLimit(30); setMessage('Imported on this device for read-only viewing. Your current records were not replaced.');
    } catch (error) { setMessage(error.message || 'Could not read this backup.'); } finally { setBusy(false); }
  };
  const rows = backup ? (backup[section] || backup.tables[section] || []) : [];
  return <Sheet title="Export & import" label="Financial backups" onClose={onClose}>
    <p>Available on every plan. Export financial records, balances and settings. Import a backup to read it privately on this device.</p>
    <button type="button" className="primary-button" disabled={busy} onClick={download}>Export financial backup</button>
    <label className="plan-referral-label">Import backup to read<input type="file" accept=".json,application/json" disabled={busy} onChange={upload} /></label>
    <p className="form-hint">Keep exported financial files private. Receipts and QR images are included. Maximum backup size: 50 MB.</p>
    {message && <p role="status">{message}</p>}
    {backup && <><label>Read imported records<select value={section} onChange={event => { setSection(event.target.value); setLimit(30); }}>
      {['accounts','transactions',...Object.keys(backup.tables)].map(key => <option key={key} value={key}>{key.replaceAll('_',' ')}</option>)}
    </select></label><p>{rows.length} records · read-only</p>
    {rows.slice(0,limit).map((row,index) => <details key={index} className="card pad"><summary>{String(row.name || row.merchant || row.title || `Record ${index + 1}`)} {Number.isFinite(Number(row.balance ?? row.amount)) && money(Number(row.balance ?? row.amount), /^[A-Z]{3}$/.test(row.currency) ? row.currency : 'PHP')}</summary><pre style={{ whiteSpace:'pre-wrap', overflowWrap:'anywhere', fontSize:12 }}>{JSON.stringify(row,null,2)}</pre></details>)}
    {rows.length > limit && <button type="button" className="secondary-button" onClick={() => setLimit(limit + 30)}>Show more</button>}
    {!!backup.attachments?.length && <details className="card pad"><summary>Saved attachments ({backup.attachments.length})</summary>{backup.attachments.map((item,index)=><p key={index}><a download={`movo-attachment-${index + 1}`} href={item.dataUrl}>{item.path}</a></p>)}</details>}</>}
  </Sheet>;
}
