import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { Sheet } from './ui';
import { createFinanceBackup, parseFinanceBackup } from '../lib/financeBackup';
import { money } from '../lib/format';
import './FinanceBackupSheet.css';

const OTHER_LABELS = { subscriptions: 'subscriptions', plans: 'plans', spendingLimits: 'spending limits', budgets: 'budgets',
  membershipCards: 'loyalty cards', cashbackEntries: 'cashback entries', archive: 'archived items', creditCardPayments: 'card payments',
  creditSpendLogs: 'credit logs', accountStyles: 'card styles' };
const otherDetails = counts => Object.entries(OTHER_LABELS).filter(([key]) => counts[key] > 0).map(([key, label]) => counts[key] + ' ' + label).join(', ');

export default function FinanceBackupSheet({ c, onClose }) {
  const [backup, setBackup] = useState(null);
  const [section, setSection] = useState('accounts');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [limit, setLimit] = useState(12);
  const [selectedFile, setSelectedFile] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const confirmationRef = useRef(null);
  useEffect(() => { if (confirmation) confirmationRef.current?.focus(); }, [confirmation]);
  // Uploaded previews are deliberately ephemeral; neither uploads nor discarded
  // files may be persisted as financial records before explicit confirmation.
  const download = async () => {
    setBusy(true); setMessage('');
    try {
      const data = await createFinanceBackup(c);
      const missing = data.missingAttachments || 0;
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'movo-finance-backup.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Backup exported: accounts, transactions, subscriptions, plans, budgets, limits, cards, archive and settings, with receipts and QR codes.' + (missing ? ' ' + missing + ' attachment(s) could not be read and were left out.' : '') + ' Open it on the other device with Upload backup.');
    } catch { setMessage('Export did not complete. Check your connection and try again; no partial backup was downloaded.'); }
    finally { setBusy(false); }
  };
  const upload = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (/\.csv$/i.test(file.name)) { setConfirmation(''); c.openCsvImporter?.(file); return; }
    setSelectedFile(file.name); setSaved(false); setBackup(null); setConfirmation('');
    setBusy(true); setMessage('');
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('Backup must be 50 MB or smaller.');
      const data = parseFinanceBackup(await file.text());
      setBackup(data); setSection('accounts'); setLimit(12); setMessage('File checked. Review the preview, then choose Discard records or Save records. Nothing has been changed.');
    } catch (error) { setMessage(error.message || 'Could not read this backup.'); } finally { setBusy(false); }
  };
  const saveRecords = async () => {
    if (!backup || busy || saved || confirmation !== 'save') return;
    setBusy(true); setConfirmation(''); setMessage('');
    try {
      const result = await c.saveFinanceBackupRecords(backup);
      const otherAdded = result.other?.added || 0;
      const total = result.accounts + result.transactions + otherAdded;
      const other = otherDetails(result.other?.counts || {});
      const skipped = (result.skipped?.duplicates || 0) + (result.skipped?.conflicts || 0) + (result.failed || 0);
      // A confirmation is not a successful import when every supported row was
      // skipped. Keep the preview so the person can investigate or try again.
      setSaved(total > 0);
      setMessage(total
        ? 'Saved and verified ' + result.accounts + ' account(s) and ' + result.transactions + ' transaction(s) on this device' + (otherAdded ? ', plus ' + (other || otherAdded + ' other item(s)') : '') + '. ' + skipped + ' skipped or needing review. Home, Wallet, Transactions and Menu now reflect these records.' + (c.cloudMode ? ' They upload to your MOVO account automatically.' : '')
        : 'No new accounts or transactions were applied. ' + skipped + ' row(s) were skipped or already existed. Other financial groups in this backup are preview-only. The existing records were preserved.');
      if (total > 0) c.onFinanceBackupSaved?.(result);
    } catch (error) { setMessage(error?.message || 'Saving records failed. No further changes were attempted.'); }
    finally { setBusy(false); }
  };
  const discardPreview = () => {
    if (confirmation !== 'discard' || busy) return;
    setBackup(null); setSelectedFile(''); setSection('accounts'); setLimit(12);
    setSaved(false); setConfirmation('');
    setMessage('Preview discarded. No records in MOVO were changed.');
  };
  const unsupportedGroups = backup ? Object.entries(backup.tables || {})
    .filter(([key, rows]) => Array.isArray(rows) && rows.length && !['financial_accounts', 'transactions'].includes(key))
    .map(([key]) => key.replaceAll('_',' ')) : [];
  const rows = backup ? (backup[section] || backup.tables[section] || []) : [];
  const sections = backup ? ['accounts','transactions', ...Object.keys(backup.tables).filter(key => !['accounts','transactions'].includes(key))] : [];
  // Menu data (subscriptions, plans, limits...) and attachments are restorable even without new accounts or rows.
  const hasExtras = !!(backup?.tables?.local_preferences?.length || backup?.tables?.user_preferences?.length || backup?.attachments?.length);
  const summaryAccounts = (backup?.tables?.financial_accounts?.length || backup?.accounts?.length || 0);
  const summaryTransactions = (backup?.tables?.transactions?.length || backup?.transactions?.length || 0);
  return <Sheet title="Import & Export" label="Financial backups" className="movo-import-export-sheet" onClose={onClose}>
    <div className="movo-backup-layout">
      <section className="movo-backup-section" aria-label="Export records">
        <div className="movo-backup-heading"><strong>Export records</strong><small>Download a personal copy of your MOVO data.</small></div>
        <div className="movo-backup-actions">
          <button type="button" className="primary-button" disabled={busy} onClick={download}><Icon name="download" size={16} /> Export backup</button>
          <button type="button" className="secondary-button" disabled={busy} onClick={c.exportCsv}><Icon name="download" size={16} /> Export CSV</button>
        </div>
      </section>
      <section className="movo-backup-section" aria-label="Import records">
        <div className="movo-backup-heading"><strong>Import records</strong><small>CSV or MOVO JSON backup · review before saving.</small></div>
        <div className="movo-import-file-row">
          <label htmlFor="movo-backup-input" className="movo-file-upload-button"><Icon name="upload" size={17} /> Upload file</label>
          <input id="movo-backup-input" type="file" className="movo-native-file-input" accept=".json,application/json,.csv,text/csv" disabled={busy} onChange={upload} />
          <small className="movo-file-status" title={selectedFile}>{selectedFile || 'No file selected'}</small>
        </div>
        <small className="movo-backup-subnote">Files are reviewed on this device, not uploaded. JSON backups up to 50 MB. Saving is local-only, never a cloud write.</small>
      </section>
      {message && <p className="movo-backup-status" role="status">{message}</p>}
      {backup && <section className="movo-backup-section" aria-label="Import preview">
        <div className="movo-backup-heading"><strong>Preview records</strong><small>Check your accounts and transactions before committing.</small></div>
        <div className="movo-backup-stats">
          <span><b>{summaryAccounts}</b><small>Accounts</small></span>
          <span><b>{summaryTransactions}</b><small>Transactions</small></span>
          <span><b>{sections.length}</b><small>Data groups</small></span>
        </div>
        <label className="movo-backup-select-label">Preview group
          <select value={section} onChange={event => { setSection(event.target.value); setLimit(12); }}>
            {sections.map(key => <option key={key} value={key}>{key.replaceAll('_',' ')}</option>)}
          </select>
        </label>
        <p className="movo-backup-count">{rows.length} records available to preview</p>
        <div className="movo-backup-preview-list">
          {rows.slice(0,limit).map((row,index) => <details key={index} className="movo-backup-preview-item">
            <summary><span>{String(row.name || row.merchant || row.title || ('Record ' + (index + 1))).slice(0,100)}</span>{Number.isFinite(Number(row.balance ?? row.amount)) && <b>{money(Number(row.balance ?? row.amount), /^[A-Z]{3}$/.test(row.currency) ? row.currency : 'PHP')}</b>}</summary>
            <pre>{JSON.stringify(row,null,2)}</pre>
          </details>)}
        </div>
        {rows.length > limit && <button type="button" className="secondary-button" onClick={() => setLimit(limit + 12)}>Show more</button>}
        {unsupportedGroups.length > 0 && <p className="movo-backup-subnote" role="note">Cloud-only groups are preview-only and will not be applied: {unsupportedGroups.join(', ')}.</p>}
        {c.cloudMode && <p className="movo-backup-subnote" role="note">Cloud Sync is on. Saved records appear on this device right away and upload to your MOVO account automatically, now or when you are back online.</p>}
        <div className="movo-backup-save-actions">
          <button type="button" className="secondary-button" disabled={busy || saved} onClick={() => setConfirmation('discard')}>
            <Icon name="trash" size={17} /> Discard records
          </button>
          <button type="button" className="primary-button" disabled={busy || saved || (!summaryAccounts && !summaryTransactions && !hasExtras)} onClick={() => setConfirmation('save')}>
            <Icon name="check" size={17} /> {busy ? 'Saving…' : saved ? 'Records saved' : 'Save records'}
          </button>
        </div>
        {confirmation && <section className="movo-backup-confirm" role="alertdialog" aria-label={confirmation === 'save' ? 'Confirm local record import' : 'Confirm discard preview'} aria-modal="false">
          <strong>{confirmation === 'save' ? 'Save reviewed records to this device?' : 'Discard the uploaded preview?'}</strong>
          <p>{confirmation === 'save'
            ? (c.cloudMode
              ? 'Valid new accounts and transactions will be saved on this device, shown in Wallet, Home and Transactions, and uploaded to your MOVO account automatically. Existing records are never changed. Duplicates and unsupported groups remain untouched.'
              : 'Valid new accounts and transactions will be added to local MOVO records and reflected in Wallet, Home and Transactions. Cloud records will not change. Duplicates and unsupported groups remain untouched.')
            : 'The uploaded preview will be removed without changing any existing MOVO records.'}</p>
          {confirmation === 'save' && hasExtras && <p>Subscriptions, plans, budgets, limits, cards and settings from this backup are added too.</p>}
          <div className="movo-backup-confirm-actions">
            <button type="button" className="secondary-button" onClick={() => setConfirmation('')} disabled={busy}>Keep preview</button>
            <button type="button" ref={confirmationRef} className={confirmation === 'save' ? 'primary-button' : 'secondary-button'} disabled={busy} onClick={confirmation === 'save' ? saveRecords : discardPreview}>
              {confirmation === 'save' ? 'Confirm save locally' : 'Confirm discard'}
            </button>
          </div>
        </section>}
        <small className="movo-backup-subnote">Saving adds new accounts and transactions, then subscriptions, plans, budgets, limits, card styles and payments, loyalty cards, archive, receipts, QR codes and settings. Nothing already on this device is overwritten.</small>
      </section>}
    </div>
  </Sheet>;
}
