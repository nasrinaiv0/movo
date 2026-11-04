import React, { useMemo, useState } from 'react';
import Icon from './Icon';
import { Sheet } from './ui';
import { money } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { groceryLineTotal, groceryTotal } from '../lib/grocery';
import './GrocerySheet.css';

const makeItem = () => ({ id: window.crypto?.randomUUID?.() || `grocery-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: '', price: '', quantity: '1' });
export default function GrocerySheet({ currency = 'PHP', accounts = [], draft, onSaveDraft, onLogExpense, onClose }) {
  const initial = draft?.items?.length ? draft.items : [makeItem()];
  const [items,setItems] = useState(initial.map(x => ({...x})));
  const [accountId,setAccountId] = useState(draft?.accountId || accounts[0]?.id || '');
  const [listName,setListName] = useState(draft?.name || 'Grocery shopping');
  const [error,setError] = useState('');
  const validItems = items.filter(x => x.name.trim() && Number(x.price) > 0 && Number(x.quantity) > 0);
  const total = useMemo(() => groceryTotal(validItems),[validItems]);
  const update = (id,patch) => setItems(current => current.map(x => x.id === id ? {...x,...patch} : x));
  const saveDraft = () => { onSaveDraft({ name:listName, items, accountId, updatedAt:new Date().toISOString() }); onClose(); };
  const log = () => {
    if (!validItems.length) { setError('Add at least one item with a name, price and quantity.'); return; }
    if (!accountId) { setError('Choose the account used to pay for these groceries.'); return; }
    const note = validItems.map(x => `${x.name.trim()} — ${currency} ${Number(x.price).toFixed(2)} × ${Number(x.quantity)} = ${(Number(x.price)*Number(x.quantity)).toFixed(2)}`).join('\n');
    onLogExpense({ merchant:listName.trim() || 'Grocery shopping', amount:Math.round(total*100)/100, accountId, note });
  };
  return <Sheet label={tr('Grocery list')} onClose={onClose} className="grocery-sheet"><div className="grocery-head"><div><span className="grocery-eyebrow">{tr('QUICK EXPENSE')}</span><h2>{tr('Add grocery items')}</h2><p>{tr('Keep adding items. MOVO calculates the running total.')}</p></div><div className="grocery-total"><small>{tr('Running total')}</small><strong>{money(total,currency)}</strong></div></div>
    <label className="grocery-list-name">{tr('List name')}<input value={listName} onChange={e=>setListName(e.target.value)} maxLength={80}/></label>
    <div className="grocery-column-head"><span>{tr('Item')}</span><span>{tr('Price')}</span><span>{tr('Qty')}</span><span>{tr('Total')}</span><span/></div>
    <div className="grocery-items">{items.map((item,index)=>{const line=groceryLineTotal(item.price,item.quantity);return <div className="grocery-item" key={item.id}><label className="grocery-name"><span>{tr('Item {number}',{number:index+1})}</span><input placeholder={tr('e.g. Rice')} value={item.name} onChange={e=>update(item.id,{name:e.target.value})}/></label><label><span>{tr('Price')}</span><input aria-label={tr('Price for item {number}',{number:index+1})} type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={item.price} onChange={e=>update(item.id,{price:e.target.value})}/></label><label><span>{tr('Qty')}</span><input aria-label={tr('Quantity for item {number}',{number:index+1})} type="number" min="0.01" step="any" inputMode="decimal" value={item.quantity} onChange={e=>update(item.id,{quantity:e.target.value})}/></label><strong className="grocery-line-total">{money(line,currency)}</strong><button type="button" className="grocery-remove" aria-label={tr('Remove {item}',{item:item.name||tr('item')})} onClick={()=>setItems(current=>current.filter(x=>x.id!==item.id))}><Icon name="trash-2" size={16}/></button></div>})}</div>
    <button type="button" className="grocery-add" onClick={()=>setItems(current=>[...current,makeItem()])}><Icon name="plus" size={17}/>{tr('Add another item')}</button>
    <label className="grocery-account">{tr('Paid with')}<select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">{tr('Choose account')}</option>{accounts.filter(a=>!a.is_archived).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    {error&&<p className="grocery-error" role="alert">{tr(error)}</p>}
    <div className="grocery-footer"><div><small>{tr('Total items')}</small><b>{validItems.reduce((s,x)=>s+Number(x.quantity),0)}</b></div><div><small>{tr('Total expense')}</small><b>{money(total,currency)}</b></div></div>
    <div className="grocery-actions"><button type="button" className="secondary-button" onClick={saveDraft}>{tr('Save as draft')}</button><button type="button" className="primary-button" disabled={!validItems.length} onClick={log}>{tr('Done · Log expense')}</button></div>
  </Sheet>;
}
