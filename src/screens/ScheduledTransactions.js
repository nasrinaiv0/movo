import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { RootHeader, SectionTitle, Sheet } from '../components/ui';
import { money, shown } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { cancelScheduledTransaction, createScheduledTransaction, listScheduledTransactions, logScheduledTransaction } from '../lib/scheduledTransactions';

const day = () => new Date().toLocaleDateString('en-CA');
const blank = currency => ({ title:'', transaction_type:'expense', amount:'', currency, account_id:'', transfer_to_account_id:'', scheduled_for:day(), frequency:'once', category:'Other', notes:'' });
const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
export default function ScheduledTransactions({ c }) {
  const { accountsView=[], session, show, base='PHP', go, notify } = c;
  const accounts=accountsView.filter(a=>!a.is_archived && ['bank','e_wallet','cash'].includes(a.account_type));
  const [items,setItems]=useState([]);
  const [sheet,setSheet]=useState(null);
  const [form,setForm]=useState(()=>blank(base));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const reload=useCallback(async()=>setItems(await listScheduledTransactions()),[]);
  useEffect(()=>{reload().catch(e=>setError(e.message||tr('Could not load schedules.')));},[reload]);
  const due=useMemo(()=>items.filter(x=>x.status==='scheduled'&&x.scheduled_for<=day()),[items]);
  const save=async e=>{e.preventDefault();setBusy(true);setError('');try{await createScheduledTransaction(form,session?.user?.id);await reload();setSheet(null);setNotice(tr('Schedule saved.'));}catch(err){setError(err.message||tr('Could not save schedule.'));}finally{setBusy(false);}};
  const log=async(item,accountId,transferTo)=>{setBusy(true);setError('');try{await logScheduledTransaction(item,accountId,transferTo);await reload();setSheet(null);setNotice(tr('Transaction logged.'));notify?.(tr('Transaction logged.'));}catch(err){setError(err.message||tr('Could not log transaction.'));}finally{setBusy(false);}};
  const cancel=async item=>{setBusy(true);setError('');try{await cancelScheduledTransaction(item.id);await reload();setNotice(tr('Schedule cancelled.'));}catch(err){setError(err.message||tr('Could not cancel schedule.'));}finally{setBusy(false);}};
  const cash=(amount,currency)=>shown(show,money(amount,currency));
  const openDue=item=>setSheet({kind:'due',item});
  return <>
    <RootHeader title={tr('Scheduled')} onSearch={c.openSearch} onBell={()=>go('Notifications')} onSettings={()=>go('Settings')} unread={c.unread} action={{icon:'plus',label:tr('Schedule transaction'),onClick:()=>{setForm(blank(base));setError('');setSheet({kind:'create'});}}}/>
    <section className="card total-card"><small>{tr('Due to log')}</small><div className="balance-amount">{due.length}</div><p className="form-note">{tr('MOVO reminds you when a scheduled payment or transfer is due. Nothing moves until you confirm and log it.')}</p></section>
    <SectionTitle action={tr('Schedule')} onAction={()=>{setForm(blank(base));setError('');setSheet({kind:'create'});}}>{tr('Upcoming & due')}</SectionTitle>
    <div className="card list-card">
      {items.length?items.map(item=><article className="fp-row" key={item.id}>
        <span className={`stat-icon tone-${item.transaction_type==='transfer'?'blue':'orange'}`}><Icon name={item.transaction_type==='transfer'?'transfer':'calendar'} size={17}/></span>
        <span className="fp-main"><strong>{item.title}</strong><small>{dateLabel(item.scheduled_for)} · {tr(item.frequency==='once'?'One time':item.frequency==='weekly'?'Weekly':item.frequency==='monthly'?'Monthly':'Yearly')}</small><small>{accounts.find(a=>a.id===item.account_id)?.name||tr('Account not available')}{item.transaction_type==='transfer'? ` → ${accounts.find(a=>a.id===item.transfer_to_account_id)?.name||tr('Choose destination')}`:''}</small></span>
        <span className="fp-amount"><b>{cash(item.amount,item.currency)}</b>{item.scheduled_for<=day()?<button type="button" className="link-button" onClick={()=>openDue(item)}>{tr('Log now')}</button>:<small>{tr('Scheduled')}</small>}<button type="button" className="link-button" disabled={busy} onClick={()=>cancel(item)}>{tr('Cancel schedule')}</button></span>
      </article>):<p className="form-note">{tr('No scheduled payments or transfers yet.')}</p>}
    </div>
    {sheet?.kind==='create'&&<Sheet title={tr('Schedule payment or transfer')} subtitle={tr('Choose the account now. MOVO will ask you to confirm when it is due.')} onClose={()=>setSheet(null)} label={tr('Schedule transaction')}>
      <form className="sheet-form" onSubmit={save}>
        {error&&<p className="app-alert" role="alert">{error}</p>}
        <label>{tr('Type')}<select value={form.transaction_type} onChange={e=>setForm({...form,transaction_type:e.target.value,transfer_to_account_id:''})}><option value="expense">{tr('Payment')}</option><option value="transfer">{tr('Transfer')}</option></select></label>
        <label>{tr('Description')}<input required maxLength="160" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label>{tr('Amount')}<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
        <label>{tr('Pay from')}<select required value={form.account_id} onChange={e=>{const selected=accounts.find(a=>a.id===e.target.value);setForm({...form,account_id:e.target.value,currency:selected?.currency||form.currency,transfer_to_account_id:''});}}><option value="">{tr('Choose account')}</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name} · {a.currency}</option>)}</select></label>
        {form.transaction_type==='transfer'&&<label>{tr('Transfer to')}<select required value={form.transfer_to_account_id} onChange={e=>setForm({...form,transfer_to_account_id:e.target.value})}><option value="">{tr('Choose destination')}</option>{accounts.filter(a=>a.id!==form.account_id&&a.currency===form.currency).map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name}</option>)}</select></label>}
        <label>{tr('Date')}<input required type="date" min={day()} value={form.scheduled_for} onChange={e=>setForm({...form,scheduled_for:e.target.value})}/></label>
        <label>{tr('Repeat')}<select value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})}><option value="once">{tr('One time')}</option><option value="weekly">{tr('Weekly')}</option><option value="monthly">{tr('Monthly')}</option><option value="yearly">{tr('Yearly')}</option></select></label>
        <label>{tr('Category')}<input maxLength="60" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label>
        <button className="primary-button" disabled={busy}>{tr('Save schedule')}</button>
      </form>
    </Sheet>}
    {sheet?.kind==='due'&&<DueSheet item={sheet.item} accounts={accounts} busy={busy} error={error} onClose={()=>setSheet(null)} onLog={log}/>}
    {notice&&<p className="form-note" role="status">{notice}</p>}
  </>;
}
function DueSheet({item,accounts,busy,error,onClose,onLog}) {
  const [account,setAccount]=useState(item.account_id||'');
  const [destination,setDestination]=useState(item.transfer_to_account_id||'');
  const [amount,setAmount]=useState(String(item.amount));
  const [merchant,setMerchant]=useState(item.title);
  const available=accounts.filter(a=>a.currency===item.currency);
  return <Sheet title={tr('This transaction is due')} subtitle={item.title} onClose={onClose} label={tr('Log due transaction')}>
    <form className="sheet-form" onSubmit={e=>{e.preventDefault();onLog({...item,amount:Number(amount),title:merchant},account,destination);}}>
      {error&&<p className="app-alert" role="alert">{error}</p>}
      <p className="form-note">{tr('Review the details, then confirm to add this to Transactions. MOVO will not move money.')}</p>
      <label>{tr('Description')}<input required maxLength="160" value={merchant} onChange={e=>setMerchant(e.target.value)}/></label>
      <label>{tr('Amount')}<input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
      <label>{tr('Account to use')}<select required value={account} onChange={e=>setAccount(e.target.value)}><option value="">{tr('Choose account')}</option>{available.map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name}</option>)}</select></label>
      {item.transaction_type==='transfer'&&<label>{tr('Destination account')}<select required value={destination} onChange={e=>setDestination(e.target.value)}><option value="">{tr('Choose destination')}</option>{available.filter(a=>a.id!==account).map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name}</option>)}</select></label>}
      <button className="primary-button" disabled={busy||!account||(item.transaction_type==='transfer'&&!destination)}>{tr('Confirm & log transaction')}</button>
      <button type="button" className="link-button" onClick={onClose}>{tr('Remind me later')}</button>
    </form>
  </Sheet>;
}
