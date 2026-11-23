import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import TransactionSheet from './TransactionSheet';
import { NEEDS_REVIEW } from '../lib/categories';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('expense description re-categorizes on every edit, handles ambiguity and keeps manual choice until text changes', async () => {
  const container=document.createElement('div');document.body.append(container);
  const root=createRoot(container);
  let current;
  const defaultForm={ amount:'15',merchant:'',transaction_type:'expense',category:NEEDS_REVIEW,occurred_at:'2026-11-06',time:'',account_id:'' };
  function Harness(){
    const [form,setForm]=useState(defaultForm);
    current=form;
    return <TransactionSheet form={form} setForm={setForm} accounts={[]} autoCategory
      cloudMode={false} onClose={jest.fn()} onSave={jest.fn()} currency="PHP"/>;
  }
  const edit=async value=>act(async()=>{
    const input=container.querySelector('input[aria-label="Description"]');
    const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    setter.call(input,value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  try {
    await act(async()=>root.render(<Harness/>));
    await edit('Meralco electricity bill');
    expect(current.category).toBe('bills:electricity');
    await edit('Grab ride to Makati');
    expect(current.category).toBe('transport:ride_hailing');
    await edit('Unrecognized things');
    expect(current.category).toBe(NEEDS_REVIEW);
    await edit('Netflix');
    expect(current.category).toBe('entertainment:streaming_entertainment');
    await act(async()=>container.querySelector('.tx-chips button[aria-pressed="false"]').click());
    const manual=current.category;
    expect(manual).not.toBe('entertainment:streaming_entertainment');
    await edit('Meralco electricity bill');
    expect(current.category).toBe('bills:electricity');
    await edit('Netflix and Petron fuel');
    expect(current.category).toBe(NEEDS_REVIEW);
  } finally {
    act(()=>root.unmount());container.remove();
  }
});

test('saving the visible keypad amount does not depend on the parent draft catching up first', async () => {
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container); const save = jest.fn();
  const form = { amount: '7.6', merchant: 'Audit purchase', transaction_type: 'expense', category: NEEDS_REVIEW,
    account_id: 'cash', occurred_at: '2026-11-20', time: '' };
  try {
    await act(async () => root.render(<TransactionSheet form={form} setForm={() => {}} accounts={[]}
      cloudMode={false} onClose={() => {}} onSave={save} currency="PHP" />));
    await act(async () => container.querySelector('.tx-pad button[aria-label="6"]').click());
    expect(container.querySelector('[aria-label="Amount"]').textContent).toBe('7.66');
    await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][1]).toMatchObject({ amount: '7.66', merchant: 'Audit purchase', account_id: 'cash' });
  } finally { act(() => root.unmount()); container.remove(); }
});


test('accepted friend-import review locks shared amount, type and date until the recipient taps Save', async () => {
  const container=document.createElement('div');document.body.append(container);
  const root=createRoot(container), save=jest.fn();
  const form={amount:'99.50',merchant:'Shared Lunch',transaction_type:'expense',category:'other',
    account_id:'own-php',transfer_to_account_id:'',occurred_at:'2026-11-23',time:''};
  const accounts=[{id:'own-php',name:'Own account',account_type:'bank',currency:'PHP'}];
  try {
    await act(async()=>root.render(<TransactionSheet form={form} setForm={()=>{}} accounts={accounts}
      importLocked cloudMode={false} onClose={()=>{}} onSave={save} currency="PHP"/>));
    expect(container.textContent).toContain('Shared amount, date and type are locked.');
    expect(container.querySelector('.tx-pad')).toBeNull();
    expect(container.querySelector('.tx-pad-show')).toBeNull();
    expect(container.querySelector('input[type="date"]').disabled).toBe(true);
    expect(container.querySelector('.tx-seg button[aria-pressed="true"]').disabled).toBe(false);
    expect([...container.querySelectorAll('.tx-seg button[aria-pressed="false"]')].every(b=>b.disabled)).toBe(true);
    await act(async()=>container.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][1]).toMatchObject({amount:'99.5',merchant:'Shared Lunch',transaction_type:'expense',
      account_id:'own-php',occurred_at:'2026-11-23'});
  } finally {act(()=>root.unmount());container.remove();}
});
