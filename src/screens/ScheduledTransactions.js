import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { RootHeader, SectionTitle, Sheet } from '../components/ui';
import { money, shown } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { cancelScheduledTransaction, createScheduledTransaction, listScheduledTransactions, logScheduledTransaction } from '../lib/scheduledTransactions';
import { setScheduleState, skipScheduleOccurrence, snoozeSchedule, updateSchedule } from '../lib/paymentReminderCenter';

const day = () => new Date().toLocaleDateString('en-CA');
const blank = currency => ({ title:'', transaction_type:'expense', amount:'', currency, account_id:'', transfer_to_account_id:'', scheduled_for:day(), frequency:'once', category:'Other', notes:'', reminder_days:[0,1,3], timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Manila', ends_on:'' });
const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
export default function ScheduledTransactions({ c }) {
  const { accountsView=[], session, show, base='PHP', go, notify } = c;
  const accounts=accountsView.filter(a=>!a.is_archived && ['bank','e_wallet','cash'].includes(a.account_type));
  const [items,setItems]=useState([]); const [sheet,setSheet]=useState(null); const [form,setForm]=useState(()=>blank(base));
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [notice,setNotice]=useState('');
  const [month,setMonth]=useState(()=>new Date()); const [calendar,setCalendar]=useState(false);
  const reload=useCallback(async()=>setItems(await listScheduledTransactions()),[]);
  useEffect(()=>{reload().catch(e=>setError(e.message||tr('Could not load schedules.')));},[reload]);
  const due=useMemo(()=>items.filter(x=>x.status==='scheduled'&&x.scheduled_for<=day()),[items]);
  const cash=(amount,currency)=>shown(show,money(amount,currency));
  const startCreate=()=>{setForm(blank(base));setError('');setSheet({kind:'create'});};
  const run=async fn=>{setBusy(true);setError('');try{await fn();await reload();setNotice(tr('Changes saved.'));}catch(e){setError(e.message||tr('Could not save changes.'));}finally{setBusy(false);}};
  const save=async e=>{e.preventDefault();await run(async()=>{if(sheet?.kind==='edit')await updateSchedule(sheet.item.id,session?.user?.id,form);else await createScheduledTransaction(form,session?.user?.id);setSheet(null);});};
  const log=async(item,accountId,transferTo,amount=item.amount,title=item.title)=>run(async()=>{await logScheduledTransaction({...item,amount,title},accountId,transferTo);setSheet(null);notify?.(tr('Transaction logged.'));});
  const action=async(item,kind)=>run(async()=>{if(kind==='pause'||kind==='resume'||kind==='cancel')await setScheduleState(item.id,session?.user?.id,kind);if(kind==='skip')await skipScheduleOccurrence(item,session?.user?.id);if(kind==='snooze')await snoozeSchedule(item.id,session?.user?.id,new Date(Date.now()+24*60*60*1000).toISOString());setSheet(null);});
  const edit=item=>{setForm({...item,amount:String(item.amount),reminder_days:item.reminder_days||[0,1,3],ends_on:item.ends_on||''});setError('');setSheet({kind:'edit',item});};
  const monthStart=new Date(month.getFullYear(),month.getMonth(),1); const offset=(monthStart.getDay()+6)%7;
  const days=Array.from({length:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()},(_,i)=>i+1);
  const monthKey=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-`;
  return <>
    <RootHeader title={tr('Scheduled')} onSearch={c.openSearch} onBell={()=>go('Notifications')} onSettings={()=>go('Settings')} unread={c.unread} action={{icon:'plus',label:tr('Schedule transaction'),onClick:startCreate}}/>
    <section className="card total-card"><small>{tr('Due to log')}</small><div className="balance-amount">{due.length}</div><p className="form-note">{tr('Review and confirm each due item. MOVO never initiates a payment or transfer.')}</p></section>
    <div className="chip-row"><button className={calendar?'chip selected':'chip'} onClick={()=>setCalendar(true)}>{tr('Calendar')}</button><button className={!calendar?'chip selected':'chip'} onClick={()=>setCalendar(false)}>{tr('List')}</button></div>
    {calendar&&<section className="card pad">
      <div className="detail-row"><button className="round-button flat" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} aria-label={tr('Previous month')}><Icon name="chevron-left"/></button><strong>{month.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</strong><button className="round-button flat" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} aria-label={tr('Next month')}><Icon name="chevron-right"/></button></div>
      <div className="schedule-calendar">{['M','T','W','T','F','S','S'].map((x,i)=><small key={i}>{x}</small>)}{Array.from({length:offset},(_,i)=><span key={'e'+i}/>)}{days.map(d=>{const date=monthKey+String(d).padStart(2,'0');const matches=items.filter(x=>x.scheduled_for===date);return <button type="button" key={date} className={matches.length?'has-schedule':''} onClick={()=>matches[0]&&setSheet({kind:'actions',item:matches[0]})}>{d}{matches.length>0&&<i/>}</button>;})}</div>
      <p className="form-note">{tr('Select a marked date to view its scheduled transaction.')}</p>
    </section>}
    {!calendar&&<><SectionTitle action={tr('Schedule')} onAction={startCreate}>{tr('Upcoming & due')}</SectionTitle>
    <div className="card list-card">{items.length?items.map(item=><article className="fp-row" key={item.id}>
      <span className={`stat-icon tone-${item.transaction_type==='transfer'?'blue':'orange'}`}><Icon name={item.transaction_type==='transfer'?'transfer':'calendar'} size={17}/></span>
      <span className="fp-main"><strong>{item.title}</strong><small>{dateLabel(item.scheduled_for)} · {tr(item.frequency==='once'?'One time':item.frequency==='weekly'?'Weekly':item.frequency==='monthly'?'Monthly':'Yearly')}</small><small>{item.status==='paused'?tr('Paused'):accounts.find(a=>a.id===item.account_id)?.name||tr('Account not available')}</small></span>
      <span className="fp-amount"><b>{cash(item.amount,item.currency)}</b><button type="button" className="link-button" onClick={()=>setSheet({kind:'actions',item})}>{tr('Manage')}</button></span>
    </article>):<p className="form-note">{tr('No scheduled payments or transfers yet.')}</p>}</div></>}
    {(sheet?.kind==='create'||sheet?.kind==='edit')&&<Sheet title={tr(sheet.kind==='edit'?'Edit schedule':'Schedule payment or transfer')} subtitle={tr('Choose the account now. MOVO will ask you to confirm when it is due.')} onClose={()=>setSheet(null)} label={tr('Schedule transaction')}>
      <form className="sheet-form" onSubmit={save}>
        {error&&<p className="app-alert" role="alert">{error}</p>}
        <label>{tr('Type')}<select value={form.transaction_type} onChange={e=>setForm({...form,transaction_type:e.target.value,transfer_to_account_id:''})}><option value="expense">{tr('Payment')}</option><option value="transfer">{tr('Transfer')}</option></select></label>
        <label>{tr('Description')}<input required maxLength="160" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label>{tr('Amount')}<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
        <label>{tr('Pay from')}<select required value={form.account_id} onChange={e=>{const a=accounts.find(x=>x.id===e.target.value);setForm({...form,account_id:e.target.value,currency:a?.currency||form.currency,transfer_to_account_id:''});}}><option value="">{tr('Choose account')}</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name} · {a.currency}</option>)}</select></label>
        {form.transaction_type==='transfer'&&<label>{tr('Transfer to')}<select required value={form.transfer_to_account_id} onChange={e=>setForm({...form,transfer_to_account_id:e.target.value})}><option value="">{tr('Choose destination')}</option>{accounts.filter(a=>a.id!==form.account_id&&a.currency===form.currency).map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name}</option>)}</select></label>}
        <label>{tr('Date')}<input required type="date" min={sheet.kind==='edit'?undefined:day()} value={form.scheduled_for} onChange={e=>setForm({...form,scheduled_for:e.target.value})}/></label>
        <label>{tr('Repeat')}<select value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})}><option value="once">{tr('One time')}</option><option value="weekly">{tr('Weekly')}</option><option value="monthly">{tr('Monthly')}</option><option value="yearly">{tr('Yearly')}</option></select></label>
        {form.frequency!=='once'&&<label>{tr('End date (optional)')}<input type="date" min={form.scheduled_for} value={form.ends_on||''} onChange={e=>setForm({...form,ends_on:e.target.value})}/></label>}
        <label>{tr('Category')}<input maxLength="60" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label>
        <label>{tr('Reminder intervals')}<select multiple value={(form.reminder_days||[]).map(String)} onChange={e=>setForm({...form,reminder_days:Array.from(e.target.selectedOptions).map(o=>Number(o.value))})}><option value="0">{tr('On due date')}</option><option value="1">{tr('1 day before')}</option><option value="2">{tr('2 days before')}</option><option value="3">{tr('3 days before')}</option><option value="7">{tr('7 days before')}</option><option value="14">{tr('14 days before')}</option></select></label>
        <button className="primary-button" disabled={busy}>{tr(sheet.kind==='edit'?'Save changes':'Save schedule')}</button>
      </form>
    </Sheet>}
    {sheet?.kind==='due'&&<DueSheet item={sheet.item} accounts={accounts} busy={busy} error={error} onClose={()=>setSheet(null)} onLog={log}/>}
    {sheet?.kind==='actions'&&<Sheet title={sheet.item.title} subtitle={dateLabel(sheet.item.scheduled_for)} onClose={()=>setSheet(null)} label={tr('Manage schedule')}><div className="sheet-menu">
      {sheet.item.status==='scheduled'&&sheet.item.scheduled_for<=day()&&<button onClick={()=>setSheet({kind:'due',item:sheet.item})}><Icon name="check-circle"/>{tr('Log now')}</button>}
      <button onClick={()=>edit(sheet.item)}><Icon name="edit"/>{tr('Edit schedule')}</button>
      <button onClick={()=>action(sheet.item,sheet.item.status==='paused'?'resume':'pause')}><Icon name="pause"/>{tr(sheet.item.status==='paused'?'Resume schedule':'Pause schedule')}</button>
      {sheet.item.status==='scheduled'&&<button onClick={()=>action(sheet.item,'skip')}><Icon name="skip-forward"/>{tr('Skip this occurrence')}</button>}
      <button onClick={()=>action(sheet.item,'snooze')}><Icon name="clock"/>{tr('Remind me tomorrow')}</button>
      <button onClick={()=>action(sheet.item,'cancel')}><Icon name="x"/>{tr('Cancel schedule')}</button>
    </div>{error&&<p className="app-alert">{error}</p>}</Sheet>}
    {notice&&<p className="form-note" role="status">{notice}</p>}
  </>;
}
function DueSheet({item,accounts,busy,error,onClose,onLog}) {
  const [account,setAccount]=useState(item.account_id||''); const [destination,setDestination]=useState(item.transfer_to_account_id||'');
  const [amount,setAmount]=useState(String(item.amount)); const [merchant,setMerchant]=useState(item.title);
  const available=accounts.filter(a=>a.currency===item.currency);
  return <Sheet title={tr('This transaction is due')} subtitle={item.title} onClose={onClose} label={tr('Log due transaction')}>
    <form className="sheet-form" onSubmit={e=>{e.preventDefault();onLog(item,account,destination,Number(amount),merchant);}}>
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
