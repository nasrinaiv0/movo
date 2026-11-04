import React, { useCallback, useEffect, useState } from 'react';
import { Sheet } from './ui';
import { t as tr } from '../lib/i18n';
import { listScheduledTransactions, logScheduledTransaction } from '../lib/scheduledTransactions';
import { listBills, listOccurrences, recordBillPayment } from '../lib/billsRepository';
import { amountRemaining, occurrenceState, paymentKey } from '../lib/bills';
import { snoozeSchedule, getReminderPreferences, listReminderEvents, recordReminderEvent, snoozeObligation } from '../lib/paymentReminderCenter';
import { syncPaymentNotifications } from '../lib/paymentNotifications';
import { recordPaymentAttempt } from '../lib/paymentAttempts';

const today = () => new Date().toLocaleDateString('en-CA');
const shift = (date, days) => { const value=new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate()+days); return value.toISOString().slice(0,10); };
const nonce = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function ScheduledDuePrompt({ session, accountsView = [], subscriptions = [], onSubscriptionLog, onLogged }) {
  const [entry,setEntry]=useState(null);
  const [account,setAccount]=useState('');
  const [destination,setDestination]=useState('');
  const [amount,setAmount]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [attemptNote,setAttemptNote]=useState('');
  const accounts=accountsView.filter(a=>!a.is_archived&&['bank','e_wallet','cash'].includes(a.account_type));
  const loadDue = useCallback(async () => {
    const date=today();
    const userId=session?.user?.id;
    let schedules=[], billsDue=[];
    let preferences={enabled:true,reminder_days:[0,1,3],timezone:'Asia/Manila'};
    let events=[];
    if(userId){
      const [scheduled,bills,occurrences,prefs,history]=await Promise.all([
        listScheduledTransactions(), listBills(), listOccurrences(shift(date,31),shift(date,-62)),
        getReminderPreferences(userId), listReminderEvents(userId,100),
      ]);
      preferences=prefs||preferences; events=history||[];
      const billMap=new Map(bills.map(b=>[b.id,b]));
      await syncPaymentNotifications({schedules:scheduled,bills:occurrences.filter(o=>amountRemaining(o)>0&&occurrenceState(o,date)!=='cancelled').map(o=>({...o,title:billMap.get(o.bill_id)?.name||tr('Bill')})),subscriptions,preferences}).catch(()=>null);
      schedules=scheduled.filter(row=>row.status==='scheduled'&&(!row.snoozed_until||row.snoozed_until<=new Date().toISOString()))
        .map(row=>({kind:'scheduled',item:row,date:row.scheduled_for}));
      billsDue=occurrences.filter(o=>amountRemaining(o)>0&&occurrenceState(o,date)!=='cancelled')
        .map(o=>({kind:'bill',item:o,bill:billMap.get(o.bill_id),date:o.due_date}));
    }
    const subscriptionsDue=subscriptions.filter(s=>s.status==='active'&&/^\d{4}-\d{2}-\d{2}$/.test(s.start||''))
      .map(s=>({kind:'subscription',item:s,date:s.start}));
    const candidates=[...schedules,...billsDue,...subscriptionsDue];
    if(preferences.enabled===false)return [];
    const daysUntil=value=>Math.floor((new Date(`${value}T12:00:00Z`).getTime()-new Date(`${date}T12:00:00Z`).getTime())/86400000);
    const eligible=candidates.filter(entry=>{
      const offset=daysUntil(entry.date);
      const itemDays=entry.item.reminder_days;
      const allowed=Array.isArray(itemDays)?itemDays:(preferences.reminder_days||[0,1,3]);
      if(offset>0&&!allowed.includes(offset))return false;
      if(offset<0&&offset < -30)return false;
      const type=entry.kind;
      const sourceId=String(entry.kind==='bill'?entry.item.id:entry.item.id);
      const previous=events.find(e=>e.source_type===type&&e.source_id===sourceId&&e.occurrence_date===entry.date&&Number(e.reminder_offset)===Math.max(0,offset));
      return !previous || (previous.snoozed_until&&previous.snoozed_until<=new Date().toISOString());
    }).sort((a,b)=>a.date.localeCompare(b.date));
    if(userId&&eligible.length){
      await Promise.all(eligible.map(entry=>recordReminderEvent(userId,{
        source_type:entry.kind,source_id:String(entry.item.id),occurrence_date:entry.date,
        reminder_offset:Math.max(0,daysUntil(entry.date)),status:'sent',
      }).catch(()=>null)));
    }
    return eligible;
  },[session?.user?.id,subscriptions]);
  const setActive = useCallback(next => {
    setEntry(next||null);
    const item=next?.item;
    const billAccount=next?.kind==='bill'?next.bill?.account_id:'';
    const preferred=next?.kind==='scheduled'?item?.account_id:billAccount;
    setAccount(preferred||'');
    setDestination(item?.transfer_to_account_id||'');
    setAmount(String(next?.kind==='bill'?amountRemaining(item):item?.amount||''));
    setError('');
    setAttemptNote('');
  },[]);
  useEffect(() => {
    let live=true;
    const refresh=()=>loadDue().then(queue=>{if(live)setActive(queue[0]||null);})
      .catch(err=>{if(live)setError(err.message||tr('Could not load due reminders.'));});
    const onVisible=()=>{if(document.visibilityState==='visible')refresh();};
    refresh();
    window.addEventListener('movo:payment-reminders-updated',refresh);
    document.addEventListener('visibilitychange',onVisible);
    return()=>{live=false;window.removeEventListener('movo:payment-reminders-updated',refresh);document.removeEventListener('visibilitychange',onVisible);};
  },[loadDue,setActive]);
  const close=async()=>{ if(session?.user?.id&&entry){const until=new Date(Date.now()+86400000).toISOString();const offset=Math.max(0,Math.floor((new Date(`${entry.date}T12:00:00Z`).getTime()-new Date(`${today()}T12:00:00Z`).getTime())/86400000));try{if(entry.kind==='scheduled')await snoozeSchedule(entry.item.id,session.user.id,until);else await snoozeObligation(session.user.id,{source_type:entry.kind,source_id:String(entry.item.id),occurrence_date:entry.date,reminder_offset:offset},until);}catch{/* Keep the prompt dismissible while offline. */}} setActive(null); };
  const markIssue=async()=>{
    if(!entry||!session?.user?.id)return;
    setBusy(true);setError('');
    try{
      await recordPaymentAttempt(session.user.id,{
        source_type:entry.kind,source_id:String(item.id),due_date:entry.date,status:'failed',
        amount:Number(amount||item.amount||0)||null,currency:billCurrency,account_id:account||null,note:attemptNote,
      });
      const until=new Date(Date.now()+86400000).toISOString();
      if(entry.kind==='scheduled')await snoozeSchedule(item.id,session.user.id,until);
      else {const offset=Math.max(0,Math.floor((new Date(`${entry.date}T12:00:00Z`).getTime()-new Date(`${today()}T12:00:00Z`).getTime())/86400000));await snoozeObligation(session.user.id,{source_type:entry.kind,source_id:String(item.id),occurrence_date:entry.date,reminder_offset:offset},until);}
      const queue=await loadDue();setActive(queue[0]||null);
    }catch(err){setError(err.message||tr('Could not save the payment issue.'));}
    finally{setBusy(false);}
  };
  const log=async event=>{
    event.preventDefault();if(!entry)return;
    if(entry.kind==='subscription'){onSubscriptionLog?.(entry.item);setActive(null);return;}
    setBusy(true);setError('');
    try{
      if(entry.kind==='scheduled') await logScheduledTransaction(entry.item,account,destination);
      else await recordBillPayment({
        occurrence_id:entry.item.id,amount,method:'recorded',account_id:account,
        paid_at:`${today()}T12:00:00Z`,key:paymentKey(entry.item.id,nonce()),
      });
      await onLogged?.();
      const queue=await loadDue();
      setActive(queue[0]||null);
    }catch(err){setError(err.message||tr('Could not log this transaction.'));}
    finally{setBusy(false);}
  };
  if(!entry)return null;
  const item=entry.item;
  const billCurrency=item.currency||entry.bill?.currency||'PHP';
  const choices=accounts.filter(a=>a.currency===billCurrency);
  const suggested=choices.filter(a=>Number(a.balance||0)>=Number(amount||item.amount||0)).sort((a,b)=>Number(b.balance||0)-Number(a.balance||0))[0];
  const title=entry.kind==='scheduled'?'Scheduled transaction due':entry.kind==='bill'?'Bill payment due':'Subscription renewal due';
  const description=entry.kind==='bill'?(entry.bill?.name||tr('Bill')):item.title||item.name;
  return <Sheet title={tr(title)} subtitle={description} onClose={close} label={tr('Log due transaction')}>
    <form className="sheet-form" onSubmit={log}>
      {error&&<p className="app-alert" role="alert">{error}</p>}
      {entry.kind==='subscription'?<>
        <p className="form-note">{tr('Your subscription renewal is due. Review it, then choose Log payment to select an account and record it.')}</p>
        <strong>{item.currency} {Number(item.amount).toLocaleString()}</strong>
        <button className="primary-button">{tr('Log payment')}</button>
      </>:<>
        <p className="form-note">{tr('Review and confirm to add this transaction to your records. MOVO will not move money.')}</p>
        <strong>{billCurrency} {Number(amount).toLocaleString()}</strong>
        {!account&&suggested&&<p className="form-note">{tr('Suggested account')}: {suggested.institution_name||suggested.name}</p>}
        {!account&&!suggested&&<p className="form-note">{tr('Check your account balance before confirming this transaction.')}</p>}
        <label>{tr('Account to use')}<select required value={account} onChange={e=>setAccount(e.target.value)}><option value="">{tr('Choose account')}</option>{choices.map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name}</option>)}</select></label>
        {entry.kind==='scheduled'&&item.transaction_type==='transfer'&&<label>{tr('Destination account')}<select required value={destination} onChange={e=>setDestination(e.target.value)}><option value="">{tr('Choose destination')}</option>{choices.filter(a=>a.id!==account).map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name}</option>)}</select></label>}
        {entry.kind==='bill'&&<label>{tr('Amount paid')}<input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>}
        <button className="primary-button" disabled={busy||!account||(entry.kind==='scheduled'&&item.transaction_type==='transfer'&&!destination)}>{tr('Confirm & log transaction')}</button>
      </>}
      <label>{tr('Payment issue note')}<textarea rows="2" maxLength="500" value={attemptNote} onChange={e=>setAttemptNote(e.target.value)} placeholder={tr('Optional: declined, insufficient balance, service unavailable…')}/></label>
      <button type="button" className="secondary-button" disabled={busy||!session?.user?.id} onClick={markIssue}>{tr('Record payment issue & retry tomorrow')}</button>
      <button type="button" className="link-button" onClick={close}>{tr('Remind me later')}</button>
    </form>
  </Sheet>;
}
