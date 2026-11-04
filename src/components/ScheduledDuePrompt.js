import React, { useEffect, useState } from 'react';
import { Sheet } from './ui';
import { t as tr } from '../lib/i18n';
import { listScheduledTransactions, logScheduledTransaction } from '../lib/scheduledTransactions';

const today = () => new Date().toLocaleDateString('en-CA');

export default function ScheduledDuePrompt({ session, accountsView = [], onLogged }) {
  const [item,setItem]=useState(null);
  const [account,setAccount]=useState('');
  const [destination,setDestination]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const accounts=accountsView.filter(a=>!a.is_archived&&['bank','e_wallet','cash'].includes(a.account_type));
  useEffect(() => {
    let live = true;
    if (!session?.user?.id) { setItem(null); return () => { live = false; }; }
    if (session?.user?.id) {
      listScheduledTransactions()
        .then(rows => {
          if (!live) return;
          const due = rows.filter(row => row.scheduled_for <= today()).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
          if (due.length) {
            setItem(due[0]);
            setAccount(due[0].account_id || '');
            setDestination(due[0].transfer_to_account_id || '');
          }
        })
        .catch(err => { if (live) setError(err.message || tr('Could not load schedules.')); });
    }
    return () => { live = false; };
  }, [session?.user?.id]);
  const close=()=>setItem(null);
  const log=async e=>{e.preventDefault();if(!item)return;setBusy(true);setError('');try{await logScheduledTransaction(item,account,destination);setItem(null);await onLogged?.();const rows=await listScheduledTransactions();const due=rows.filter(row=>row.scheduled_for<=today()).sort((a,b)=>a.scheduled_for.localeCompare(b.scheduled_for));if(due.length){setItem(due[0]);setAccount(due[0].account_id||'');setDestination(due[0].transfer_to_account_id||'');}}catch(err){setError(err.message||tr('Could not log transaction.'));}finally{setBusy(false);}};
  if(!item)return null;
  const choices=accounts.filter(a=>a.currency===item.currency);
  return <Sheet title={tr('Scheduled transaction due')} subtitle={item.title} onClose={close} label={tr('Log scheduled transaction')}>
    <form className="sheet-form" onSubmit={log}>
      {error&&<p className="app-alert" role="alert">{error}</p>}
      <p className="form-note">{tr('Review and confirm to add this transaction to your records. MOVO will not move money.')}</p>
      <strong>{item.currency} {Number(item.amount).toLocaleString()}</strong>
      <label>{tr('Account to use')}<select required value={account} onChange={e=>setAccount(e.target.value)}><option value="">{tr('Choose account')}</option>{choices.map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name}</option>)}</select></label>
      {item.transaction_type==='transfer'&&<label>{tr('Destination account')}<select required value={destination} onChange={e=>setDestination(e.target.value)}><option value="">{tr('Choose destination')}</option>{choices.filter(a=>a.id!==account).map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name}</option>)}</select></label>}
      <button className="primary-button" disabled={busy||!account||(item.transaction_type==='transfer'&&!destination)}>{tr('Confirm & log transaction')}</button>
      <button type="button" className="link-button" onClick={close}>{tr('Remind me later')}</button>
    </form>
  </Sheet>;
}
