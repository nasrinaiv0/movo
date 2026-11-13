import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ScannerSheet from './ScannerSheet';
import { scanReceiptWithAI } from '../lib/aiReceipt';

jest.mock('../lib/aiReceipt', () => ({scanReceiptWithAI: jest.fn()}));
jest.mock('./ui', () => ({
  Sheet: ({children}) => <div data-testid="scanner">{children}</div>,
}));
jest.mock('./AccountPicker', () => ({accounts, value, onChange}) => (
  <select aria-label="Select payment account" value={value} onChange={e => onChange(e.target.value)}>
    <option value="">Choose account</option>
    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
  </select>
));
jest.mock('./Icon', () => () => <span aria-hidden="true" />);
jest.mock('./ReceiptBreakdown', () => () => <div>Receipt breakdown</div>);
global.IS_REACT_ACT_ENVIRONMENT = true;
const accounts=[
  {id:'cash01',name:'Cash pocket',account_type:'cash',currency:'PHP'},
  {id:'card02',name:'BPI credit',account_type:'card',currency:'PHP'},
  {id:'ewallet03',name:'GCash',account_type:'e_wallet',currency:'PHP'},
];
const response={
  merchant:"McDonald's",date:'2026-11-14',time:'02:41:33',currency:'PHP',
  amount:159,total:159,category:'food:fast_food',type:'expense',warnings:[],
  items:[{name:'Chicken meal',quantity:1,total:159,category:'food:fast_food',options:['Fries','Coke']}],
  tax:17.04,taxableSales:141.96,cashTendered:500,change:341,
};
let host,root;
const click = async label => {
  const button=[...host.querySelectorAll('button')].find(n => n.textContent.trim()===label);
  expect(button).toBeTruthy();
  await act(async()=>button.click());
};
const selectReceipt=async()=>{
  const input=host.querySelector('input[aria-label="Upload a photo or screenshot"]');
  const file=new File(['fake receipt pixels'],'receipt.jpg',{type:'image/jpeg'});
  Object.defineProperty(input,'files',{configurable:true,value:[file]});
  await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
};
beforeEach(()=>{
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 window.localStorage.clear();
 scanReceiptWithAI.mockReset();
 scanReceiptWithAI.mockResolvedValue(response);
});
afterEach(()=>{act(()=>root.unmount());host.remove();});

test('selecting a registered e-wallet and Log saves directly once without a calculator',async()=>{
 const onLog=jest.fn(async()=>true);
 await act(async()=>root.render(<ScannerSheet show={true} accounts={accounts} onLog={onLog} onClose={()=>{}} />));
 await selectReceipt();
 expect(host.textContent).toContain('Analyze with AI');
 expect(onLog).not.toHaveBeenCalled();
 await click('Analyze with AI');
 expect(scanReceiptWithAI).toHaveBeenCalledTimes(1);
 expect(host.textContent).toContain('159.00');
 expect(host.textContent).toContain("McDonald's");
 const logButton=[...host.querySelectorAll('button')].find(b=>b.textContent==='Log transaction');
 expect(logButton.disabled).toBe(true);
 await act(async()=>{
   const s=host.querySelector('select[aria-label="Select payment account"]');
   s.value='ewallet03';s.dispatchEvent(new Event('change',{bubbles:true}));
 });
 expect(logButton.disabled).toBe(false);
 await click('Log transaction');
 expect(onLog).toHaveBeenCalledTimes(1);
 expect(onLog).toHaveBeenCalledWith(expect.objectContaining({account_id:'ewallet03',merchant:"McDonald's",amount:'159',category:'food:fast_food'}));
 expect(onLog.mock.calls[0][0].note).toContain('VAT/tax 17.04');
 expect(onLog.mock.calls[0][0].note).toContain('Change 341.00');
 expect(host.textContent).not.toContain('Transaction calculator');
});

test('Discard after analysis never logs a transaction',async()=>{
 const onLog=jest.fn();
 await act(async()=>root.render(<ScannerSheet show={true} accounts={accounts} onLog={onLog} onClose={()=>{}} />));
 await selectReceipt();
 await click('Analyze with AI');
 await click('Discard');
 expect(onLog).not.toHaveBeenCalled();
 expect(host.textContent).toContain('Take a photo');
});

test('a failed log leaves review open for correction and does not claim success',async()=>{
 const onLog=jest.fn(async()=>false);
 await act(async()=>root.render(<ScannerSheet show={true} accounts={accounts} onLog={onLog} onClose={()=>{}} />));
 await selectReceipt();await click('Analyze with AI');
 await act(async()=>{
   const s=host.querySelector('select[aria-label="Select payment account"]');
   s.value='card02';s.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await click('Log transaction');
 expect(onLog).toHaveBeenCalledTimes(1);
 expect(host.textContent).toContain('Log transaction');
 expect(host.textContent).toContain("McDonald's");
});
