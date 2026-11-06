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
