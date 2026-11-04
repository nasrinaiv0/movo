import React, { useEffect, useState } from 'react';
import { Sheet } from './ui';
import { t as tr } from '../lib/i18n';
import { listScheduledTransactions, logScheduledTransaction } from '../lib/scheduledTransactions';
import { listBills, listOccurrences, recordBillPayment } from '../lib/billsRepository';
import { amountRemaining, occurrenceState, paymentKey } from '../lib/bills';
import { summarize as summarizeSubscriptions } from '../lib/subscriptions';

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
  const accounts=accountsView.filter(a=>!a.is_archived&&['bank','e_wallet','cash'].includes(a.account_type));
  const loadDue = async () => {
    if(!session?.user?.id)return [];
    const date=today();
    const [scheduled,bills,occurrences]=await Promise.all([
      listScheduledTransactions(),
      listBills(),
      listOccurrences(shift(date,1),shift(date,-62)),
    ]);
    const billMap=new Map(bills.map(b=>[b.id,b]));
    const dueSchedules=scheduled.filter(row=>row.scheduled_for<=date).map(row=>({kind:'scheduled',item:row,date:row.scheduled_for}));
    const dueBills=occurrences.filter(o=>o.due_date<=date&&amountRemaining(o)>0&&occurrenceState(o,date)!=='cancelled')
      .map(o=>({kind:'bill',item:o,bill:billMap.get(o.bill_id),date:o.due_date}));
    const summary=summarizeSubscriptions(subscriptions,new Date(`${date}T12:00:00`),value=>value);
    const dueSubs=(summary.upcoming||[]).filter(s=>s.status==='active'&&s.next<=date)
      .map(s=>({kind:'subscription',item:s,date:s.next}));
    return [...dueSchedules,...dueBills,...dueSubs].sort((a,b)=>a.date.localeCompare(b.date));
  };
  const setActive = next => {
    setEntry(next||null);
    const item=next?.item;
    const billAccount=next?.kind==='bill'?next.bill?.account_id:'';
    const preferred=next?.kind==='scheduled'?item?.account_id:billAccount;
    setAccount(preferred||'');
    setDestination(item?.transfer_to_account_id||'');
    setAmount(String(next?.kind==='bill'?amountRemaining(item):item?.amount||''));
    setError('');
  };
  useEffect(() => {
    let live=true;
    if(!session?.user?.id){setActive(null);return()=>{live=false;};}
    loadDue().then(queue=>{if(live&&queue.length)setActive(queue[0]);})
      .catch(err=>{if(live)setError(err.message||tr('Could not load due reminders.'));});
    return()=>{live=false;};
  },[session?.user?.id,subscriptions]);
  const close=()=>setActive(null);
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
        <label>{tr('Account to use')}<select required value={account} onChange={e=>setAccount(e.target.value)}><option value="">{tr('Choose account')}</option>{choices.map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name}</option>)}</select></label>
        {entry.kind==='scheduled'&&item.transaction_type==='transfer'&&<label>{tr('Destination account')}<select required value={destination} onChange={e=>setDestination(e.target.value)}><option value="">{tr('Choose destination')}</option>{choices.filter(a=>a.id!==account).map(a=><option key={a.id} value={a.id}>{a.institution_name||a.name}</option>)}</select></label>}
        {entry.kind==='bill'&&<label>{tr('Amount paid')}<input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>}
        <button className="primary-button" disabled={busy||!account||(entry.kind==='scheduled'&&item.transaction_type==='transfer'&&!destination)}>{tr('Confirm & log transaction')}</button>
      </>}
      <button type="button" className="link-button" onClick={close}>{tr('Remind me later')}</button>
    </form>
  </Sheet>;
}
