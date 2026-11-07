import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RewardsPresetDirectory from './RewardsPresetDirectory';

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('./Icon', () => ({ __esModule: true, default: () => null }));

const setup=async()=>{
  const node=document.createElement('div');document.body.appendChild(node);
  const root=createRoot(node);const onApply=jest.fn().mockReturnValue('Reference added');
  await act(async()=>root.render(<RewardsPresetDirectory paymentAccounts={[{id:'bank',name:'Test Bank',account_type:'card',currency:'PHP'}]} onApply={onApply}/>));
  return {node,onApply, cleanup:async()=>{await act(async()=>root.unmount());node.remove();}};
};
const click=async(el)=>{await act(async()=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));};

test('all eight categories are compact and collapsed by default',async()=>{
  const ui=await setup();
  const groups=ui.node.querySelectorAll('.rewards-group-toggle');
  expect(groups).toHaveLength(8);
  expect([...groups].every(x=>x.getAttribute('aria-expanded')==='false')).toBe(true);
  expect(ui.node.textContent).toContain('reference programs');
  expect(ui.node.querySelectorAll('.rewards-preset-row')).toHaveLength(0);
  await ui.cleanup();
});
test('expand/collapse category and apply a non-cash loyalty card preset',async()=>{
  const ui=await setup();
  await click([...ui.node.querySelectorAll('.rewards-group-toggle')].find(x=>x.textContent.includes('Retail')));
  expect(ui.node.querySelector('[data-preset="smac"]')).not.toBeNull();
  const add=[...ui.node.querySelector('[data-preset="smac"]').querySelectorAll('button')].find(b=>b.textContent.includes('Add to Wallet'));
  await click(add);
  expect(ui.onApply).toHaveBeenCalledWith(expect.objectContaining({id:'smac',kind:'points'}),'');
  await ui.cleanup();
});
test('cashback filter narrows categories and requires a selected account before applying',async()=>{
  const ui=await setup();
  await click([...ui.node.querySelectorAll('.rewards-filter-chip')].find(x=>x.textContent.includes('Cashback')));
  expect([...ui.node.querySelectorAll('.rewards-group-toggle')].some(x=>x.textContent.includes('Credit card cashback'))).toBe(true);
  await click([...ui.node.querySelectorAll('.rewards-group-toggle')].find(x=>x.textContent.includes('Credit card cashback')));
  const row=ui.node.querySelector('[data-preset="eastwest-visa"]');
  await click(row.querySelector('.rewards-preset-actions button'));
  expect(ui.onApply).not.toHaveBeenCalled();
  expect(ui.node.querySelector('[role="status"]').textContent).toContain('Choose the card');
  const select=row.querySelector('select');
  await act(async()=>{select.value='bank';select.dispatchEvent(new Event('change',{bubbles:true}));});
  await click(row.querySelector('.rewards-preset-actions button'));
  expect(ui.onApply).toHaveBeenCalledWith(expect.objectContaining({id:'eastwest-visa'}),'bank');
  await ui.cleanup();
});
